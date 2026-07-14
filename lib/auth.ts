import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "./mongodb";
import User from "@/models/User";
import Activity from "@/models/Activity";
import mongoose from "mongoose";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextauthSecret = process.env.NEXTAUTH_SECRET;
const nextauthUrl = process.env.NEXTAUTH_URL;

const missingVars: string[] = [];
if (!googleClientId) missingVars.push("GOOGLE_CLIENT_ID");
if (!googleClientSecret) missingVars.push("GOOGLE_CLIENT_SECRET");
if (!nextauthSecret) missingVars.push("NEXTAUTH_SECRET");
if (!nextauthUrl) missingVars.push("NEXTAUTH_URL");

if (missingVars.length > 0) {
    throw new Error(
        `[NextAuth Configuration Error]: Missing required environment variable(s): ${missingVars.join(", ")}. ` +
        `Please copy .env.local.example to .env.local and configure these variables.`
    );
}

console.log("GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET =", process.env.GOOGLE_CLIENT_SECRET ? "Loaded" : "Missing");
export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            authorization: {
                params: {
                    prompt: "select_account"
                }
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                await dbConnect();
                try {
                    const normalizedEmail = user.email ? user.email.trim().toLowerCase() : "";
                    let existingUser = await User.findOne({ email: normalizedEmail });
                    if (!existingUser) {
                        const newUser = new User({
                            name: user.name,
                            email: normalizedEmail,
                            image: user.image,
                            role: "STAFF", // Default role
                        });
                        await newUser.save();
                        existingUser = newUser;
                    }
                    // Log login activity for online/offline status tracking
                    try {
                        await Activity.create({
                            userId: new mongoose.Types.ObjectId(existingUser._id.toString()),
                            action: "USER_LOGIN",
                            details: `${normalizedEmail} logged in`,
                        });
                    } catch {
                        // Non-blocking — don't fail login if activity logging fails
                    }
                    return true;
                } catch (error) {
                    console.error("Error creating user", error);
                    return false;
                }
            }
            return true;
        },
        async session({ session }) {
            if (session.user?.email) {
                await dbConnect();
                const normalizedEmail = session.user.email.trim().toLowerCase();
                const dbUser = await User.findOne({ email: normalizedEmail });
                if (dbUser) {
                    const canonicalRole = dbUser.role; // Keep original role string (SUPER_ADMIN, WAREHOUSE_ADMIN, STAFF)
                    // Determine primary warehouse for non‑super admins
                    let primaryWarehouseId: string | undefined;
                    if (canonicalRole === "WAREHOUSE_ADMIN" && dbUser.warehouseAdminOf) {
                        primaryWarehouseId = dbUser.warehouseAdminOf.toString();
                    } else if (dbUser.assignedWarehouses && dbUser.assignedWarehouses.length > 0) {
                        primaryWarehouseId = dbUser.assignedWarehouses[0].warehouseId?.toString();
                    }
                    session.user = {
                        ...session.user,
                        role: canonicalRole,
                        id: dbUser._id.toString(),
                        activeWarehouseId: dbUser.activeWarehouseId?.toString(),
                        warehouseId: primaryWarehouseId,
                    } as any;
                }
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
