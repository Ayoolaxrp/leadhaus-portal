import "server-only";
import { notFound } from "next/navigation";
import { db } from "./data/store";
import type { PortalSection } from "./data/types";

// Client-safe projections. Every function takes the authenticated client id
// and returns NEW objects built from an explicit allow-list of fields.
// Never spread an internal record into a portal response: new internal
// fields added later must stay hidden by default.

const mine = <R extends { clientId: string }>(rows: R[], clientId: string) => rows.filter((r) => r.clientId === clientId);

export function getAccount(clientId: string) {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) throw new Error("Unknown client");
  return { name: c.name, service: c.service, status: c.status, accountLead: c.accountLead, renewalDate: c.renewalDate, sections: { ...c.sections }, welcomeNote: c.welcomeNote };
}

// Server-side guard: a section the team switched off returns 404, not just a hidden menu item.
export function requireSection(clientId: string, section: PortalSection) {
  if (!getAccount(clientId).sections[section]) notFound();
}

export function getAgencyInfo() {
  const s = db.settings;
  return { agencyName: s.agencyName, supportEmail: s.supportEmail, supportWhatsApp: s.supportWhatsApp, replyPromise: s.replyPromise, announcement: s.announcement, bank: { ...s.bank } };
}

export function getCampaigns(clientId: string) {
  return mine(db.campaigns, clientId).map((c) => ({ id: c.id, name: c.name, platform: c.platform, objective: c.objective, status: c.status, start: c.start, end: c.end, monthlyBudget: c.monthlyBudget }));
}

export function getPerformance(clientId: string) {
  const weeks = mine(db.metrics, clientId).map((m) => ({ weekStart: m.weekStart, spend: m.spend, leads: m.leads, revenue: m.revenue }));
  const month = weeks.slice(-4);
  const prev = weeks.slice(-8, -4);
  const sum = (rows: typeof weeks, k: "spend" | "leads" | "revenue") => rows.reduce((a, r) => a + r[k], 0);
  const totals = (rows: typeof weeks) => {
    const spend = sum(rows, "spend"), leads = sum(rows, "leads"), revenue = sum(rows, "revenue");
    return { spend, leads, revenue, roas: spend ? revenue / spend : 0, cpl: leads ? spend / leads : 0 };
  };
  return { weeks, current: totals(month), previous: totals(prev), budget: mine(db.campaigns, clientId).reduce((a, c) => a + c.monthlyBudget, 0) };
}

export function getProjects(clientId: string) {
  return mine(db.projects, clientId).map((p) => ({
    id: p.id, name: p.name, type: p.type, start: p.start, end: p.end, progress: p.progress,
    deliverables: p.deliverables.map((d) => ({ id: d.id, title: d.title, due: d.due, status: d.status })),
  }));
}

export function getCreatives(clientId: string) {
  return mine(db.creatives, clientId)
    .filter((c) => c.status !== "Internal review")
    .map((c) => ({
      id: c.id, title: c.title, format: c.format, platform: c.platform, status: c.status, decidedBy: c.decidedBy, decidedAt: c.decidedAt,
      versions: c.versions.map((v) => ({ version: v.version, image: v.image, createdAt: v.createdAt })),
      comments: c.comments.filter((m) => !m.internal).map((m) => ({ id: m.id, author: m.author, authorRole: m.authorRole, body: m.body, at: m.at })),
    }));
}

export function getStrategy(clientId: string) {
  const s = db.strategies.find((x) => x.clientId === clientId);
  if (!s) return null;
  return { title: s.title, updated: s.updated, summary: s.summary, recommendations: s.recommendations.map((r) => ({ ...r })), plans: s.plans.map((p) => ({ ...p })), goals: s.goals.map((g) => ({ ...g })) };
}

export function getReports(clientId: string) {
  return mine(db.reports, clientId)
    .filter((r) => r.status === "Published")
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
    .map((r) => ({ id: r.id, title: r.title, cadence: r.cadence, periodStart: r.periodStart, periodEnd: r.periodEnd, summary: r.summary, highlights: [...r.highlights] }));
}

export function getOnboarding(clientId: string) {
  const items = mine(db.onboarding, clientId).map((o) => ({ id: o.id, kind: o.kind, label: o.label, detail: o.detail, done: o.done, completedAt: o.completedAt }));
  const uploads = mine(db.uploads, clientId).map((u) => ({ id: u.id, name: u.name, size: u.size, uploadedAt: u.uploadedAt, uploadedBy: u.uploadedBy }));
  const done = items.filter((i) => i.done).length;
  return { items, uploads, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

export function getDocuments(clientId: string) {
  return mine(db.documents, clientId).filter((d) => d.visibility === "client").map((d) => ({ id: d.id, title: d.title, kind: d.kind, date: d.date }));
}

export function getMessages(clientId: string) {
  return mine(db.messages, clientId)
    .filter((m) => m.visibility === "client")
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((m) => ({ id: m.id, kind: m.kind, from: m.from, fromRole: m.fromRole, body: m.body, at: m.at }));
}

export function getTasks(clientId: string) {
  return mine(db.tasks, clientId)
    .filter((t) => t.clientVisible && t.status !== "Done")
    .map((t) => ({ id: t.id, title: t.title, assignee: t.assignee, due: t.due, status: t.status, link: t.link }));
}

export function getInvoices(clientId: string) {
  return mine(db.invoices, clientId)
    .sort((a, b) => b.issued.localeCompare(a.issued))
    .map((i) => ({ id: i.id, number: i.number, description: i.description, amount: i.amount, issued: i.issued, due: i.due, status: i.status, paidAt: i.paidAt, method: i.method, clientMarkedPaidAt: i.clientMarkedPaidAt }));
}

export function getInvoice(clientId: string, id: string) {
  return getInvoices(clientId).find((i) => i.id === id) ?? null;
}

export function getDocument(clientId: string, id: string) {
  const d = db.documents.find((x) => x.id === id && x.clientId === clientId && x.visibility === "client");
  return d ? { id: d.id, title: d.title, kind: d.kind, date: d.date, body: [...d.body] } : null;
}

