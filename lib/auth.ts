import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
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
