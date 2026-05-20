import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const token = req.nextauth.token as { isApproved?: boolean } | null;
    const isApproved = token?.isApproved === true;

    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL(isApproved ? "/dashboard" : "/pending-approval", req.url));
    }
    if (pathname === "/pending-approval" && token && isApproved) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (token && !isApproved && pathname !== "/pending-approval" && !pathname.startsWith("/api/auth")) {
      return NextResponse.redirect(new URL("/pending-approval", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname.startsWith("/pending-approval")) {
          return true;
        }
        return Boolean(token);
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/",
    "/login",
    "/pending-approval",
    "/dashboard/:path*",
    "/admin/:path*",
    "/domains/:path*",
    "/projects/:path*",
    "/subtopics/:path*",
    "/tasks/:path*",
  ],
};
