import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { adminOverview, getAdminData } from "@/lib/admin-runtime";
import { PageHeader, Card, SectionTitle, Stat, Status, Empty } from "@/components/ui";
import { moneyShort, date, dateTime, greeting } from "@/lib/format";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  const me = await requireAdmin();
  const [o, db] = await Promise.all([adminOverview(), getAdminData()]);
  const clientName = (id: string) => db.clients.find((client) => client.id === id)?.name ?? id;
  const due = db.tasks.filter((t) => t.status !== "Done" && t.assignee === "agency").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
  const attention = [
    ...db.creatives.filter((c) => c.status === "Revision requested").map((c) => ({ k: c.id, text: `${db.clients.find((client) => client.id === c.clientId)?.name ?? c.clientId} asked for changes on ${c.title}`, href: "/admin/delivery" })),
    ...db.messages.filter((m) => m.kind === "Question" && m.fromRole === "client" && !m.answered).map((m) => ({ k: m.id, text: `${m.from} asked: ${m.body}`, href: `/admin/inbox?c=${m.clientId}` })),
    ...db.invoices.filter((i) => i.clientMarkedPaidAt && i.status !== "Paid").map((i) => ({ k: `${i.id}-sent`, text: `${db.clients.find((client) => client.id === i.clientId)?.name ?? i.clientId} says ${i.number} is paid. Check the bank and confirm.`, href: "/admin/finance" })),
    ...db.invoices.filter((i) => i.status === "Overdue").map((i) => ({ k: i.id, text: `${i.number} for ${db.clients.find((client) => client.id === i.clientId)?.name ?? i.clientId} is overdue`, href: "/admin/finance" })),
    ...db.reports.filter((r) => r.status === "Draft").map((r) => ({ k: r.id, text: `${r.title} for ${db.clients.find((client) => client.id === r.clientId)?.name ?? r.clientId} is still a draft`, href: "/admin/delivery" })),
  ];

  return (
    <>
      <PageHeader title={`${greeting()}, ${me.name}.`} sub="Agency numbers, what needs a reply and what is due."
        help={["The four numbers are the agency money picture. Only the Leadhaus team can see this page.", "Needs attention lists client questions without a reply, change requests, payments to confirm and draft reports. Click any line to go and deal with it.", "Recent activity shows everything clients and the team have done, newest first."]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Monthly recurring revenue" value={moneyShort(o.mrr)} note={`${o.activeClients} active clients`} />
        <Stat label="Estimated profit" value={moneyShort(o.estimatedProfit)} note={`After ${moneyShort(o.collaboratorCost)} collaborator costs`} />
        <Stat label="Pipeline" value={moneyShort(o.pipelineValue)} note={`${o.openLeads} open leads`} />
        <Stat label="Outstanding invoices" value={moneyShort(o.outstandingTotal)} note={`${o.outstandingCount} invoices`} tone={o.outstandingCount ? "bad" : "muted"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <SectionTitle>Needs attention</SectionTitle>
          {attention.length ? (
            <ul className="divide-y divide-line">
              {attention.map((a) => <li key={a.k}><Link href={a.href} className="block py-3 text-sm hover:text-accent">{a.text}</Link></li>)}
            </ul>
          ) : <Empty title="Nothing waiting" body="Client questions, change requests and overdue invoices land here." />}
        </Card>
        <Card>
          <SectionTitle aside={<Link href="/admin/delivery" className="text-xs text-accent hover:underline">Delivery</Link>}>Agency tasks due</SectionTitle>
          <ul className="divide-y divide-line">
            {due.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="truncate">{t.title}</p><p className="text-xs text-muted">{db.clients.find((client) => client.id === t.clientId)?.name ?? t.clientId}, {t.owner}{!t.clientVisible && ", internal"}</p></div>
                <span className="num shrink-0 text-xs text-muted">{date(t.due)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle aside={<Link href="/admin/leads" className="text-xs text-accent hover:underline">All leads</Link>}>Hot leads</SectionTitle>
          <ul className="divide-y divide-line">
            {db.leads.filter((l) => l.score === "HOT").map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div><p className="font-medium">{l.company}</p><p className="text-xs text-muted">{l.nextAction}, {l.owner}</p></div>
                <Status value={l.stage} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle>Recent activity</SectionTitle>
          {db.audit.length ? (
            <ul className="space-y-2.5 text-sm">
              {db.audit.slice(0, 8).map((e) => (
                <li key={e.id} className="flex justify-between gap-3"><span><span className="font-medium">{e.actor}</span> <span className="text-muted">{e.action}</span></span><span className="num shrink-0 text-xs text-muted">{dateTime(e.at)}</span></li>
              ))}
            </ul>
          ) : <Empty title="No activity yet" body="Approvals, payments and status changes are logged here." />}
        </Card>
      </div>
    </>
  );
}
