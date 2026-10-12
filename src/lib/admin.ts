import "server-only";
import { db } from "./data/store";

// Demo-only compatibility exports. Production pages should use the async
// Supabase-backed repositories directly; never use these in deployed flows.
export function agencyOverview() {
  const active = db.clients.filter((c) => c.status === "Active");
  const mrr = active.reduce((a, c) => a + c.monthlyFee, 0);
  const outstanding = db.invoices.filter((i) => i.status !== "Paid");
  const collaboratorCost = db.collaboratorPayments.reduce((a, p) => a + p.amount, 0);
  const openLeads = db.leads.filter((l) => l.stage !== "Won" && l.stage !== "Lost");
  return {
    activeClients: active.length,
    mrr,
    pipelineValue: openLeads.reduce((a, l) => a + l.value, 0),
    openLeads: openLeads.length,
    outstandingTotal: outstanding.reduce((a, i) => a + i.amount, 0),
    outstandingCount: outstanding.length,
    collaboratorCost,
    estimatedProfit: mrr - collaboratorCost,
    awaitingApproval: db.creatives.filter((c) => c.status === "Client review").length,
    openQuestions: db.messages.filter((m) => m.kind === "Question" && m.fromRole === "client").length,
  };
}

export const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name ?? id;
export { db };
