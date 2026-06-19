import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "missing_client_id",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "missing_client_secret",
        }),
        CredentialsProvider({
            name: "Developer Login (No Password)",
            credentials: {
                email: { label: "Email (Any Email)", type: "email", placeholder: "admin@example.com" },
            },
            async authorize(credentials) {
                if (!credentials?.email) return null;
                await dbConnect();
                let user = await User.findOne({ email: credentials.email });
                if (!user) {
                    user = new User({
                        name: "Test User",
                        email: credentials.email,
                        role: "ADMIN", // Default to admin for dev testing
                    });
                    await user.save();
                }
                return { id: user._id.toString(), email: user.email, name: user.name, role: user.role } as any;
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                await dbConnect();
                try {
                    const existingUser = await User.findOne({ email: user.email });
                    if (!existingUser) {
                        const newUser = new User({
                            name: user.name,
                            email: user.email,
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
                const dbUser = await User.findOne({ email: session.user.email });
                if (dbUser) {
                    // Attach database fields to session
                    session.user = {
                        ...session.user,
                        role: dbUser.role,
                        id: dbUser._id.toString(),
                        activeWarehouseId: dbUser.activeWarehouseId?.toString()
                    } as any;
                }
            }
            return session;
        }
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
