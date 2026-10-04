import { NextResponse, type NextRequest } from "next/server";

// Fast-path only: bounce visitors without a session cookie. Real role and
// client checks happen server-side in requireClient()/requireAdmin().
export function proxy(req: NextRequest) {
  if (!req.cookies.get("lh_session")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*"] };
