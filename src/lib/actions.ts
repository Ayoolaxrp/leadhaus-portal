"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, logEvent, resetStore } from "./data/store";
import { SESSION_COOKIE, sign, requireClient, requireAdmin } from "./session";
import type { Lead, Message, OnboardingStage, PortalSection } from "./data/types";
import { ONBOARDING_STAGES, PORTAL_SECTIONS, SERVICES } from "./data/types";
import { onboardingTemplate } from "./data/templates";

// Every action re-resolves the session and checks the record's client_id
// against it. Client writes are limited to: comments, approve/revise,
// onboarding answers and uploads, messages, and "I have paid" notices.

type Result = { ok?: boolean; error?: string };
const text = (v: FormDataEntryValue | null, max = 2000) => String(v ?? "").trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);
const refreshAll = () => {
  revalidatePath("/portal", "layout");
  revalidatePath("/admin", "layout");
};
const closeRelatedTasks = (clientId: string, relatesTo: string) =>
  db.tasks.filter((t) => t.clientId === clientId && t.relatesTo === relatesTo).forEach((t) => (t.status = "Done"));

export async function signIn(formData: FormData) {
  const code = process.env.DEMO_PASSCODE;
  if (code && text(formData.get("passcode"), 100) !== code) redirect("/login?error=code");
  const user = db.users.find((u) => u.id === text(formData.get("userId"), 64));
  if (!user) redirect("/login?error=user");
  (await cookies()).set(SESSION_COOKIE, sign(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  redirect(user.role === "admin" ? "/admin" : "/portal");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function resetDemo(formData: FormData) {
  const code = process.env.DEMO_PASSCODE;
  if (code && text(formData.get("passcode"), 100) !== code) redirect("/login?error=code");
  resetStore();
  refreshAll();
  redirect("/login?reset=1");
}

// ---- client actions ----

function ownCreative(clientId: string, id: string) {
  const c = db.creatives.find((x) => x.id === id && x.clientId === clientId && x.status !== "Internal review");
  if (!c) throw new Error("Not found");
  return c;
}

export async function decideCreative(formData: FormData): Promise<Result> {
  const me = await requireClient();
  const c = ownCreative(me.clientId, text(formData.get("creativeId"), 64));
  if (c.status !== "Client review") return { error: "This creative has already been decided." };
  const decision = text(formData.get("decision"), 16);
  const note = text(formData.get("note"));
  if (decision !== "approve" && decision !== "revise") return { error: "Choose Approve or Request changes." };
  if (decision === "revise" && !note) return { error: "Please write what you would like changed, then press Request changes again." };
  c.status = decision === "approve" ? "Approved" : "Revision requested";
  c.decidedBy = me.name;
  c.decidedAt = today();
  if (note) c.comments.push({ id: crypto.randomUUID(), author: me.name, authorRole: "client", body: note, at: new Date().toISOString(), internal: false });
  closeRelatedTasks(me.clientId, c.id);
  logEvent(me.name, `${c.status}: ${c.title}`, me.clientId);
  refreshAll();
  return { ok: true };
}

export async function commentOnCreative(formData: FormData): Promise<Result> {
  const me = await requireClient();
  const c = ownCreative(me.clientId, text(formData.get("creativeId"), 64));
  const body = text(formData.get("body"));
  if (!body) return { error: "Type your comment in the box first." };
  c.comments.push({ id: crypto.randomUUID(), author: me.name, authorRole: "client", body, at: new Date().toISOString(), internal: false });
  logEvent(me.name, `Commented on ${c.title}`, me.clientId);
  refreshAll();
  return { ok: true };
}

export async function sendClientMessage(formData: FormData): Promise<Result> {
  const me = await requireClient();
  const body = text(formData.get("body"));
  if (!body) return { error: "Type your message in the box first." };
  db.messages.push({ id: crypto.randomUUID(), clientId: me.clientId, kind: "Question", from: me.name, fromRole: "client", body, at: new Date().toISOString(), visibility: "client", answered: false });
  logEvent(me.name, "Sent a question", me.clientId);
  refreshAll();
  return { ok: true };
}

export async function completeOnboardingItem(formData: FormData): Promise<Result> {
  const me = await requireClient();
  const item = db.onboarding.find((o) => o.id === text(formData.get("itemId"), 64) && o.clientId === me.clientId);
  if (!item) throw new Error("Not found");
  const answer = text(formData.get("answer"));
  if (item.kind === "info" && !answer) return { error: "Type your answer in the box first." };
  item.done = true;
  item.completedAt = today();
  if (answer) db.messages.push({ id: crypto.randomUUID(), clientId: me.clientId, kind: "Update", from: me.name, fromRole: "client", body: `${item.label}: ${answer}`, at: new Date().toISOString(), visibility: "client" });
  closeRelatedTasks(me.clientId, item.id);
  logEvent(me.name, `Completed onboarding: ${item.label}`, me.clientId);
  refreshAll();
  return { ok: true };
}

const MAX_UPLOAD = 250 * 1024 * 1024;
const ALLOWED = /\.(jpe?g|png|webp|mp4|mov|pdf|svg|zip)$/i;

export async function uploadAssets(formData: FormData): Promise<Result> {
  const me = await requireClient();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Click Choose files and pick at least one file first." };
  const bad = files.find((f) => f.size > MAX_UPLOAD || !ALLOWED.test(f.name));
  if (bad) return { error: `${bad.name} cannot be uploaded. Use JPG, PNG, WEBP, MP4, MOV, PDF, SVG or ZIP files up to 250 MB.` };
  // Demo: records file details only. Production: Supabase Storage at clients/<clientId>/uploads/ with signed URLs.
  for (const f of files) db.uploads.unshift({ id: crypto.randomUUID(), clientId: me.clientId, name: f.name.slice(0, 200), size: f.size, uploadedAt: new Date().toISOString(), uploadedBy: me.name });
  logEvent(me.name, `Uploaded ${files.length} file${files.length === 1 ? "" : "s"}`, me.clientId);
  refreshAll();
  return { ok: true };
}

export async function markInvoiceSent(formData: FormData): Promise<Result> {
  const me = await requireClient();
  const inv = db.invoices.find((i) => i.id === text(formData.get("invoiceId"), 64) && i.clientId === me.clientId);
  if (!inv) throw new Error("Not found");
  if (inv.status === "Paid") return { error: "This invoice is already paid." };
  inv.clientMarkedPaidAt = new Date().toISOString();
  logEvent(me.name, `Said ${inv.number} has been paid`, me.clientId);
  refreshAll();
  return { ok: true };
}

// ---- admin actions ----

export async function postClientMessage(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const clientId = text(formData.get("clientId"), 64);
  if (!db.clients.some((c) => c.id === clientId)) return { error: "Pick a client." };
  const body = text(formData.get("body"));
  if (!body) return { error: "Type your message in the box first." };
  const kind = (["Update", "Announcement"].includes(text(formData.get("kind"), 16)) ? text(formData.get("kind"), 16) : "Update") as Message["kind"];
  const visibility = formData.get("internal") ? "internal" : "client";
  db.messages.push({ id: crypto.randomUUID(), clientId, kind, from: me.name, fromRole: "admin", body, at: new Date().toISOString(), visibility });
  // A reply the client can see answers their open questions.
  if (visibility === "client") db.messages.filter((m) => m.clientId === clientId && m.kind === "Question" && m.fromRole === "client").forEach((m) => (m.answered = true));
  logEvent(me.name, `Posted ${visibility === "internal" ? "an internal note" : `a ${kind.toLowerCase()}`}`, clientId);
  refreshAll();
  return { ok: true };
}

export async function markInvoicePaid(formData: FormData) {
  const me = await requireAdmin();
  const inv = db.invoices.find((i) => i.id === text(formData.get("invoiceId"), 64));
  if (!inv || inv.status === "Paid") return;
  inv.status = "Paid";
  inv.paidAt = today();
  inv.method = "Bank transfer";
  logEvent(me.name, `Marked ${inv.number} paid`, inv.clientId);
  refreshAll();
}

export async function createInvoice(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const clientId = text(formData.get("clientId"), 64);
  if (!db.clients.some((c) => c.id === clientId)) return { error: "Pick a client." };
  const description = text(formData.get("description"), 200);
  const amount = Number(text(formData.get("amount"), 20).replace(/[^\d.]/g, ""));
  const due = text(formData.get("due"), 10);
  if (!description) return { error: "Add a short description, for example November retainer." };
  if (!amount || amount <= 0) return { error: "Enter the amount in naira, numbers only." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Pick a due date." };
  const n = Math.max(0, ...db.invoices.map((i) => Number(i.number.split("-").pop()) || 0)) + 1;
  const number = `INV-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`;
  db.invoices.push({ id: crypto.randomUUID(), clientId, number, description, amount, issued: today(), due, status: "Unpaid" });
  db.documents.push({ id: crypto.randomUUID(), clientId, title: `${number}, ${description}`, kind: "Invoice", date: today(), visibility: "client", body: [`Invoice ${number} for ${description}.`, `Amount: ₦${amount.toLocaleString("en-NG")}. Due ${due}.`, "Pay by bank transfer and use the invoice number as the reference."] });
  logEvent(me.name, `Created ${number}`, clientId);
  refreshAll();
  return { ok: true };
}

const STAGES: Lead["stage"][] = ["New Lead", "Contacted", "Qualified", "Call Booked", "Proposal Sent", "Negotiation", "Won", "Lost"];

export async function advanceLead(formData: FormData) {
  const me = await requireAdmin();
  const lead = db.leads.find((l) => l.id === text(formData.get("leadId"), 64));
  if (!lead) return;
  const i = STAGES.indexOf(lead.stage);
  if (i < STAGES.indexOf("Won")) lead.stage = STAGES[i + 1];
  logEvent(me.name, `Moved ${lead.company} to ${lead.stage}`);
  refreshAll();
}

export async function markLeadLost(formData: FormData) {
  const me = await requireAdmin();
  const lead = db.leads.find((l) => l.id === text(formData.get("leadId"), 64));
  if (!lead || lead.stage === "Won") return;
  lead.stage = "Lost";
  logEvent(me.name, `Marked ${lead.company} as lost`);
  refreshAll();
}

export async function addLead(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const company = text(formData.get("company"), 120);
  const contact = text(formData.get("contact"), 120);
  if (!company) return { error: "Add the company name." };
  if (!contact) return { error: "Add the contact person's name." };
  const value = Number(text(formData.get("value"), 20).replace(/[^\d.]/g, "")) || 0;
  const score = (["HOT", "WARM", "LOW"].includes(text(formData.get("score"), 8)) ? text(formData.get("score"), 8) : "WARM") as Lead["score"];
  const owner = db.users.some((u) => u.role === "admin" && u.name === text(formData.get("owner"), 40)) ? text(formData.get("owner"), 40) : me.name;
  db.leads.unshift({ id: crypto.randomUUID(), company, contact, source: text(formData.get("source"), 40) || "Other", stage: "New Lead", value, score, owner, nextAction: "First contact" });
  logEvent(me.name, `Added lead ${company}`);
  refreshAll();
  return { ok: true };
}

export async function addTask(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const clientId = text(formData.get("clientId"), 64);
  if (!db.clients.some((c) => c.id === clientId)) return { error: "Pick a client." };
  const title = text(formData.get("title"), 200);
  const due = text(formData.get("due"), 10);
  if (!title) return { error: "Describe the task." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Pick a due date." };
  const forClient = text(formData.get("assignee"), 10) === "client";
  const contact = db.users.find((u) => u.clientId === clientId);
  db.tasks.push({
    id: crypto.randomUUID(), clientId, title, due, status: "Open",
    assignee: forClient ? "client" : "agency",
    owner: forClient ? contact?.name ?? "Client" : text(formData.get("owner"), 40) || me.name,
    clientVisible: forClient || formData.get("visible") === "on",
  });
  logEvent(me.name, `Added task: ${title}`, clientId);
  refreshAll();
  return { ok: true };
}

export async function completeTask(formData: FormData) {
  const me = await requireAdmin();
  const t = db.tasks.find((x) => x.id === text(formData.get("taskId"), 64));
  if (!t) return;
  t.status = "Done";
  logEvent(me.name, `Completed task: ${t.title}`, t.clientId);
  refreshAll();
}

export async function publishReport(formData: FormData) {
  const me = await requireAdmin();
  const r = db.reports.find((x) => x.id === text(formData.get("reportId"), 64));
  if (!r || r.status === "Published") return;
  r.status = "Published";
  logEvent(me.name, `Published ${r.title}`, r.clientId);
  refreshAll();
}

export async function shareCreative(formData: FormData) {
  const me = await requireAdmin();
  const c = db.creatives.find((x) => x.id === text(formData.get("creativeId"), 64));
  if (!c || !["Internal review", "Revision requested"].includes(c.status)) return;
  c.status = "Client review";
  if (!db.tasks.some((t) => t.relatesTo === c.id && t.status !== "Done")) {
    const contact = db.users.find((u) => u.clientId === c.clientId);
    db.tasks.push({ id: crypto.randomUUID(), clientId: c.clientId, title: `Review ${c.title}`, owner: contact?.name ?? "Client", assignee: "client", due: today(), status: "Open", clientVisible: true, link: "/portal/creative", relatesTo: c.id });
  }
  logEvent(me.name, `Sent ${c.title} for client review`, c.clientId);
  refreshAll();
}

// ---- settings and client controls (team only) ----

export async function saveAgencySettings(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const s = db.settings;
  const agencyName = text(formData.get("agencyName"), 80);
  const supportEmail = text(formData.get("supportEmail"), 120);
  if (!agencyName) return { error: "Add the agency name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) return { error: "Enter a valid support email, for example hello@leadhaus.studio." };
  const accountNumber = text(formData.get("accountNumber"), 20);
  if (accountNumber && !/^\d{10}$/.test(accountNumber)) return { error: "Nigerian account numbers have 10 digits." };
  s.agencyName = agencyName;
  s.supportEmail = supportEmail;
  s.supportWhatsApp = text(formData.get("supportWhatsApp"), 30);
  s.replyPromise = text(formData.get("replyPromise"), 60) || "within one working day";
  s.bank = { bank: text(formData.get("bank"), 80), accountName: text(formData.get("accountName"), 80), accountNumber };
  s.announcement = text(formData.get("announcement"), 300);
  logEvent(me.name, "Updated agency settings");
  refreshAll();
  return { ok: true };
}

function ownClient(id: string) {
  const c = db.clients.find((x) => x.id === id);
  if (!c) throw new Error("Unknown client");
  return c;
}

export async function updateClientPortal(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const lead = text(formData.get("accountLead"), 40);
  if (db.users.some((u) => u.role === "admin" && u.name === lead)) c.accountLead = lead;
  for (const k of Object.keys(c.sections) as (keyof typeof c.sections)[]) c.sections[k] = formData.get(`section_${k}`) === "on";
  c.welcomeNote = text(formData.get("welcomeNote"), 500);
  logEvent(me.name, `Updated portal settings for ${c.name}`, c.id);
  refreshAll();
  return { ok: true };
}

const DELIVERABLE_STATUSES = ["Planned", "In progress", "Client review", "Delivered"] as const;

export async function updateProject(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const p = db.projects.find((x) => x.id === text(formData.get("projectId"), 64));
  if (!p) return { error: "Project not found." };
  const progress = Number(text(formData.get("progress"), 4));
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) return { error: "Progress must be a number from 0 to 100." };
  p.progress = Math.round(progress);
  for (const d of p.deliverables) {
    const v = text(formData.get(`deliverable_${d.id}`), 20);
    if ((DELIVERABLE_STATUSES as readonly string[]).includes(v)) d.status = v as (typeof DELIVERABLE_STATUSES)[number];
  }
  const newTitle = text(formData.get("newDeliverable"), 160);
  const newDue = text(formData.get("newDeliverableDue"), 10);
  if (newTitle) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDue)) return { error: "Pick a due date for the new deliverable." };
    p.deliverables.push({ id: crypto.randomUUID(), title: newTitle, due: newDue, status: "Planned" });
  }
  logEvent(me.name, `Updated ${p.name}: ${p.progress}% complete`, p.clientId);
  refreshAll();
  return { ok: true };
}

const CAMPAIGN_STATUSES = ["Planning", "Awaiting Approval", "Live", "Optimising", "Paused", "Completed"] as const;

export async function updateCampaignStatus(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = db.campaigns.find((x) => x.id === text(formData.get("campaignId"), 64));
  const status = text(formData.get("status"), 30);
  if (!c || !(CAMPAIGN_STATUSES as readonly string[]).includes(status)) return { error: "Pick a status." };
  c.status = status as (typeof CAMPAIGN_STATUSES)[number];
  logEvent(me.name, `Set ${c.name} to ${c.status}`, c.clientId);
  refreshAll();
  return { ok: true };
}

export async function updateGoals(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const s = db.strategies.find((x) => x.clientId === text(formData.get("clientId"), 64));
  if (!s) return { error: "This client has no strategy yet." };
  for (const [i, g] of s.goals.entries()) {
    const cur = Number(text(formData.get(`current_${i}`), 20));
    const target = Number(text(formData.get(`target_${i}`), 20));
    if (!Number.isFinite(cur) || !Number.isFinite(target) || target <= 0) return { error: `Check the numbers for ${g.label}.` };
    g.current = cur;
    g.target = target;
  }
  s.updated = today();
  logEvent(me.name, "Updated goals and KPIs", s.clientId);
  refreshAll();
  return { ok: true };
}

export async function toggleOnboardingItem(formData: FormData) {
  const me = await requireAdmin();
  const item = db.onboarding.find((o) => o.id === text(formData.get("itemId"), 64));
  if (!item) return;
  item.done = !item.done;
  item.completedAt = item.done ? today() : undefined;
  if (item.done) db.tasks.filter((t) => t.relatesTo === item.id).forEach((t) => (t.status = "Done"));
  logEvent(me.name, `${item.done ? "Ticked" : "Unticked"} onboarding: ${item.label}`, item.clientId);
  refreshAll();
}

export async function addOnboardingItem(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const label = text(formData.get("label"), 120);
  const kind = text(formData.get("kind"), 10);
  if (!label) return { error: "Describe what you need from the client." };
  if (!["info", "access", "asset"].includes(kind)) return { error: "Pick a type." };
  const id = crypto.randomUUID();
  db.onboarding.push({ id, clientId: c.id, kind: kind as "info" | "access" | "asset", label, detail: text(formData.get("detail"), 200), done: false });
  const contact = db.users.find((u) => u.clientId === c.id);
  db.tasks.push({ id: crypto.randomUUID(), clientId: c.id, title: label, owner: contact?.name ?? "Client", assignee: "client", due: text(formData.get("due"), 10) || today(), status: "Open", clientVisible: true, link: "/portal/onboarding", relatesTo: id });
  logEvent(me.name, `Asked ${c.name} for: ${label}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function markQuestionsAnswered(formData: FormData) {
  const me = await requireAdmin();
  const clientId = text(formData.get("clientId"), 64);
  db.messages.filter((m) => m.clientId === clientId && m.kind === "Question").forEach((m) => (m.answered = true));
  logEvent(me.name, "Marked questions as handled", clientId);
  refreshAll();
}

// ---- client lifecycle and content the team publishes to the portal ----

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const num = (v: FormDataEntryValue | null) => Number(text(v, 20).replace(/[^\d.]/g, ""));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
const announce = (clientId: string, from: string, body: string, kind: Message["kind"] = "Announcement") =>
  db.messages.push({ id: crypto.randomUUID(), clientId, kind, from, fromRole: "admin", body, at: new Date().toISOString(), visibility: "client" });

function applyTemplate(clientId: string, service: string) {
  const have = new Set(db.onboarding.filter((o) => o.clientId === clientId).map((o) => o.label.toLowerCase()));
  const added = onboardingTemplate(service).filter((t) => !have.has(t.label.toLowerCase()));
  for (const t of added) db.onboarding.push({ id: crypto.randomUUID(), clientId, ...t, done: false });
  return added.length;
}

function ensureChecklistTask(clientId: string) {
  if (db.tasks.some((t) => t.clientId === clientId && t.relatesTo === "onboarding" && t.status !== "Done")) return;
  const contact = db.users.find((u) => u.clientId === clientId);
  const due = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  db.tasks.push({ id: crypto.randomUUID(), clientId, title: "Complete your onboarding checklist", owner: contact?.name ?? "Client", assignee: "client", due, status: "Open", clientVisible: true, link: "/portal/onboarding", relatesTo: "onboarding" });
}

function beginOnboarding(clientId: string, actor: string) {
  const c = ownClient(clientId);
  const added = applyTemplate(clientId, c.service);
  c.onboardingStage = "In Progress";
  if (c.status !== "Active") c.status = "Onboarding";
  c.sections.onboarding = true;
  ensureChecklistTask(clientId);
  announce(clientId, actor, `Welcome to ${db.settings.agencyName}. Your onboarding has started: open the Onboarding page to see what we need from you. ${c.accountLead} is your account lead.`);
  return added;
}

export async function createClient(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const name = text(formData.get("name"), 100);
  const contactName = text(formData.get("contactName"), 100);
  const email = text(formData.get("email"), 120).toLowerCase();
  const service = text(formData.get("service"), 40);
  if (!name) return { error: "Add the business name." };
  if (!contactName) return { error: "Add the name of the person who will sign in." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email for the person who will sign in." };
  if (!(SERVICES as readonly string[]).includes(service)) return { error: "Pick a service." };
  if (db.clients.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { error: "A client with that name already exists." };
  if (db.users.some((u) => u.email === email)) return { error: "That email already has portal access." };
  const leadName = text(formData.get("accountLead"), 40);
  const lead = db.users.some((u) => u.role === "admin" && u.name === leadName) ? leadName : me.name;
  const id = `c_${slug(name)}_${crypto.randomUUID().slice(0, 4)}`;
  const renewal = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  db.clients.push({
    id, name, service, status: "Onboarding", accountLead: lead, contactName, currency: "NGN", monthlyFee: num(formData.get("monthlyFee")) || 0, renewalDate: renewal,
    sections: Object.fromEntries(PORTAL_SECTIONS.map((s) => [s, true])) as Record<PortalSection, boolean>, welcomeNote: "", onboardingStage: "Not Started",
    health: "Healthy", marginPct: 0, internalNotes: "",
  });
  db.users.push({ id: `u_${crypto.randomUUID().slice(0, 8)}`, name: contactName, email, role: "client", clientId: id, title: text(formData.get("title"), 60) || "Client" });
  db.strategies.push({ clientId: id, title: "Growth strategy", updated: today(), summary: "We are preparing your strategy. It will appear here after kickoff.", recommendations: [], plans: [], goals: [], internalDiscussion: "" });
  db.tasks.push({ id: crypto.randomUUID(), clientId: id, title: `Book kickoff call with ${name}`, owner: lead, assignee: "agency", due: today(), status: "Open", clientVisible: false });
  if (formData.get("startOnboarding") === "on") beginOnboarding(id, me.name);
  logEvent(me.name, `Added client ${name}`, id);
  refreshAll();
  return { ok: true };
}

export async function startOnboarding(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const added = beginOnboarding(c.id, me.name);
  logEvent(me.name, `Started onboarding (${added} checklist items)`, c.id);
  refreshAll();
  return { ok: true };
}

export async function setOnboardingStage(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const stage = text(formData.get("stage"), 30);
  if (!(ONBOARDING_STAGES as readonly string[]).includes(stage)) return { error: "Pick a stage." };
  c.onboardingStage = stage as OnboardingStage;
  if (stage === "Complete") {
    c.status = "Active";
    db.tasks.filter((t) => t.clientId === c.id && t.relatesTo === "onboarding").forEach((t) => (t.status = "Done"));
    announce(c.id, me.name, "Onboarding is complete. Thank you. Your campaigns are moving to launch and you will see progress on your dashboard.");
  } else if (stage === "Ready for Launch") {
    announce(c.id, me.name, "We have everything we need and are preparing to launch. You will be asked to approve the first creatives soon.", "Update");
  }
  logEvent(me.name, `Onboarding stage: ${stage}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function sendOnboardingReminder(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const open = db.onboarding.filter((o) => o.clientId === c.id && !o.done);
  if (!open.length) return { error: "Nothing is outstanding, so there is nothing to remind them about." };
  announce(c.id, me.name, `A friendly reminder: we still need ${open.length} item${open.length === 1 ? "" : "s"} to keep your campaign on track:\n${open.map((o) => `- ${o.label}`).join("\n")}\nYou can complete them on your Onboarding page.`, "Update");
  ensureChecklistTask(c.id);
  logEvent(me.name, "Sent onboarding reminder", c.id);
  refreshAll();
  return { ok: true };
}

export async function applyChecklistTemplate(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const added = applyTemplate(c.id, c.service);
  if (!added) return { error: "Every item from the checklist is already on their list." };
  logEvent(me.name, `Added ${added} checklist items`, c.id);
  refreshAll();
  return { ok: true };
}

const CLIENT_STATUSES = ["Onboarding", "Active", "Paused", "Completed", "Churned"] as const;

export async function setClientStatus(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const status = text(formData.get("status"), 20);
  if (!(CLIENT_STATUSES as readonly string[]).includes(status)) return { error: "Pick a status." };
  c.status = status as (typeof CLIENT_STATUSES)[number];
  logEvent(me.name, `Client status: ${status}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function addProject(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const name = text(formData.get("name"), 120);
  const end = text(formData.get("end"), 10);
  if (!name) return { error: "Name the project." };
  if (!isDate(end)) return { error: "Pick an end date." };
  db.projects.push({ id: crypto.randomUUID(), clientId: c.id, name, type: text(formData.get("type"), 40) || c.service, start: today(), end, progress: 0, deliverables: [], owner: me.name, capacityNote: "" });
  logEvent(me.name, `Started project ${name}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function addCampaign(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const name = text(formData.get("name"), 120);
  const start = text(formData.get("start"), 10);
  const end = text(formData.get("end"), 10);
  if (!name) return { error: "Name the campaign." };
  if (!isDate(start) || !isDate(end)) return { error: "Pick a start and end date." };
  if (end < start) return { error: "The end date must be after the start date." };
  db.campaigns.push({ id: crypto.randomUUID(), clientId: c.id, name, platform: text(formData.get("platform"), 40) || "Meta", objective: text(formData.get("objective"), 40) || "Leads", status: "Planning", start, end, monthlyBudget: num(formData.get("budget")) || 0, internalNotes: "" });
  logEvent(me.name, `Added campaign ${name}`, c.id);
  refreshAll();
  return { ok: true };
}

function reviewTask(clientId: string, creativeId: string, title: string) {
  if (db.tasks.some((t) => t.relatesTo === creativeId && t.status !== "Done")) return;
  const contact = db.users.find((u) => u.clientId === clientId);
  db.tasks.push({ id: crypto.randomUUID(), clientId, title: `Review ${title}`, owner: contact?.name ?? "Client", assignee: "client", due: today(), status: "Open", clientVisible: true, link: "/portal/creative", relatesTo: creativeId });
}

export async function addCreative(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const title = text(formData.get("title"), 120);
  if (!title) return { error: "Name the creative." };
  const id = crypto.randomUUID();
  const send = formData.get("sendNow") === "on";
  db.creatives.push({
    id, clientId: c.id, title, format: text(formData.get("format"), 40) || "Static 1:1", platform: text(formData.get("platform"), 60) || "Meta feed",
    status: send ? "Client review" : "Internal review", designer: me.name, productionCost: 0,
    // Demo: sample picture. With file storage this becomes the uploaded file.
    versions: [{ version: 1, image: `https://picsum.photos/seed/${slug(title)}-${id.slice(0, 4)}/960/1200`, createdAt: today() }], comments: [],
  });
  if (send) reviewTask(c.id, id, title);
  logEvent(me.name, `Added creative ${title}${send ? " for client review" : ""}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function addCreativeVersion(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const cr = db.creatives.find((x) => x.id === text(formData.get("creativeId"), 64));
  if (!cr) return { error: "Creative not found." };
  const v = cr.versions.length + 1;
  cr.versions.push({ version: v, image: `https://picsum.photos/seed/${slug(cr.title)}-v${v}/960/1200`, createdAt: today() });
  const note = text(formData.get("note"));
  if (note) cr.comments.push({ id: crypto.randomUUID(), author: me.name, authorRole: "admin", body: note, at: new Date().toISOString(), internal: false });
  cr.status = "Client review";
  cr.decidedBy = undefined;
  cr.decidedAt = undefined;
  reviewTask(cr.clientId, cr.id, cr.title);
  logEvent(me.name, `Uploaded version ${v} of ${cr.title}`, cr.clientId);
  refreshAll();
  return { ok: true };
}

export async function replyOnCreative(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const cr = db.creatives.find((x) => x.id === text(formData.get("creativeId"), 64));
  const body = text(formData.get("body"));
  if (!cr) return { error: "Creative not found." };
  if (!body) return { error: "Type your comment first." };
  cr.comments.push({ id: crypto.randomUUID(), author: me.name, authorRole: "admin", body, at: new Date().toISOString(), internal: formData.get("internal") === "on" });
  logEvent(me.name, `Commented on ${cr.title}`, cr.clientId);
  refreshAll();
  return { ok: true };
}

export async function createReport(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const title = text(formData.get("title"), 120);
  const start = text(formData.get("periodStart"), 10);
  const end = text(formData.get("periodEnd"), 10);
  const summary = text(formData.get("summary"), 1500);
  if (!title) return { error: "Give the report a title." };
  if (!isDate(start) || !isDate(end) || end < start) return { error: "Pick the dates the report covers." };
  if (!summary) return { error: "Write a short summary of the results." };
  const highlights = text(formData.get("highlights"), 1500).split("\n").map((h) => h.trim()).filter(Boolean).slice(0, 6);
  const publish = formData.get("publish") === "on";
  db.reports.push({ id: crypto.randomUUID(), clientId: c.id, title, cadence: text(formData.get("cadence"), 10) === "Weekly" ? "Weekly" : "Monthly", periodStart: start, periodEnd: end, status: publish ? "Published" : "Draft", summary, highlights, reviewNotes: "" });
  if (publish) announce(c.id, me.name, `Your new report is ready: ${title}. Open the Reports page to read it.`, "Update");
  logEvent(me.name, `${publish ? "Published" : "Drafted"} report ${title}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function logWeeklyMetrics(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const weekStart = text(formData.get("weekStart"), 10);
  if (!isDate(weekStart)) return { error: "Pick the first day of the week." };
  const spend = num(formData.get("spend"));
  const leads = num(formData.get("leads"));
  const revenue = num(formData.get("revenue"));
  if ([spend, leads, revenue].some((n) => !Number.isFinite(n))) return { error: "Use numbers only." };
  const row = db.metrics.find((m) => m.clientId === c.id && m.weekStart === weekStart);
  if (row) Object.assign(row, { spend, leads, revenue });
  else db.metrics.push({ clientId: c.id, weekStart, spend, leads, revenue });
  db.metrics.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  logEvent(me.name, `Logged numbers for week of ${weekStart}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function updateStrategy(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  let s = db.strategies.find((x) => x.clientId === c.id);
  if (!s) db.strategies.push((s = { clientId: c.id, title: "Growth strategy", updated: today(), summary: "", recommendations: [], plans: [], goals: [], internalDiscussion: "" }));
  const lines = (k: string) => text(formData.get(k), 3000).split("\n").map((l) => l.trim()).filter(Boolean);
  const goalLabel = text(formData.get("newGoal"), 80);
  const goalTarget = num(formData.get("newGoalTarget"));
  if (goalLabel && !goalTarget) return { error: "Give the new goal a target number." };
  s.title = text(formData.get("title"), 100) || s.title;
  s.summary = text(formData.get("summary"), 1500);
  s.recommendations = lines("recommendations").map((l) => { const [t, ...d] = l.split(":"); return { title: t.trim(), detail: d.join(":").trim() }; });
  s.plans = lines("plans").map((l) => { const [n, w = "", ...d] = l.split("|"); return { name: n.trim(), window: w.trim(), detail: d.join("|").trim() }; });
  if (goalLabel) s.goals.push({ label: goalLabel, target: goalTarget, current: 0, unit: "count" });
  s.updated = today();
  logEvent(me.name, "Updated strategy", c.id);
  refreshAll();
  return { ok: true };
}

const DOC_KINDS = ["Contract", "Proposal", "Invoice", "Report", "Brand", "Other"] as const;

export async function shareDocument(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const c = ownClient(text(formData.get("clientId"), 64));
  const title = text(formData.get("title"), 120);
  const body = text(formData.get("body"), 6000).split("\n").map((l) => l.trim()).filter(Boolean);
  const kind = text(formData.get("kind"), 20);
  if (!title) return { error: "Give the document a title." };
  if (!body.length) return { error: "Add the document text." };
  if (!(DOC_KINDS as readonly string[]).includes(kind)) return { error: "Pick a document type." };
  db.documents.push({ id: crypto.randomUUID(), clientId: c.id, title, kind: kind as (typeof DOC_KINDS)[number], date: today(), visibility: formData.get("internal") === "on" ? "internal" : "client", body });
  logEvent(me.name, `Shared document ${title}`, c.id);
  refreshAll();
  return { ok: true };
}

export async function toggleDocument(formData: FormData) {
  const me = await requireAdmin();
  const d = db.documents.find((x) => x.id === text(formData.get("documentId"), 64));
  if (!d) return;
  d.visibility = d.visibility === "client" ? "internal" : "client";
  logEvent(me.name, `${d.visibility === "client" ? "Shared" : "Hid"} document ${d.title}`, d.clientId);
  refreshAll();
}
