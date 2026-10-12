import "server-only";
import { notFound } from "next/navigation";
import { getAccount } from "./portal";
import type { PortalSection } from "./data/types";
import { getSupabaseUser } from "./supabase/user";
import { isLiveRuntime } from "./data/runtime";
import { getAccount as getRuntimeAccount } from "./portal-runtime";

// Server-side guard: a section the team switched off returns 404, not just a hidden menu item.
export async function requireSection(clientId: string, section: PortalSection) {
  if (isLiveRuntime()) {
    const user = await getSupabaseUser();
    if (!user || user.clientId !== clientId) notFound();
    const account = await getRuntimeAccount(user);
    if (!account.sections[section]) notFound();
    return;
  }
  if (!getAccount(clientId).sections[section]) notFound();
}
