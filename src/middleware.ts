import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasSessionToken = req.cookies
    .getAll()
    .some((c) => c.name.includes("session-token") && Boolean(c.value));

  // Protect /admin sub-routes (e.g., /admin/dashboard, /admin/orders)
  if (pathname.startsWith("/admin/")) {
    if (!hasSessionToken) {
      const loginUrl = new URL("/admin", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /api/admin/ routes (return 401 JSON instead of redirecting)
  if (pathname.startsWith("/api/admin/")) {
    if (!hasSessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // If already authenticated and accessing login page, redirect directly to dashboard
  if (pathname === "/admin") {
    if (hasSessionToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
