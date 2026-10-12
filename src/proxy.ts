import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseAuthEnabled } from "@/lib/supabase/server";
import { refreshSupabaseSession } from "@/lib/proxy-supabase";

// Fast-path only: bounce visitors without a session cookie. Real role and
// client checks happen server-side in requireClient()/requireAdmin().
export async function proxy(req: NextRequest) {
  if (isSupabaseAuthEnabled()) return refreshSupabaseSession(req);
  if (!req.cookies.get("lh_session")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*"] };
