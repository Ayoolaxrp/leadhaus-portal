import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use Supabase Auth.");
  return { url, key };
}

// Production is live unless AUTH_PROVIDER=demo is set on purpose (the e2e suite).
export function isSupabaseAuthEnabled() {
  if (process.env.AUTH_PROVIDER === "demo") return false;
  return process.env.NODE_ENV === "production" || process.env.AUTH_PROVIDER === "supabase";
}

export async function createServerSupabaseClient() {
  // Read cookies first so pages that sign in stay per-request even when the
  // keys are missing at build time.
  const cookieStore = await cookies();
  const { url, key } = config();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot write cookies. src/proxy.ts refreshes the
          // session before rendering; Server Actions and Route Handlers can write.
        }
      },
    },
  });
}
