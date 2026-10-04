import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./data/store";
import type { User } from "./data/types";
import { sign, verify } from "./session-token";

export { sign };

// Demo auth: a signed cookie naming the user. Production swaps this for
// Supabase Auth (magic link); the role and client checks below stay the same.

export const SESSION_COOKIE = "lh_session";
export async function getUser(): Promise<User | null> {
  const id = verify((await cookies()).get(SESSION_COOKIE)?.value);
  return db.users.find((u) => u.id === id) ?? null;
}

export type ClientSession = User & { role: "client"; clientId: string };

export async function requireClient(): Promise<ClientSession> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.role !== "client" || !u.clientId) redirect("/admin");
  return u as ClientSession;
}

export async function requireAdmin(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.role !== "admin") redirect("/portal");
  return u;
}
