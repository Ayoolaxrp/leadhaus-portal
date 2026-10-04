import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/admin";
import { updateClientPortal, updateProject, updateCampaignStatus, updateGoals, toggleOnboardingItem, addOnboardingItem } from "@/lib/actions";
import { PORTAL_SECTIONS } from "@/lib/data/types";
import { PageHeader, Card, SectionTitle, Progress, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { date } from "@/lib/format";

export const metadata = { title: "Manage portal" };

const sectionLabels: Record<(typeof PORTAL_SECTIONS)[number], string> = {
  projects: "Projects", creative: "Creative approval", strategy: "Strategy", reports: "Reports",
  onboarding: "Onboarding", documents: "Documents", messages: "Messages", billing: "Billing",
};
const select = "h-9 rounded-[var(--radius-ctl)] border border-line bg-bg px-2.5 text-sm";

export default async function ManageClient({ params }: PageProps<"/admin/clients/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const c = db.clients.find((x) => x.id === id);
  if (!c) notFound();
  const team = db.users.filter((u) => u.role === "admin");
  const projects = db.projects.filter((p) => p.clientId === c.id);
  const campaigns = db.campaigns.filter((x) => x.clientId === c.id);
  const strategy = db.strategies.find((s) => s.clientId === c.id);
  const onboarding = db.onboarding.filter((o) => o.clientId === c.id);
  const contact = db.users.find((u) => u.clientId === c.id);

  return (
    <>
      <Link href="/admin/clients" className="mb-4 inline-block text-sm text-accent hover:underline">Back to clients</Link>
      <PageHeader
        title={`Manage ${c.name}`}
        sub={`Everything here changes what ${contact?.name ?? "the client"} sees in their portal, straight away.`}
        help={[
          "Each box has its own Save button. Only that box is saved.",
          "Portal pages: untick a page to hide it from this client. Their menu updates and the page stops opening.",
          "Projects: type the new progress (0 to 100), change any deliverable status, or add a new deliverable, then click Save project.",
          "Onboarding: click an item to tick or untick it for the client. Use Ask the client for something to add a new item to their list and their dashboard.",
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Portal settings</SectionTitle>
          <ActionForm action={updateClientPortal} success="Saved. The client sees this now.">
            <input type="hidden" name="clientId" value={c.id} />
            <label htmlFor="accountLead" className="mb-1.5 block text-xs font-medium text-muted">Account lead</label>
            <select id="accountLead" name="accountLead" defaultValue={c.accountLead} className={`${field} mb-4`}>
              {team.map((u) => <option key={u.id}>{u.name}</option>)}
            </select>
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted">Pages the client can open</legend>
              <div className="grid grid-cols-2 gap-2">
                {PORTAL_SECTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2 text-sm">
                    <input type="checkbox" name={`section_${s}`} defaultChecked={c.sections[s]} className="accent-[var(--accent)]" />
                    {sectionLabels[s]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="welcomeNote" className="mt-4 mb-1.5 block text-xs font-medium text-muted">Note on their dashboard</label>
            <textarea id="welcomeNote" name="welcomeNote" rows={2} maxLength={500} defaultValue={c.welcomeNote} className={field} placeholder="For example: Great month so far. Let us catch up on Friday." />
            <p className="mt-1 text-xs text-muted/80">Leave empty to show nothing.</p>
            <button className={`${btn.primary} mt-4`}>Save portal settings</button>
          </ActionForm>
        </Card>

        <Card>
          <SectionTitle>Campaign status</SectionTitle>
          {campaigns.length ? (
            <ul className="divide-y divide-line">
              {campaigns.map((cp) => (
                <li key={cp.id} className="py-3 first:pt-0">
                  <ActionForm action={updateCampaignStatus} success="Status updated." className="flex flex-wrap items-center justify-between gap-3">
                    <input type="hidden" name="campaignId" value={cp.id} />
                    <div className="min-w-0"><p className="text-sm font-medium">{cp.name}</p><p className="text-xs text-muted">{cp.platform}</p></div>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`st-${cp.id}`} className="sr-only">Status for {cp.name}</label>
                      <select id={`st-${cp.id}`} name="status" defaultValue={cp.status} className={select}>
                        {["Planning", "Awaiting Approval", "Live", "Optimising", "Paused", "Completed"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button className={btn.small}>Save</button>
                    </div>
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No campaigns yet.</p>}
        </Card>
      </div>

      <h2 className="mt-10 mb-3 text-[15px] font-semibold">Projects and progress</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {projects.map((p) => (
          <Card key={p.id}>
            <ActionForm action={updateProject} success="Project saved. The client sees the new progress now.">
              <input type="hidden" name="projectId" value={p.id} />
              <p className="font-semibold">{p.name}</p>
              <div className="my-4"><Progress value={p.progress} label="Current progress" /></div>
              <label htmlFor={`pr-${p.id}`} className="mb-1.5 block text-xs font-medium text-muted">New progress, 0 to 100</label>
              <input id={`pr-${p.id}`} name="progress" type="number" min={0} max={100} defaultValue={p.progress} className={`${field} w-32`} />
              <h3 className="mt-5 mb-2 text-xs font-medium text-muted">Deliverables</h3>
              <ul className="space-y-2">
                {p.deliverables.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <label htmlFor={`dl-${d.id}`} className="min-w-0 flex-1">{d.title}<span className="num block text-xs text-muted">Due {date(d.due)}</span></label>
                    <select id={`dl-${d.id}`} name={`deliverable_${d.id}`} defaultValue={d.status} className={select}>
                      {["Planned", "In progress", "Client review", "Delivered"].map((s) => <option key={s}>{s}</option>)}
                    </select>
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
        {!projects.length && <p className="text-sm text-muted">No projects yet.</p>}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Goals and KPIs</SectionTitle>
          {strategy ? (
            <ActionForm action={updateGoals} success="Goals saved.">
              <input type="hidden" name="clientId" value={c.id} />
              <div className="space-y-3">
                {strategy.goals.map((g, i) => (
                  <fieldset key={g.label} className="grid grid-cols-[1fr_6.5rem_6.5rem] items-end gap-2">
                    <legend className="sr-only">{g.label}</legend>
                    <p className="pb-2 text-sm">{g.label}</p>
                    <div><label htmlFor={`cur-${i}`} className="mb-1 block text-[11px] text-muted">Now</label><input id={`cur-${i}`} name={`current_${i}`} inputMode="decimal" defaultValue={g.current} className={field} /></div>
                    <div><label htmlFor={`tgt-${i}`} className="mb-1 block text-[11px] text-muted">Target</label><input id={`tgt-${i}`} name={`target_${i}`} inputMode="decimal" defaultValue={g.target} className={field} /></div>
                  </fieldset>
                ))}
              </div>
              <button className={`${btn.primary} mt-4`}>Save goals</button>
            </ActionForm>
          ) : <p className="text-sm text-muted">No strategy yet.</p>}
        </Card>

        <Card>
          <SectionTitle>Onboarding checklist</SectionTitle>
          <ul className="space-y-1">
            {onboarding.map((o) => (
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
          <details className="mt-4 rounded-[var(--radius-ctl)] border border-line">
            <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-accent">Ask the client for something</summary>
            <ActionForm action={addOnboardingItem} success="Added to their onboarding list and dashboard." className="grid gap-3 px-4 pb-4">
              <input type="hidden" name="clientId" value={c.id} />
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
      </div>
    </>
  );
}
