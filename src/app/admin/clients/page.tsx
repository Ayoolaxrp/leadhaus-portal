import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/admin";
import Link from "next/link";
import { postClientMessage, createClient } from "@/lib/actions";
import { SERVICES } from "@/lib/data/types";
import { PageHeader, Card, Status, Badge, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { money, date, dateTime } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function Clients() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Clients" sub="Relationship view per account. Fields marked internal never reach the client portal."
        help={["Each box is one client. The yellow Internal box is only visible to the Leadhaus team.", "To reply to a client or post news, type in the Post box and click Post. The client sees it on their Messages page.", "Choose Announcement to show it as a highlighted notice. Tick Internal note only to keep it inside the team.", "Questions marked Needs reply have not been answered yet. Posting a visible message counts as the reply.", "Use Add a client for a new account. It gives them portal access and, if ticked, starts onboarding.", "Click Manage portal to change what this client sees: their pages, progress, goals and onboarding list. Click Open chat for the full conversation."]} />
      <details className="mb-6 rounded-[var(--radius-card)] border border-line bg-surface" open={!db.clients.length}>
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-accent">Add a client</summary>
        <ActionForm action={createClient} success="Client added. They can now sign in to their portal." className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          <div><label htmlFor="nc-name" className="mb-1.5 block text-xs text-muted">Business name</label><input id="nc-name" name="name" className={field} required /></div>
          <div><label htmlFor="nc-contact" className="mb-1.5 block text-xs text-muted">Person who signs in</label><input id="nc-contact" name="contactName" className={field} required /></div>
          <div><label htmlFor="nc-email" className="mb-1.5 block text-xs text-muted">Their email</label><input id="nc-email" name="email" type="email" className={field} required /></div>
          <div><label htmlFor="nc-service" className="mb-1.5 block text-xs text-muted">Service</label><select id="nc-service" name="service" className={field}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label htmlFor="nc-lead" className="mb-1.5 block text-xs text-muted">Account lead</label><select id="nc-lead" name="accountLead" className={field}>{db.users.filter((u) => u.role === "admin").map((u) => <option key={u.id}>{u.name}</option>)}</select></div>
          <div><label htmlFor="nc-fee" className="mb-1.5 block text-xs text-muted">Monthly fee in naira</label><input id="nc-fee" name="monthlyFee" inputMode="numeric" className={field} /></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3"><input type="checkbox" name="startOnboarding" defaultChecked className="accent-[var(--accent)]" /> Start onboarding now (sends their checklist and a welcome message)</label>
          <div className="sm:col-span-2 lg:col-span-3"><button className={btn.primary}>Add client</button></div>
        </ActionForm>
      </details>
      <div className="space-y-6">
        {db.clients.map((c) => {
          const msgs = db.messages.filter((m) => m.clientId === c.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
          const portalUsers = db.users.filter((u) => u.clientId === c.id);
          const ob = db.onboarding.filter((o) => o.clientId === c.id);
          const obPct = ob.length ? Math.round((ob.filter((o) => o.done).length / ob.length) * 100) : 0;
          const files = db.uploads.filter((u) => u.clientId === c.id);
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{c.name}</h2>
                  <p className="text-sm text-muted">{c.service}, led by {c.accountLead}. Renews {date(c.renewalDate, { day: "numeric", month: "short", year: "numeric" })}</p>
                  <p className="mt-1 text-xs text-muted">Portal access: {portalUsers.map((u) => `${u.name} (${u.email})`).join(", ") || "none"}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2"><Status value={c.status} /><Status value={c.health} /></div>
                  <div className="flex gap-2">
                    <Link href={`/admin/inbox?c=${c.id}`} className={btn.small}>Open chat</Link>
                    <Link href={`/admin/clients/${c.id}`} className={`${btn.small} border-accent/60 text-accent`}>Manage portal</Link>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                <dl className="grid grid-cols-2 gap-3 self-start rounded-[var(--radius-ctl)] border border-dashed border-warn/40 p-4 text-sm">
                  <div className="col-span-2 -mb-1"><Badge tone="warn">Internal</Badge></div>
                  <div><dt className="text-xs text-muted">Monthly fee</dt><dd className="num font-medium">{money(c.monthlyFee)}</dd></div>
                  <div><dt className="text-xs text-muted">Margin</dt><dd className="num font-medium">{c.marginPct}%</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-muted">Notes</dt><dd className="mt-0.5 leading-relaxed">{c.internalNotes}</dd></div>
                  <div className="col-span-2 border-t border-line pt-3"><dt className="text-xs text-muted">Onboarding</dt><dd className="num font-medium">{obPct}% complete, {ob.filter((o) => !o.done).length} items left</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-muted">Files the client uploaded</dt><dd>{files.length ? files.map((f) => f.name).join(", ") : "None yet"}</dd></div>
                </dl>

                <div>
                  <h3 className="mb-2 text-xs font-medium text-muted">Recent messages</h3>
                  <ul className="space-y-3">
                    {msgs.map((m) => (
                      <li key={m.id} className="text-sm">
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className="font-medium text-text">{m.from}</span>{m.kind}{m.visibility === "internal" && <Badge tone="warn">Internal</Badge>}{m.kind === "Question" && m.fromRole === "client" && !m.answered && <Badge tone="bad">Needs reply</Badge>}<span className="num">{dateTime(m.at)}</span></p>
                        <p className="mt-0.5 leading-relaxed">{m.body}</p>
                      </li>
                    ))}
                  </ul>
                  <ActionForm action={postClientMessage} success="Posted." className="mt-4 border-t border-line pt-4">
                    <input type="hidden" name="clientId" value={c.id} />
                    <label htmlFor={`msg-${c.id}`} className="mb-1.5 block text-xs text-muted">Post to {c.name}</label>
                    <textarea id={`msg-${c.id}`} name="body" rows={2} className={field} />
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="sr-only" htmlFor={`kind-${c.id}`}>Type</label>
                      <select id={`kind-${c.id}`} name="kind" className="h-10 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-sm">
                        <option>Update</option><option>Announcement</option>
                      </select>
                      <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="internal" className="accent-[var(--accent)]" /> Internal note only</label>
                      <button className={`${btn.primary} ml-auto`}>Post</button>
                    </div>
                  </ActionForm>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
