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
                const dbUser = await db.collection("User").findOne({ email: user.email });
                if (dbUser) {
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
