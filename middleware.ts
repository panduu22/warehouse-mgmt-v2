// middleware.ts
// NextAuth v4 + Next.js 16 compatible pattern:
// - withAuth provides req.nextauth.token, which is the verified JWT — no getServerSession needed.
// - Mongoose/Node.js APIs are NOT available in the Edge Runtime that middleware runs in.
//   All DB work is delegated to the internal API route /api/auth/check-expiry.

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    // req.nextauth.token is populated by withAuth from the verified JWT.
    // It is non-null here because the authorized() callback below already
    // confirmed the token exists for protected routes.
    const token = req.nextauth.token;

    // No token means the authorized() callback already handles the redirect.
    if (!token?.email) return NextResponse.next();

    try {
      // Delegate the DB expiry check to a Node.js API route.
      // We use an absolute URL built from the incoming request's origin so this
      // works identically in local dev and on Vercel (no hardcoded hostname needed).
      const checkUrl = new URL("/api/auth/check-expiry", req.url);

      const resp = await fetch(checkUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // A shared secret prevents external callers from abusing this endpoint.
          "x-internal-secret": process.env.NEXTAUTH_SECRET ?? "",
        },
        body: JSON.stringify({ email: token.email }),
      });

      if (resp.ok) {
        const data: { expired: boolean } = await resp.json();
        if (data.expired) {
          return NextResponse.redirect(new URL("/requests", req.url));
        }
      }
    } catch (e) {
      // Never block the user if the check itself fails; log and continue.
      console.error("[Middleware] Expiry check failed:", e);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public routes — always allow
        const { pathname } = req.nextUrl;
        if (
          pathname === "/" ||
          pathname === "/login" ||
          pathname.startsWith("/api/auth")
        ) {
          return true;
        }
        // All other routes require a valid token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Exclude auth callbacks, static assets, images, and the internal expiry
  // endpoint so the fetch inside this middleware never triggers itself.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
