import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

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
                let dbUser = await prisma.user.findUnique({
                    where: { email: session.user.email }
                });

                // Auto-heal: If user has session but no DB record (e.g. after DB wipe), recreate them.
                if (!dbUser) {
                    const userCount = await prisma.user.count();
                    const role = userCount === 0 ? "ADMIN" : "STAFF";

                    dbUser = await prisma.user.create({
                        data: {
                            name: session.user.name || "Unknown",
                            email: session.user.email,
                            image: session.user.image,
                            role: role,
                        }
                    });
                }

                if (dbUser) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (session.user as any).role = dbUser.role;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (session.user as any).id = dbUser.id;
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
