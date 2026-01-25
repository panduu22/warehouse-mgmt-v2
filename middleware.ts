import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // If user is on the homepage and authenticated, redirect to dashboard
        if (req.nextUrl.pathname === "/" && req.nextauth.token) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                // Allow access to public pages without token
                if (req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/api/auth")) {
                    return true;
                }
                // Require token for everything else
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
