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
      const activeWarehouseId = req.cookies.get("activeWarehouseId")?.value;
      const queryWarehouseId = req.nextUrl.searchParams.get("warehouseId");
      let bodyWarehouseId = undefined;

      if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
        try {
          const cloned = req.clone();
          const body = await cloned.json();
          bodyWarehouseId = body?.warehouseId;
        } catch {}
      }

      // Delegate the DB expiry check and authorization to a Node.js API route.
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
        body: JSON.stringify({
          email: token.email,
          cookieWarehouseId: activeWarehouseId,
          queryWarehouseId,
          bodyWarehouseId
        }),
      });

      if (resp.status === 403) {
        return new NextResponse("You do not have access to this warehouse.", { status: 403 });
      }

      if (resp.ok) {
        const data: { expired: boolean; authorized?: boolean; correctWarehouseId?: string } = await resp.json();
        if (data.authorized === false) {
          return new NextResponse("You do not have access to this warehouse.", { status: 403 });
        }

        let response = NextResponse.next();
        if (data.correctWarehouseId) {
          const requestHeaders = new Headers(req.headers);
          
          // Modify request Cookie header so downstream route handlers read the correct warehouse cookie
          const cookieHeader = req.headers.get("cookie") || "";
          const updatedCookieHeader = cookieHeader
            .split(";")
            .map(c => {
              const parts = c.split("=");
              if (parts[0]?.trim() === "activeWarehouseId") {
                return `activeWarehouseId=${data.correctWarehouseId}`;
              }
              return c;
            })
            .join(";");
          
          const hasActiveWarehouse = cookieHeader.includes("activeWarehouseId");
          requestHeaders.set("cookie", hasActiveWarehouse 
            ? updatedCookieHeader 
            : `${updatedCookieHeader}${updatedCookieHeader ? ";" : ""} activeWarehouseId=${data.correctWarehouseId}`
          );

          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          response.cookies.set("activeWarehouseId", data.correctWarehouseId, { path: "/" });
        }
        
        if (data.expired && req.nextUrl.pathname !== "/") {
          const redirectRes = NextResponse.redirect(new URL("/", req.url));
          if (data.correctWarehouseId) {
            redirectRes.cookies.set("activeWarehouseId", data.correctWarehouseId, { path: "/" });
          }
          return redirectRes;
        }

        return response;
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
          pathname.startsWith("/api/auth") ||
          pathname === "/manifest.json" ||
          pathname === "/sw.js" ||
          pathname === "/offline" ||
          pathname.startsWith("/workbox-") ||
          pathname.startsWith("/swe-worker-")
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
  // Exclude auth callbacks, static assets, images, internal endpoints, and PWA assets
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline|workbox-.*|swe-worker-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
