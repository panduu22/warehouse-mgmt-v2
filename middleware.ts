import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { isoDateIST } from "@/lib/dateUtils";

export default withAuth(
  async function middleware(req) {
    // Public pages are handled by the authorized callback below
    const session = await getServerSession(authOptions);
    if (!session) {
      // Not authenticated, let withAuth handle redirect
      return NextResponse.next();
    }

    try {
      await dbConnect();
      const user = await User.findById((session.user as any).id);
      if (!user) return NextResponse.next();

      const now = new Date(); // current time (UTC) – we will use IST for logs only
      console.log("[Middleware] IST now:", isoDateIST(now));
      console.log("[Middleware] User assignedWarehouses before check:", user.assignedWarehouses);

      const validWarehouses = (user.assignedWarehouses || []).filter(
        (w) => !w.expiresAt || w.expiresAt > now
      );
      const hadExpired = (user.assignedWarehouses?.length || 0) !== validWarehouses.length;

      console.log("[Middleware] Valid warehouses after filter:", validWarehouses);
      console.log("[Middleware] Had expired?:", hadExpired);

      if (hadExpired) {
        user.assignedWarehouses = validWarehouses;
        // Update activeWarehouseId if it became invalid
        if (
          user.activeWarehouseId &&
          !validWarehouses.some(
            (w) => w.warehouseId.toString() === user.activeWarehouseId.toString()
          )
        ) {
          user.activeWarehouseId =
            validWarehouses.length > 0 ? validWarehouses[0].warehouseId : undefined;
        }
        await user.save();
        // Redirect to the access request page so the user can request new access
        return NextResponse.redirect(new URL("/requests", req.url));
      }
    } catch (e) {
      console.error("Middleware expiration check error:", e);
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public pages without token
        if (
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname === "/login" ||
          req.nextUrl.pathname.startsWith("/api/auth")
        ) {
          return true;
        }
        // Require token for everything else
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
