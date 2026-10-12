import "server-only";
import type { Store } from "./store";
import { db as demoDb } from "./store";
import { isSupabaseAuthEnabled } from "@/lib/supabase/server";
import { adminDataSnapshot } from "@/lib/supabase/persistent-store";

export const isLiveRuntime = () => isSupabaseAuthEnabled();

export async function getAdminDb(): Promise<Store> {
  if (!isLiveRuntime()) return demoDb;
  return adminDataSnapshot();
}
