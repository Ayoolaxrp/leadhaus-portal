import "server-only";
import { notFound } from "next/navigation";
import { getAccount } from "./portal";
import type { PortalSection } from "./data/types";

// Server-side guard: a section the team switched off returns 404, not just a hidden menu item.
export function requireSection(clientId: string, section: PortalSection) {
  if (!getAccount(clientId).sections[section]) notFound();
}
