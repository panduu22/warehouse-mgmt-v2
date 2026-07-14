import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/** Attach lastLoginAt to each user using the Activity collection */
async function enrichWithLoginStatus(users: any[]) {
  if (!users.length) return users;

  const userIds = users.map((u) => new mongoose.Types.ObjectId(u._id.toString()));

  // Get the most recent USER_LOGIN activity for each user in one query
  const loginActivities = await Activity.aggregate([
    { $match: { action: 'USER_LOGIN', userId: { $in: userIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$userId',
        lastLoginAt: { $first: '$createdAt' },
      },
    },
  ]);

  const loginMap = new Map<string, Date>();
  for (const doc of loginActivities) {
    loginMap.set(doc._id.toString(), doc.lastLoginAt);
  }

  return users.map((u) => ({
    ...u,
    lastLoginAt: loginMap.get(u._id.toString()) ?? null,
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerRole = (session.user as any).role;
  const userEmail = (session.user as any).email;

  await dbConnect();

  // Super Admin gets all staff
  if (callerRole === 'SUPER_ADMIN') {
    const staff = await User.find({ role: 'STAFF' }).select('-password').lean();
    const enriched = await enrichWithLoginStatus(staff);
    return NextResponse.json(enriched);
  }

  // Warehouse Admin gets staff for their assigned warehouse
  if (callerRole === 'WAREHOUSE_ADMIN') {
    const dbUser = await User.findOne({ email: userEmail }).lean();
    const warehouseId =
      dbUser?.warehouseAdminOf?.toString() ||
      dbUser?.assignedWarehouses?.[0]?.warehouseId?.toString();
    if (!warehouseId) {
      return NextResponse.json([]);
    }
    const staff = await User.find({
      role: 'STAFF',
      'assignedWarehouses.warehouseId': warehouseId,
    }).lean();
    const enriched = await enrichWithLoginStatus(staff);
    return NextResponse.json(enriched);
  }

  // Staff role: return only themselves
  if (callerRole === 'STAFF') {
    const self = await User.findOne({ email: userEmail }).lean();
    const enriched = self ? await enrichWithLoginStatus([self]) : [];
    return NextResponse.json(enriched);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

