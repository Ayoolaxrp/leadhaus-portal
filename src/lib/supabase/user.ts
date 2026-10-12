import "server-only";

import { cache } from "react";
import type { User } from "@/lib/data/types";
import { createServerSupabaseClient, isSupabaseAuthEnabled } from "./server";

export const getSupabaseUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseAuthEnabled()) return null;
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,client_id,title")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (error || !profile || (profile.role === "client" && !profile.client_id)) return null;
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email || authData.user.email || "",
    role: profile.role,
    clientId: profile.client_id ?? undefined,
    title: profile.title ?? undefined,
  };
});
