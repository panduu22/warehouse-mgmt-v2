import { NextResponse } from 'next/server';

export function requireSuperAdmin(session: any) {
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Super Admins only' }, { status: 403 });
  }
  return null;
}

export function requireWarehouseAdmin(session: any) {
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized: Not logged in' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'WAREHOUSE_ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Warehouse Admins only' }, { status: 403 });
  }
  return null;
}

export function requireStaff(session: any) {
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized: Not logged in' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'STAFF') {
    return NextResponse.json({ error: 'Unauthorized: Staff only' }, { status: 403 });
  }
  return null;
}
