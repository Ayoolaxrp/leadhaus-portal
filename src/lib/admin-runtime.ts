import "server-only";
import type { Store } from "./data/store";
import type { User } from "./data/types";
import { getAdminDb, isLiveRuntime } from "./data/runtime";
import { requireAdmin } from "./session";
import { agencyOverview as demoAgencyOverview, clientName as demoClientName, db as demoDb } from "./admin";
import { adminDataSnapshot } from "./supabase/persistent-store";

export async function getAdminData(): Promise<Store> {
  await requireAdmin();
  return getAdminDb();
}

export async function adminOverview() {
  if (!isLiveRuntime()) return demoAgencyOverview();
  const data = await getAdminData();
  const active = data.clients.filter((c) => c.status === "Active");
  const outstanding = data.invoices.filter((i) => i.status !== "Paid");
  const openLeads = data.leads.filter((l) => l.stage !== "Won" && l.stage !== "Lost");
  const collaboratorCost = data.collaboratorPayments.reduce((a, p) => a + p.amount, 0);
  const mrr = active.reduce((a, c) => a + c.monthlyFee, 0);
  return { activeClients: active.length, mrr, pipelineValue: openLeads.reduce((a, l) => a + l.value, 0), openLeads: openLeads.length, outstandingTotal: outstanding.reduce((a, i) => a + i.amount, 0), outstandingCount: outstanding.length, collaboratorCost, estimatedProfit: mrr - collaboratorCost, awaitingApproval: data.creatives.filter((c) => c.status === "Client review").length, openQuestions: data.messages.filter((m) => m.kind === "Question" && m.fromRole === "client" && !m.answered).length };
}

export async function adminClientName(id: string) {
  if (!isLiveRuntime()) return demoClientName(id);
  return (await adminDataSnapshot()).clients.find((c) => c.id === id)?.name ?? id;
}

export async function getAdminUser(): Promise<User> {
  return requireAdmin();
}

export const localAdminDb = demoDb;
export { adminDataSnapshot };
