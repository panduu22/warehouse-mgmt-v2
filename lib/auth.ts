import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "./mongodb";
import User from "@/models/User";

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
                    const existingUser = await User.findOne({ email: normalizedEmail });
                    if (!existingUser) {
                        const newUser = new User({
                            name: user.name,
                            email: normalizedEmail,
                            image: user.image,
                            role: "STAFF", // Default role
                        });
                        await newUser.save();
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
                    let currentWarehouseAccess = null;
                    if (dbUser.activeWarehouseId) {
                        currentWarehouseAccess = dbUser.assignedWarehouses?.find(
                            (aw: any) => aw.warehouseId.toString() === dbUser.activeWarehouseId?.toString()
                        );
                    }

                    // Attach database fields to session
                    session.user = {
                        ...session.user,
                        role: dbUser.role,
                        id: dbUser._id.toString(),
                        activeWarehouseId: dbUser.activeWarehouseId?.toString(),
                        grantedAt: currentWarehouseAccess?.grantedAt,
                        expiresAt: currentWarehouseAccess?.expiresAt,
                    } as any;
                }
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
