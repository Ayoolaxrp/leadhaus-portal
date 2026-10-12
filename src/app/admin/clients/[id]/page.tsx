import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/session";
import { getAdminData } from "@/lib/admin-runtime";
import {
  updateClientPortal, updateProject, updateCampaignStatus, updateGoals, toggleOnboardingItem, addOnboardingItem,
  startOnboarding, setOnboardingStage, sendOnboardingReminder, applyChecklistTemplate, setClientStatus,
  addProject, addCampaign, addCreative, addCreativeVersion, replyOnCreative, shareCreative,
  createReport, logWeeklyMetrics, publishReport, updateStrategy, shareDocument, toggleDocument,
} from "@/lib/actions";
import { PORTAL_SECTIONS, ONBOARDING_STAGES } from "@/lib/data/types";
import { PageHeader, Card, SectionTitle, Progress, Status, Badge, Empty, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { StageTracker } from "@/components/stage-tracker";
import { date, money } from "@/lib/format";

export const metadata = { title: "Manage portal" };

const sectionLabels: Record<(typeof PORTAL_SECTIONS)[number], string> = {
  projects: "Projects", creative: "Creative approval", strategy: "Strategy", reports: "Reports",
  onboarding: "Onboarding", documents: "Documents", messages: "Messages", billing: "Billing",
};
const select = "h-9 rounded-[var(--radius-ctl)] border border-line bg-bg px-2.5 text-sm";
const label = "mb-1.5 block text-xs font-medium text-muted";

const TABS = [
  { id: "overview", label: "Overview", shows: "their menu, dashboard and account" },
  { id: "onboarding", label: "Onboarding", shows: "their Onboarding page and dashboard" },
  { id: "projects", label: "Projects", shows: "their Projects page and dashboard" },
  { id: "creative", label: "Creatives", shows: "their Creative approval page" },
  { id: "reports", label: "Reports and numbers", shows: "their Reports page and dashboard numbers" },
  { id: "strategy", label: "Strategy", shows: "their Strategy page" },
  { id: "documents", label: "Documents", shows: "their Documents page" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const add = "cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-accent";

export default async function ManageClient({ params, searchParams }: PageProps<"/admin/clients/[id]">) {
  await requireAdmin();
  const db = await getAdminData();
  const { id } = await params;
  const sp = await searchParams;
  const c = db.clients.find((x) => x.id === id);
  if (!c) notFound();
  const tab: Tab = (TABS.find((t) => t.id === sp.tab)?.id ?? "overview") as Tab;
  const current = TABS.find((t) => t.id === tab)!;
  const team = db.users.filter((u) => u.role === "admin");
  const contact = db.users.find((u) => u.clientId === c.id);
  const who = contact?.name.split(" ")[0] ?? "the client";
  const hidden = (s: (typeof PORTAL_SECTIONS)[number]) => !c.sections[s] && <p className="mb-4 rounded-[var(--radius-ctl)] border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">This page is switched off for {c.name}. Turn it on in Overview so they can see it.</p>;

  return (
    <>
      <Link href="/admin/clients" className="mb-4 inline-block text-sm text-accent hover:underline">Back to clients</Link>
      <PageHeader
        title={`Manage ${c.name}`}
        sub={`${c.service}, ${c.status.toLowerCase()}. Everything here changes what ${contact?.name ?? "the client"} sees, straight away.`}
        help={[
          "The tabs match the pages in the client portal. Each tab says which of their pages it changes.",
          "Every box has its own Save button. Only that box is saved.",
          "New client? Open Onboarding and click Start onboarding. They get the checklist for their service, a welcome message and a to-do on their dashboard.",
        ]}
      />

      <nav aria-label="Client sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/clients/${c.id}?tab=${t.id}`} aria-current={t.id === tab ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition ${t.id === tab ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="mb-6 text-xs text-muted">Changes here show on {current.shows}.</p>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle>Portal settings</SectionTitle>
            <ActionForm action={updateClientPortal} success="Saved. The client sees this now.">
              <input type="hidden" name="clientId" value={c.id} />
              <label htmlFor="accountLead" className={label}>Account lead</label>
              <select id="accountLead" name="accountLead" defaultValue={c.accountLead} className={`${field} mb-4`}>{team.map((u) => <option key={u.id}>{u.name}</option>)}</select>
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-muted">Pages the client can open</legend>
                <div className="grid grid-cols-2 gap-2">
                  {PORTAL_SECTIONS.map((s) => (
                    <label key={s} className="flex items-center gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2 text-sm">
                      <input type="checkbox" name={`section_${s}`} defaultChecked={c.sections[s]} className="accent-[var(--accent)]" />{sectionLabels[s]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label htmlFor="welcomeNote" className={`${label} mt-4`}>Note on their dashboard</label>
              <textarea id="welcomeNote" name="welcomeNote" rows={2} maxLength={500} defaultValue={c.welcomeNote} className={field} placeholder="For example: Great month so far. Let us catch up on Friday." />
              <p className="mt-1 text-xs text-muted/80">Leave empty to show nothing.</p>
              <button className={`${btn.primary} mt-4`}>Save portal settings</button>
            </ActionForm>
          </Card>
          <div className="grid content-start gap-6">
            <Card>
              <SectionTitle>Client status</SectionTitle>
              <ActionForm action={setClientStatus} success="Status saved." className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="clientId" value={c.id} />
                <div><label htmlFor="cstatus" className={label}>Status</label>
                  <select id="cstatus" name="status" defaultValue={c.status} className={field}>{["Onboarding", "Active", "Paused", "Completed", "Churned"].map((s) => <option key={s}>{s}</option>)}</select></div>
                <button className={btn.secondary}>Save status</button>
              </ActionForm>
            </Card>
            <Card>
              <SectionTitle>Portal access</SectionTitle>
              {contact ? <p className="text-sm">{contact.name}, {contact.email}</p> : <p className="text-sm text-muted">No one has portal access yet.</p>}
              <p className="mt-2 text-xs text-muted">In this demo they sign in from the sign in page. With real logins they get an email link.</p>
              <div className="mt-4 flex gap-2"><Link href={`/admin/inbox?c=${c.id}`} className={btn.small}>Open chat</Link></div>
            </Card>
          </div>
        </div>
      )}

      {tab === "onboarding" &&          <OnboardingTab clientId={c.id} who={who} hidden={hidden("onboarding")} db={db} />}

      {tab === "projects" && (
        <>
          {hidden("projects")}
          <div className="grid gap-6 lg:grid-cols-2">
            {db.projects.filter((p) => p.clientId === c.id).map((p) => (
              <Card key={p.id}>
                <ActionForm action={updateProject} success="Project saved. The client sees the new progress now.">
                  <input type="hidden" name="projectId" value={p.id} />
                  <p className="font-semibold">{p.name}</p>
                  <div className="my-4"><Progress value={p.progress} label="Current progress" /></div>
                  <label htmlFor={`pr-${p.id}`} className={label}>New progress, 0 to 100</label>
                  <input id={`pr-${p.id}`} name="progress" type="number" min={0} max={100} defaultValue={p.progress} className={`${field} w-32`} />
                  {p.deliverables.length > 0 && <h3 className="mt-5 mb-2 text-xs font-medium text-muted">Deliverables</h3>}
                  <ul className="space-y-2">
                    {p.deliverables.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <label htmlFor={`dl-${d.id}`} className="min-w-0 flex-1">{d.title}<span className="num block text-xs text-muted">Due {date(d.due)}</span></label>
                        <select id={`dl-${d.id}`} name={`deliverable_${d.id}`} defaultValue={d.status} className={select}>{["Planned", "In progress", "Client review", "Delivered"].map((s) => <option key={s}>{s}</option>)}</select>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto]">
                    <div><label htmlFor={`nd-${p.id}`} className="mb-1.5 block text-xs text-muted">Add a deliverable (optional)</label><input id={`nd-${p.id}`} name="newDeliverable" className={field} /></div>
                    <div><label htmlFor={`ndd-${p.id}`} className="mb-1.5 block text-xs text-muted">Due date</label><input id={`ndd-${p.id}`} name="newDeliverableDue" type="date" className={field} /></div>
                  </div>
                  <button className={`${btn.primary} mt-4`}>Save project</button>
                </ActionForm>
              </Card>
            ))}
            <Card className="content-start">
              <SectionTitle>Start a new project</SectionTitle>
              <ActionForm action={addProject} success="Project added. It is on their Projects page now." className="grid gap-3">
                <input type="hidden" name="clientId" value={c.id} />
                <div><label htmlFor="np-name" className={label}>Project name</label><input id="np-name" name="name" className={field} required /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label htmlFor="np-type" className={label}>Type</label><select id="np-type" name="type" defaultValue={c.service} className={field}>{["Ads Management", "Influencer Campaign", "Creative Production", "Funnel or Landing Page", "Strategy and Audit"].map((s) => <option key={s}>{s}</option>)}</select></div>
                  <div><label htmlFor="np-end" className={label}>End date</label><input id="np-end" name="end" type="date" className={field} required /></div>
                </div>
                <div><button className={btn.primary}>Add project</button></div>
              </ActionForm>
            </Card>
          </div>

          <Card className="mt-6">
            <SectionTitle>Campaigns</SectionTitle>
            <ul className="divide-y divide-line">
              {db.campaigns.filter((x) => x.clientId === c.id).map((cp) => (
                <li key={cp.id} className="py-3 first:pt-0">
                  <ActionForm action={updateCampaignStatus} success="Status updated." className="flex flex-wrap items-center justify-between gap-3">
                    <input type="hidden" name="campaignId" value={cp.id} />
                    <div className="min-w-0"><p className="text-sm font-medium">{cp.name}</p><p className="text-xs text-muted">{cp.platform}, {money(cp.monthlyBudget)} a month</p></div>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`st-${cp.id}`} className="sr-only">Status for {cp.name}</label>
                      <select id={`st-${cp.id}`} name="status" defaultValue={cp.status} className={select}>{["Planning", "Awaiting Approval", "Live", "Optimising", "Paused", "Completed"].map((s) => <option key={s}>{s}</option>)}</select>
                      <button className={btn.small}>Save</button>
                    </div>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <details className="mt-4 rounded-[var(--radius-ctl)] border border-line">
              <summary className={add}>Add a campaign</summary>
              <ActionForm action={addCampaign} success="Campaign added." className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
                <input type="hidden" name="clientId" value={c.id} />
                <div className="sm:col-span-3"><label htmlFor="cp-name" className={label}>Campaign name</label><input id="cp-name" name="name" className={field} required /></div>
                <div><label htmlFor="cp-platform" className={label}>Platform</label><select id="cp-platform" name="platform" className={field}>{["Meta", "Google Search", "TikTok", "Instagram + TikTok", "LinkedIn"].map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label htmlFor="cp-objective" className={label}>Goal</label><select id="cp-objective" name="objective" className={field}>{["Leads", "Sales", "Conversions", "Awareness"].map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label htmlFor="cp-budget" className={label}>Monthly budget in naira</label><input id="cp-budget" name="budget" inputMode="numeric" className={field} /></div>
                <div><label htmlFor="cp-start" className={label}>Start date</label><input id="cp-start" name="start" type="date" className={field} required /></div>
                <div><label htmlFor="cp-end" className={label}>End date</label><input id="cp-end" name="end" type="date" className={field} required /></div>
                <div className="sm:col-span-3"><button className={btn.primary}>Add campaign</button></div>
              </ActionForm>
            </details>
          </Card>
        </>
      )}

      {tab === "creative" && (
        <>
          {hidden("creative")}
          <details className="mb-6 rounded-[var(--radius-card)] border border-line bg-surface">
            <summary className={add}>Add a creative</summary>
            <ActionForm action={addCreative} success="Creative added." className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
              <input type="hidden" name="clientId" value={c.id} />
              <div><label htmlFor="cr-title" className={label}>Name</label><input id="cr-title" name="title" className={field} required /></div>
              <div><label htmlFor="cr-format" className={label}>Format</label><select id="cr-format" name="format" className={field}>{["Static 1:1", "Static 4:5", "Video 9:16", "Carousel 1:1"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label htmlFor="cr-platform" className={label}>Where it runs</label><select id="cr-platform" name="platform" className={field}>{["Meta feed", "Instagram Reels + Meta", "TikTok", "Google Display"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <p className="text-xs text-muted sm:col-span-3">The demo uses a sample picture. With file storage connected you upload the real file here.</p>
              <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="sendNow" className="accent-[var(--accent)]" defaultChecked /> Send to the client for approval now</label>
              <div className="sm:col-span-3"><button className={btn.primary}>Add creative</button></div>
            </ActionForm>
          </details>
          <div className="grid gap-6 xl:grid-cols-2">
            {db.creatives.filter((x) => x.clientId === c.id).map((cr) => {
              const latest = cr.versions[cr.versions.length - 1];
              return (
                <Card key={cr.id} className="grid gap-4 sm:grid-cols-[120px_1fr]">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-ctl)] bg-surface-2">
                    <Image src={latest.image} alt={`${cr.title}, version ${latest.version}`} fill sizes="120px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2"><p className="font-semibold">{cr.title}</p><Status value={cr.status} /></div>
                    <p className="text-xs text-muted">{cr.format}, version {latest.version}</p>
                    <ul className="mt-3 max-h-36 space-y-2 overflow-y-auto text-sm">
                      {cr.comments.map((m) => (
                        <li key={m.id}><span className="text-xs text-muted">{m.author}{m.internal && " (internal)"}: </span>{m.body}</li>
                      ))}
                      {!cr.comments.length && <li className="text-xs text-muted">No comments yet.</li>}
                    </ul>
                    <ActionForm action={replyOnCreative} success="Comment posted." className="mt-3">
                      <input type="hidden" name="creativeId" value={cr.id} />
                      <label htmlFor={`rc-${cr.id}`} className="sr-only">Comment on {cr.title}</label>
                      <div className="flex gap-2"><input id={`rc-${cr.id}`} name="body" className={field} placeholder={`Reply to ${who}`} /><button className={btn.small}>Post</button></div>
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="internal" className="accent-[var(--accent)]" /> Internal note only</label>
                    </ActionForm>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      {cr.status === "Internal review" && <form action={shareCreative}><input type="hidden" name="creativeId" value={cr.id} /><button className={btn.small}>Send to client</button></form>}
                      {cr.status !== "Internal review" && (
                        <ActionForm action={addCreativeVersion} success="New version sent for review.">
                          <input type="hidden" name="creativeId" value={cr.id} />
                          <button className={btn.small}>Upload new version</button>
                        </ActionForm>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === "reports" && <ReportsTab clientId={c.id} hidden={hidden("reports")} db={db} />}

      {tab === "strategy" && <StrategyTab clientId={c.id} hidden={hidden("strategy")} db={db} />}

      {tab === "documents" && (
        <>
          {hidden("documents")}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="divide-y divide-line p-0">
              {db.documents.filter((d) => d.clientId === c.id).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{d.title}</p><p className="text-xs text-muted">{d.kind}, {date(d.date)}</p></div>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.visibility === "client" ? <Badge tone="good">Client can see</Badge> : <Badge tone="warn">Internal</Badge>}
                    <form action={toggleDocument}><input type="hidden" name="documentId" value={d.id} /><button className={btn.small}>{d.visibility === "client" ? "Hide" : "Share"}</button></form>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <SectionTitle>Share a document</SectionTitle>
              <ActionForm action={shareDocument} success="Document shared. It is on their Documents page now." className="grid gap-3">
                <input type="hidden" name="clientId" value={c.id} />
                <div><label htmlFor="doc-title" className={label}>Title</label><input id="doc-title" name="title" className={field} required /></div>
                <div><label htmlFor="doc-kind" className={label}>Type</label><select id="doc-kind" name="kind" className={field}>{["Contract", "Proposal", "Invoice", "Report", "Brand", "Other"].map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label htmlFor="doc-body" className={label}>Text (one paragraph per line)</label><textarea id="doc-body" name="body" rows={5} className={field} required /></div>
                <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="internal" className="accent-[var(--accent)]" /> Keep it internal for now</label>
                <div><button className={btn.primary}>Share document</button></div>
              </ActionForm>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function OnboardingTab({ clientId, who, hidden, db }: { clientId: string; who: string; hidden: React.ReactNode; db: Awaited<ReturnType<typeof getAdminData>> }) {
  const c = db.clients.find((x) => x.id === clientId)!;
  const items = db.onboarding.filter((o) => o.clientId === clientId);
  const open = items.filter((o) => !o.done).length;
  return (
    <>
      {hidden}
      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Onboarding stage</SectionTitle>
          {c.onboardingStage === "Not Started" && (
            <ActionForm action={startOnboarding} success="Onboarding started. They have their checklist and a welcome message.">
              <input type="hidden" name="clientId" value={clientId} />
              <button className={btn.primary}>Start onboarding</button>
            </ActionForm>
          )}
        </div>
        <StageTracker stage={c.onboardingStage} />
        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <ActionForm action={setOnboardingStage} success="Stage saved. The client sees it now." className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="clientId" value={clientId} />
            <div><label htmlFor="stage" className={label}>Move to stage</label>
              <select id="stage" name="stage" defaultValue={c.onboardingStage} className={field}>{ONBOARDING_STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <button className={btn.secondary}>Save stage</button>
          </ActionForm>
          <ActionForm action={sendOnboardingReminder} success={`Reminder sent to ${who}.`}>
            <input type="hidden" name="clientId" value={clientId} />
            <button className={btn.secondary} disabled={!open}>Send a reminder ({open} left)</button>
          </ActionForm>
        </div>
        <p className="mt-3 text-xs text-muted">Moving to Complete marks the client Active and sends them a thank-you announcement.</p>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Checklist</SectionTitle>
          <ActionForm action={applyChecklistTemplate} success="Checklist items added.">
            <input type="hidden" name="clientId" value={clientId} />
            <button className={btn.small}>Add the {c.service} checklist</button>
          </ActionForm>
        </div>
        {items.length ? (
          <ul className="grid gap-1 sm:grid-cols-2">
            {items.map((o) => (
              <li key={o.id}>
                <form action={toggleOnboardingItem}>
                  <input type="hidden" name="itemId" value={o.id} />
                  <button className="flex w-full items-center gap-3 rounded-[var(--radius-ctl)] px-2 py-2 text-left text-sm hover:bg-surface-2" aria-label={`${o.done ? "Untick" : "Tick"} ${o.label}`}>
                    {o.done ? <CheckCircle size={18} weight="fill" className="shrink-0 text-good" aria-hidden /> : <Circle size={18} className="shrink-0 text-muted" aria-hidden />}
                    <span className={o.done ? "text-muted" : ""}>{o.label}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : <Empty title="No checklist yet" body="Click Start onboarding, or add the checklist for their service." />}
        <details className="mt-4 rounded-[var(--radius-ctl)] border border-line">
          <summary className={add}>Ask the client for something</summary>
          <ActionForm action={addOnboardingItem} success="Added to their onboarding list and dashboard." className="grid gap-3 px-4 pb-4">
            <input type="hidden" name="clientId" value={clientId} />
            <div><label htmlFor="ob-label" className="mb-1.5 block text-xs text-muted">What you need</label><input id="ob-label" name="label" className={field} placeholder="For example: TikTok Business Center access" required /></div>
            <div><label htmlFor="ob-detail" className="mb-1.5 block text-xs text-muted">Short explanation (optional)</label><input id="ob-detail" name="detail" className={field} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label htmlFor="ob-kind" className="mb-1.5 block text-xs text-muted">Type</label><select id="ob-kind" name="kind" className={field}><option value="info">Information</option><option value="access">Account access</option><option value="asset">Files</option></select></div>
              <div><label htmlFor="ob-due" className="mb-1.5 block text-xs text-muted">Due date</label><input id="ob-due" name="due" type="date" className={field} /></div>
            </div>
            <div><button className={btn.primary}>Add to their list</button></div>
          </ActionForm>
        </details>
      </Card>
    </>
  );
}

function ReportsTab({ clientId, hidden, db }: { clientId: string; hidden: React.ReactNode; db: Awaited<ReturnType<typeof getAdminData>> }) {
  const reports = db.reports.filter((r) => r.clientId === clientId).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  const weeks = db.metrics.filter((m) => m.clientId === clientId).slice(-4);
  return (
    <>
      {hidden}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Log this week&apos;s numbers</SectionTitle>
          <p className="mb-4 text-xs text-muted">These drive the numbers and charts on their dashboard and Reports page. Logging the same week again replaces it.</p>
          <ActionForm action={logWeeklyMetrics} success="Numbers saved. Their dashboard is updated." className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="clientId" value={clientId} />
            <div><label htmlFor="wk" className={label}>Week starting</label><input id="wk" name="weekStart" type="date" className={field} required /></div>
            <div><label htmlFor="wk-spend" className={label}>Ad spend in naira</label><input id="wk-spend" name="spend" inputMode="numeric" className={field} required /></div>
            <div><label htmlFor="wk-leads" className={label}>Leads</label><input id="wk-leads" name="leads" inputMode="numeric" className={field} required /></div>
            <div><label htmlFor="wk-rev" className={label}>Revenue in naira</label><input id="wk-rev" name="revenue" inputMode="numeric" className={field} required /></div>
            <div className="sm:col-span-2"><button className={btn.primary}>Save numbers</button></div>
          </ActionForm>
          {weeks.length > 0 && (
            <table className="mt-5 w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="pb-2 font-normal">Week</th><th className="pb-2 text-right font-normal">Spend</th><th className="pb-2 text-right font-normal">Leads</th><th className="pb-2 text-right font-normal">Revenue</th></tr></thead>
              <tbody className="divide-y divide-line">{weeks.map((w) => <tr key={w.weekStart}><td className="num py-2">{date(w.weekStart)}</td><td className="num py-2 text-right">{money(w.spend)}</td><td className="num py-2 text-right">{w.leads}</td><td className="num py-2 text-right">{money(w.revenue)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
        <Card>
          <SectionTitle>Write a report</SectionTitle>
          <ActionForm action={createReport} success="Report saved." className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="clientId" value={clientId} />
            <div className="sm:col-span-2"><label htmlFor="rp-title" className={label}>Title</label><input id="rp-title" name="title" className={field} placeholder="October performance report" required /></div>
            <div><label htmlFor="rp-start" className={label}>From</label><input id="rp-start" name="periodStart" type="date" className={field} required /></div>
            <div><label htmlFor="rp-end" className={label}>To</label><input id="rp-end" name="periodEnd" type="date" className={field} required /></div>
            <div><label htmlFor="rp-cadence" className={label}>Type</label><select id="rp-cadence" name="cadence" className={field}><option>Monthly</option><option>Weekly</option></select></div>
            <div className="sm:col-span-2"><label htmlFor="rp-summary" className={label}>Summary</label><textarea id="rp-summary" name="summary" rows={3} className={field} required /></div>
            <div className="sm:col-span-2"><label htmlFor="rp-hl" className={label}>Highlights (one per line)</label><textarea id="rp-hl" name="highlights" rows={3} className={field} /></div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="publish" className="accent-[var(--accent)]" /> Publish to the client now</label>
            <div className="sm:col-span-2"><button className={btn.primary}>Save report</button></div>
          </ActionForm>
        </Card>
      </div>
      <Card className="mt-6">
        <SectionTitle>Reports</SectionTitle>
        <ul className="divide-y divide-line">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0"><p className="truncate">{r.title}</p><p className="num text-xs text-muted">{date(r.periodStart)} to {date(r.periodEnd)}</p></div>
              {r.status === "Draft" ? <form action={publishReport}><input type="hidden" name="reportId" value={r.id} /><button className={btn.small}>Publish</button></form> : <Status value={r.status} />}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function StrategyTab({ clientId, hidden, db }: { clientId: string; hidden: React.ReactNode; db: Awaited<ReturnType<typeof getAdminData>> }) {
  const s = db.strategies.find((x) => x.clientId === clientId);
  return (
    <>
      {hidden}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <SectionTitle>Strategy</SectionTitle>
          <ActionForm action={updateStrategy} success="Strategy saved." className="grid gap-3">
            <input type="hidden" name="clientId" value={clientId} />
            <div><label htmlFor="sg-title" className={label}>Title</label><input id="sg-title" name="title" defaultValue={s?.title} className={field} /></div>
            <div><label htmlFor="sg-summary" className={label}>Summary</label><textarea id="sg-summary" name="summary" rows={3} defaultValue={s?.summary} className={field} /></div>
            <div><label htmlFor="sg-rec" className={label}>Recommendations (one per line, Title: detail)</label>
              <textarea id="sg-rec" name="recommendations" rows={4} defaultValue={s?.recommendations.map((r) => `${r.title}: ${r.detail}`).join("\n")} className={field} /></div>
            <div><label htmlFor="sg-plans" className={label}>Campaign plan (one per line, Name | When | Detail)</label>
              <textarea id="sg-plans" name="plans" rows={3} defaultValue={s?.plans.map((p) => `${p.name} | ${p.window} | ${p.detail}`).join("\n")} className={field} /></div>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div><label htmlFor="sg-goal" className={label}>Add a goal (optional)</label><input id="sg-goal" name="newGoal" className={field} placeholder="Booked consultations" /></div>
              <div><label htmlFor="sg-goal-t" className={label}>Target</label><input id="sg-goal-t" name="newGoalTarget" inputMode="numeric" className={field} /></div>
            </div>
            <div><button className={btn.primary}>Save strategy</button></div>
          </ActionForm>
        </Card>
        <Card>
          <SectionTitle>Goals and KPIs</SectionTitle>
          {s && s.goals.length ? (
            <ActionForm action={updateGoals} success="Goals saved.">
              <input type="hidden" name="clientId" value={clientId} />
              <div className="space-y-3">
                {s.goals.map((g, i) => (
                  <fieldset key={g.label} className="grid grid-cols-[1fr_6rem_6rem] items-end gap-2">
                    <legend className="sr-only">{g.label}</legend>
                    <p className="pb-2 text-sm">{g.label}</p>
                    <div><label htmlFor={`cur-${i}`} className="mb-1 block text-[11px] text-muted">Now</label><input id={`cur-${i}`} name={`current_${i}`} inputMode="decimal" defaultValue={g.current} className={field} /></div>
                    <div><label htmlFor={`tgt-${i}`} className="mb-1 block text-[11px] text-muted">Target</label><input id={`tgt-${i}`} name={`target_${i}`} inputMode="decimal" defaultValue={g.target} className={field} /></div>
                  </fieldset>
                ))}
              </div>
              <button className={`${btn.primary} mt-4`}>Save goals</button>
            </ActionForm>
          ) : <Empty title="No goals yet" body="Add one with the Add a goal box." />}
        </Card>
      </div>
    </>
  );
}
