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
        async session({ session }) {
            if (session.user?.email) {
                const db = await getDb();
                let dbUser = await db.collection("User").findOne({ email: session.user.email });

                // Auto-heal: If user has session but no DB record (e.g. after DB wipe), recreate them.
                if (!dbUser) {
                    const userCount = await db.collection("User").countDocuments();
                    const role = userCount === 0 ? "ADMIN" : "STAFF";

                    const newUser = {
                        name: session.user.name || "Unknown",
                        email: session.user.email,
                        image: session.user.image,
                        role: role,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    const result = await db.collection("User").insertOne(newUser);
                    dbUser = { ...newUser, _id: result.insertedId } as any;
                }

                if (dbUser) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (session.user as any).role = dbUser.role;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (session.user as any).id = (dbUser._id as ObjectId).toString();
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
