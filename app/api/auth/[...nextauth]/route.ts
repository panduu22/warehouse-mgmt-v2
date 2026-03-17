import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const handler = (req: any, res: any) => NextAuth(authOptions)(req, res);

export { handler as GET, handler as POST };
