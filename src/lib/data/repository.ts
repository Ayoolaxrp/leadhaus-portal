import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Document, Report, Strategy, User } from "./types";

type PortalStrategy = Pick<Strategy, "title" | "updated" | "summary" | "recommendations" | "plans" | "goals">;
type PortalReport = Pick<Report, "id" | "title" | "cadence" | "periodStart" | "periodEnd" | "summary" | "highlights">;
type PortalDocument = Pick<Document, "id" | "title" | "kind" | "date" | "body"> & { fileUrl?: string };

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(`Supabase request failed: ${error.message}`);
};
const iso = (value: string | null | undefined) => value ?? "";
const clientId = (user: User) => {
  if (user.role !== "client" || !user.clientId) throw new Error("A linked client profile is required.");
  return user.clientId;
};

export async function portalAccount(user: User) {
  const supabase = await createServerSupabaseClient();
  const id = clientId(user);
  const { data, error } = await supabase.from("clients").select("id,name,service,status,account_lead,renewal_date,contact_name,welcome_note,onboarding_stage,portal_sections").eq("id", id).single();
  fail(error);
  if (!data) throw new Error("Client profile is missing.");
  return { id: data.id, name: data.name, service: data.service, status: data.status, accountLead: data.account_lead ?? "", renewalDate: iso(data.renewal_date), contactName: data.contact_name ?? "", currency: "NGN" as const, monthlyFee: 0, sections: data.portal_sections, welcomeNote: data.welcome_note, onboardingStage: data.onboarding_stage };
}

export async function portalAgencyInfo() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("agency_settings").select("agency_name,support_email,support_whatsapp,reply_promise,bank_name,bank_account_name,bank_account_number,announcement").eq("id", true).single();
  fail(error);
  if (!data) throw new Error("Agency settings are missing.");
  return { agencyName: data.agency_name, supportEmail: data.support_email, supportWhatsApp: data.support_whatsapp, replyPromise: data.reply_promise, bank: { bank: data.bank_name, accountName: data.bank_account_name, accountNumber: data.bank_account_number }, announcement: data.announcement };
}

export async function portalCampaigns(user: User) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("campaigns").select("id,name,platform,objective,status,start_date,end_date,monthly_budget").eq("client_id", clientId(user)).order("start_date");
  fail(error);
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, platform: r.platform ?? "", objective: r.objective ?? "", status: r.status, start: iso(r.start_date), end: iso(r.end_date), monthlyBudget: Number(r.monthly_budget ?? 0) }));
}

export async function portalPerformance(user: User) {
  const supabase = await createServerSupabaseClient();
  const id = clientId(user);
  const [{ data: rows, error }, campaigns] = await Promise.all([
    supabase.from("weekly_metrics").select("week_start,spend,leads,revenue").eq("client_id", id).order("week_start"),
    portalCampaigns(user),
  ]);
  fail(error);
  const weeks = (rows ?? []).map((r) => ({ weekStart: r.week_start, spend: Number(r.spend), leads: r.leads, revenue: Number(r.revenue) }));
  const totals = (entries: typeof weeks) => {
    const spend = entries.reduce((a, r) => a + r.spend, 0), leads = entries.reduce((a, r) => a + r.leads, 0), revenue = entries.reduce((a, r) => a + r.revenue, 0);
    return { spend, leads, revenue, roas: spend ? revenue / spend : 0, cpl: leads ? spend / leads : 0 };
  };
  return { weeks, current: totals(weeks.slice(-4)), previous: totals(weeks.slice(-8, -4)), budget: campaigns.reduce((a, c) => a + c.monthlyBudget, 0) };
}

export async function portalProjects(user: User) {
  const supabase = await createServerSupabaseClient();
  const id = clientId(user);
  const { data: projects, error } = await supabase.from("projects").select("id,name,type,start_date,end_date,progress").eq("client_id", id).order("start_date");
  fail(error);
  const { data: deliverables, error: deliverableError } = await supabase.from("deliverables").select("id,project_id,title,due,status").eq("client_id", id).order("due");
  fail(deliverableError);
  return (projects ?? []).map((p) => ({ id: p.id, name: p.name, type: p.type ?? "", start: iso(p.start_date), end: iso(p.end_date), progress: p.progress, deliverables: (deliverables ?? []).filter((d) => d.project_id === p.id).map((d) => ({ id: d.id, title: d.title, due: iso(d.due), status: d.status })) }));
}

export async function portalCreatives(user: User) {
  const supabase = await createServerSupabaseClient();
  const id = clientId(user);
  const { data: creatives, error } = await supabase.from("creatives").select("id,title,format,platform,status,decided_by,decided_at,review_requested_at").eq("client_id", id).neq("status", "Internal review");
  fail(error);
  const creativeIds = (creatives ?? []).map((r) => r.id);
  if (!creativeIds.length) return [];
  const [{ data: versions, error: versionError }, { data: comments, error: commentError }] = await Promise.all([
    supabase.from("creative_versions").select("creative_id,version,storage_path,created_at").eq("client_id", id).in("creative_id", creativeIds).order("version"),
    supabase.from("creative_comments").select("id,creative_id,author_id,body,created_at").eq("client_id", id).eq("client_visible", true).in("creative_id", creativeIds).order("created_at"),
  ]);
  fail(versionError); fail(commentError);
  const urls = new Map<string,string>();
  for (const version of versions ?? []) {
    const { data, error: urlError } = await supabase.storage.from("leadhaus-client-files").createSignedUrl(version.storage_path, 600);
    fail(urlError);
    if (data?.signedUrl) urls.set(`${version.creative_id}:${version.version}`, data.signedUrl);
  }
  return (creatives ?? []).map((c) => ({
    id: c.id, title: c.title, format: c.format ?? "", platform: c.platform ?? "", status: c.status,
    decidedBy: c.decided_by ?? undefined, decidedAt: c.decided_at ?? undefined,
    versions: (versions ?? []).filter((v) => v.creative_id === c.id).map((v) => ({ version: v.version, image: urls.get(`${v.creative_id}:${v.version}`) ?? "", createdAt: iso(v.created_at?.slice(0, 10)) })),
    comments: (comments ?? []).filter((m) => m.creative_id === c.id).map((m) => ({ id: m.id, author: m.author_id === user.id ? user.name : "Leadhaus", authorRole: m.author_id === user.id ? "client" as const : "admin" as const, body: m.body, at: m.created_at })),
  }));
}

export async function portalStrategy(user: User): Promise<PortalStrategy | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("strategies").select("title,updated_at,summary,recommendations,plans,goals").eq("client_id", clientId(user)).maybeSingle();
  fail(error);
  if (!data) return null;
  return { title: data.title, updated: iso(data.updated_at?.slice(0, 10)), summary: data.summary ?? "", recommendations: (data.recommendations ?? []) as Strategy["recommendations"], plans: (data.plans ?? []) as Strategy["plans"], goals: (data.goals ?? []) as Strategy["goals"] };
}

export async function portalReports(user: User): Promise<PortalReport[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("reports").select("id,title,cadence,period_start,period_end,summary,highlights").eq("client_id", clientId(user)).eq("status", "Published").order("period_end", { ascending: false });
  fail(error);
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, cadence: r.cadence ?? "Monthly", periodStart: iso(r.period_start), periodEnd: iso(r.period_end), summary: r.summary ?? "", highlights: r.highlights ?? [] }));
}

export async function portalOnboarding(user: User) {
  const supabase = await createServerSupabaseClient();
  const id = clientId(user);
  const [{ data: items, error }, { data: uploads, error: uploadError }] = await Promise.all([
    supabase.from("onboarding_items").select("id,kind,label,detail,done,completed_at").eq("client_id", id).order("id"),
    supabase.from("uploads").select("id,name,size_bytes,uploaded_at,uploaded_by").eq("client_id", id).order("uploaded_at", { ascending: false }),
  ]);
  fail(error); fail(uploadError);
  const mappedItems = (items ?? []).map((o) => ({ id: o.id, kind: o.kind, label: o.label, detail: o.detail ?? "", done: o.done, completedAt: o.completed_at ?? undefined }));
  const done = mappedItems.filter((i) => i.done).length;
  return { items: mappedItems, uploads: (uploads ?? []).map((u) => ({ id: u.id, name: u.name, size: Number(u.size_bytes), uploadedAt: u.uploaded_at, uploadedBy: u.uploaded_by })), pct: mappedItems.length ? Math.round(100 * done / mappedItems.length) : 0 };
}

export async function portalDocuments(user: User): Promise<PortalDocument[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("documents").select("id,title,kind,created_at,storage_path,body").eq("client_id", clientId(user)).eq("client_visible", true).order("created_at", { ascending: false });
  fail(error);
  const results = [];
  for (const d of data ?? []) {
    let fileUrl: string | undefined;
    if (d.storage_path) {
      const { data: signed, error: urlError } = await supabase.storage.from("leadhaus-client-files").createSignedUrl(d.storage_path, 600);
      fail(urlError);
      fileUrl = signed?.signedUrl;
    }
    results.push({ id: d.id, title: d.title, kind: d.kind ?? "Other", date: iso(d.created_at?.slice(0, 10)), body: d.body ?? [], fileUrl });
  }
  return results;
}

export async function portalMessages(user: User) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("messages").select("id,kind,author_name,author_id,body,created_at").eq("client_id", clientId(user)).eq("client_visible", true).order("created_at", { ascending: false });
  fail(error);
  return (data ?? []).map((m) => ({ id: m.id, kind: m.kind, from: m.author_name || (m.author_id === user.id ? user.name : "Leadhaus"), fromRole: m.author_id === user.id ? "client" as const : "admin" as const, body: m.body, at: m.created_at }));
}

export async function portalTasks(user: User) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("tasks").select("id,title,assignee,due,status,link").eq("client_id", clientId(user)).eq("client_visible", true).neq("status", "Done").order("due");
  fail(error);
  return (data ?? []).map((t) => ({ id: t.id, title: t.title, assignee: t.assignee, due: iso(t.due), status: t.status, link: t.link ?? undefined }));
}

export async function portalInvoices(user: User) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("invoices").select("id,number,description,amount,issued,due,status,paid_at,method,client_marked_paid_at").eq("client_id", clientId(user)).order("issued", { ascending: false });
  fail(error);
  return (data ?? []).map((i) => ({ id: i.id, number: i.number, description: i.description ?? "", amount: Number(i.amount), issued: iso(i.issued), due: iso(i.due), status: i.status, paidAt: i.paid_at ?? undefined, method: i.method ?? undefined, clientMarkedPaidAt: i.client_marked_paid_at ?? undefined }));
}

export async function portalInvoice(user: User, invoiceId: string) {
  return (await portalInvoices(user)).find((i) => i.id === invoiceId) ?? null;
}

export async function portalDocument(user: User, documentId: string): Promise<PortalDocument | null> {
  return (await portalDocuments(user)).find((d) => d.id === documentId) ?? null;
}
