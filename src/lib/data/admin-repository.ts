import "server-only";
import { withPersistentStoreSnapshot } from "@/lib/supabase/persistent-store";
import type { Store } from "./store";

export async function adminRows(): Promise<Store> {
  return withPersistentStoreSnapshot((state) => state);
}
