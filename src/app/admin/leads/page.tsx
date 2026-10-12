import { requireAdmin } from "@/lib/session";
import { getAdminData } from "@/lib/admin-runtime";
import { advanceLead, markLeadLost, addLead } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader, Card, Status, Badge, btn, field } from "@/components/ui";
import { money, moneyShort } from "@/lib/format";

export const metadata = { title: "Leads" };

const stages = ["New Lead", "Contacted", "Qualified", "Call Booked", "Proposal Sent", "Negotiation", "Won", "Lost"] as const;

export default async function Leads({ searchParams }: PageProps<"/admin/leads">) {
  await requireAdmin();
  const db = await getAdminData();
  const q = String((await searchParams).q ?? "").toLowerCase();
  const team = db.users.filter((u) => u.role === "admin");
  const leads = db.leads.filter((l) => !q || `${l.company} ${l.contact} ${l.source} ${l.owner}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Leads"
        sub="Every opportunity from first contact to signed client."
        help={["Type in the search box and click Search to find a lead. Clear the box and search again to see everyone.", "Click Advance to move a lead to the next stage, for example from Contacted to Qualified.", "Click Lost if the lead said no. Lost leads stay in the list so you can learn why deals are lost.", "Use Add a lead to record someone new. HOT, WARM and LOW is how likely they are to sign."]}
        action={
          <form className="flex gap-2" role="search">
            <label htmlFor="q" className="sr-only">Search leads</label>
            <input id="q" name="q" defaultValue={q} placeholder="Search leads" className="h-10 w-full rounded-[var(--radius-ctl)] border border-line bg-surface px-3 text-sm sm:w-60" />
            <button className={btn.secondary}>Search</button>
          </form>
        }
      />
      <details className="mb-6 rounded-[var(--radius-card)] border border-line bg-surface">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-accent">Add a lead</summary>
        <ActionForm action={addLead} success="Lead added. It is at the top of the list." className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          <div><label htmlFor="company" className="mb-1.5 block text-xs text-muted">Company name</label><input id="company" name="company" className={field} required /></div>
          <div><label htmlFor="contact" className="mb-1.5 block text-xs text-muted">Contact person</label><input id="contact" name="contact" className={field} required /></div>
          <div><label htmlFor="value" className="mb-1.5 block text-xs text-muted">Deal value in naira</label><input id="value" name="value" inputMode="numeric" className={field} placeholder="500000" /></div>
          <div><label htmlFor="source" className="mb-1.5 block text-xs text-muted">Where they came from</label><select id="source" name="source" className={field}>{["Website", "Referral", "Instagram", "Meta", "Google", "Outbound", "Other"].map((o) => <option key={o}>{o}</option>)}</select></div>
          <div><label htmlFor="score" className="mb-1.5 block text-xs text-muted">How likely to sign</label><select id="score" name="score" className={field} defaultValue="WARM"><option>HOT</option><option>WARM</option><option>LOW</option></select></div>
          <div><label htmlFor="owner" className="mb-1.5 block text-xs text-muted">Who follows up</label><select id="owner" name="owner" className={field}>{team.map((u) => <option key={u.id}>{u.name}</option>)}</select></div>
          <div className="sm:col-span-2 lg:col-span-3"><button className={btn.primary}>Save lead</button></div>
        </ActionForm>
      </details>
      <div className="mb-6 flex gap-3 overflow-x-auto pb-1">
        {stages.map((s) => {
          const rows = db.leads.filter((l) => l.stage === s);
          return (
            <div key={s} className="min-w-[150px] flex-1 rounded-[var(--radius-ctl)] border border-line bg-surface p-3">
              <p className="text-xs text-muted">{s}</p>
              <p className="num mt-1 font-semibold">{rows.length} <span className="text-xs font-normal text-muted">{moneyShort(rows.reduce((a, l) => a + l.value, 0))}</span></p>
            </div>
          );
        })}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="pb-3 font-normal">Lead</th><th className="pb-3 font-normal">Source</th><th className="pb-3 font-normal">Owner</th><th className="pb-3 font-normal">Score</th><th className="pb-3 font-normal">Stage</th><th className="pb-3 font-normal">Next action</th><th className="pb-3 text-right font-normal">Value</th><th className="pb-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {leads.map((l) => (
              <tr key={l.id}>
                <td className="py-3"><p className="font-medium">{l.company}</p><p className="text-xs text-muted">{l.contact}</p></td>
                <td className="py-3 text-muted">{l.source}</td>
                <td className="py-3 text-muted">{l.owner}</td>
                <td className="py-3"><Badge tone={l.score === "HOT" ? "accent" : l.score === "WARM" ? "warn" : "muted"}>{l.score}</Badge></td>
                <td className="py-3"><Status value={l.stage} /></td>
                <td className="py-3 text-muted">{l.nextAction}</td>
                <td className="num py-3 text-right">{money(l.value)}</td>
                <td className="py-3 pl-3 text-right">
                  {!["Won", "Lost"].includes(l.stage) && (
                    <div className="flex justify-end gap-1.5">
                      <form action={advanceLead}><input type="hidden" name="leadId" value={l.id} /><button className={btn.small}>Advance</button></form>
                      <form action={markLeadLost}><input type="hidden" name="leadId" value={l.id} /><button className={btn.small}>Lost</button></form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!leads.length && <p className="py-6 text-center text-sm text-muted">No leads match &ldquo;{q}&rdquo;.</p>}
      </Card>
    </>
  );
}
