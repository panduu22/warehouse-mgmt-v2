import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn() {
            return true;
        },
        async session({ session, token }) {
            if (session.user?.email && token) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).role = token.role;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).id = token.id;
            }
            return session;
        },
        async jwt({ token, user, trigger }) {
            if (user) {
                // This only runs on first login/sign in
                const db = await getDb();
                let dbUser = await db.collection("User").findOne({ email: user.email });

                if (!dbUser) {
                    // Auto-create user on first sign-in
                    const result = await db.collection("User").insertOne({
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        role: "STAFF", // Default role
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    token.role = "STAFF";
                    token.id = result.insertedId.toString();
                } else {
                    token.role = dbUser.role;
                    token.id = (dbUser._id as ObjectId).toString();
                }
            } else if (trigger === "update") {
                // Handle manual updates if needed
            }
            return token;
        }
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
