import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./mongodb";
import User from "@/models/User";
import Activity from "@/models/Activity";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const nextauthSecret = process.env.NEXTAUTH_SECRET;
const nextauthUrl = process.env.NEXTAUTH_URL;

const missingVars: string[] = [];
if (!nextauthSecret) missingVars.push("NEXTAUTH_SECRET");
if (!nextauthUrl) missingVars.push("NEXTAUTH_URL");

if (missingVars.length > 0) {
    throw new Error(
        `[NextAuth Configuration Error]: Missing required environment variable(s): ${missingVars.join(", ")}. ` +
        `Please copy .env.local.example to .env.local and configure these variables.`
    );
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("MISSING_CREDENTIALS");
                }
                
                await dbConnect();
                const normalizedEmail = credentials.email.trim().toLowerCase();
                const user = await User.findOne({ email: normalizedEmail });
                
                if (!user) {
                    throw new Error("USER_NOT_FOUND");
                }
                
                if (user.isActive === false) {
                    throw new Error("ACCOUNT_INACTIVE");
                }
                
                // SUPER_ADMIN is bypasses warehouse assignment check, but others must be assigned to at least one valid warehouse
                if (user.role !== "SUPER_ADMIN") {
                    const now = new Date();
                    const validWarehouses = (user.assignedWarehouses ?? []).filter(
                        (w: any) => !w.expiresAt || new Date(w.expiresAt) > now
                    );
                    if (validWarehouses.length === 0) {
                        throw new Error("UNASSIGNED_WAREHOUSE");
                    }
                }
                
                if (!user.password) {
                    throw new Error("INCORRECT_PASSWORD");
                }
                
                const isPasswordValid = bcrypt.compareSync(credentials.password, user.password);
                if (!isPasswordValid) {
                    throw new Error("INCORRECT_PASSWORD");
                }
                
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                } as any;
            }
        })
    ],
    callbacks: {
        async signIn({ user }) {
            await dbConnect();
            try {
                const normalizedEmail = user.email ? user.email.trim().toLowerCase() : "";
                const existingUser = await User.findOne({ email: normalizedEmail });
                if (existingUser) {
                    try {
                        await Activity.create({
                            userId: new mongoose.Types.ObjectId(existingUser._id.toString()),
                            action: "USER_LOGIN",
                            details: `${normalizedEmail} logged in`,
                        });
                    } catch {
                        // Non-blocking
                    }
                }
            } catch (error) {
                console.error("Error in signIn callback", error);
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user?.email) {
                await dbConnect();
                const normalizedEmail = session.user.email.trim().toLowerCase();
                const dbUser = await User.findOne({ email: normalizedEmail });
                if (dbUser) {
                    const canonicalRole = dbUser.role;
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
