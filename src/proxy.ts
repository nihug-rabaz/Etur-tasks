import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function sanitizeCallbackUrl(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep raw */
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      value = `${url.pathname}${url.search}`;
    } catch {
      return fallback;
    }
  }
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (
    value.startsWith("/login") ||
    value.startsWith("/api/auth") ||
    value.startsWith("/pending-approval")
  ) {
    return fallback;
  }
  return value || fallback;
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  let token: { isApproved?: boolean } | null = null;
  try {
    token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })) as { isApproved?: boolean } | null;
  } catch {
    token = null;
  }

  const isApproved = token?.isApproved === true;
  const requestCallback = sanitizeCallbackUrl(
    req.nextUrl.searchParams.get("callbackUrl"),
    "/",
  );

  const isPublicAuthPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/pending-approval") ||
    pathname === "/agam/apply" ||
    pathname.startsWith("/agam/apply/") ||
    pathname === "/agam/upload" ||
    pathname.startsWith("/agam/upload/");

  if (!token && !isPublicAuthPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    const intended = sanitizeCallbackUrl(`${pathname}${req.nextUrl.search}`, "/");
    if (intended !== "/") {
      loginUrl.searchParams.set("callbackUrl", intended);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    if (!isApproved) {
      const pending = new URL("/pending-approval", req.nextUrl.origin);
      if (requestCallback !== "/") {
        pending.searchParams.set("callbackUrl", requestCallback);
      }
      return NextResponse.redirect(pending);
    }
    return NextResponse.redirect(new URL(requestCallback, req.nextUrl.origin));
  }

  if (pathname === "/pending-approval" && token && isApproved) {
    return NextResponse.redirect(new URL(requestCallback, req.nextUrl.origin));
  }

  if (token && !isApproved && !isPublicAuthPath) {
    const pending = new URL("/pending-approval", req.nextUrl.origin);
    const intended = sanitizeCallbackUrl(`${pathname}${req.nextUrl.search}`, "/");
    if (intended !== "/") {
      pending.searchParams.set("callbackUrl", intended);
    }
    return NextResponse.redirect(pending);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-etur-pathname", `${pathname}${req.nextUrl.search}`);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/pending-approval",
    "/dashboard",
    "/dashboard/:path*",
    "/admin/:path*",
    "/domains/:path*",
    "/projects/:path*",
    "/subtopics/:path*",
    "/tasks/:path*",
    "/settings/:path*",
    "/dovrut",
    "/dovrut/:path*",
    "/agam",
    "/agam/:path*",
  ],
};
