import { requireAdmin } from "@/lib/session";
import { adminOverview, getAdminData } from "@/lib/admin-runtime";
import { markInvoicePaid, createInvoice } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader, Card, SectionTitle, Stat, Status, Badge, btn, field } from "@/components/ui";
import { money, moneyShort, date } from "@/lib/format";

export const metadata = { title: "Finance" };

export default async function Finance() {
  await requireAdmin();
  const [o, db] = await Promise.all([adminOverview(), getAdminData()]);
  const clientName = (id: string) => db.clients.find((client) => client.id === id)?.name ?? id;
  return (
    <>
      <PageHeader title="Finance" sub="Invoices, collaborator payments and margin. Internal only."
        help={["Use Create an invoice to bill a client. It appears on their Billing and Documents pages straight away.", "When a client clicks I have paid, the invoice shows Client says paid. Check the bank, then click Mark paid.", "Collaborator payments are what we pay freelancers and creators. Clients never see them."]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Monthly recurring revenue" value={moneyShort(o.mrr)} />
        <Stat label="Collaborator costs" value={moneyShort(o.collaboratorCost)} />
        <Stat label="Estimated profit" value={moneyShort(o.estimatedProfit)} note={`${Math.round((o.estimatedProfit / o.mrr) * 100)}% margin`} tone="good" />
        <Stat label="Outstanding" value={moneyShort(o.outstandingTotal)} tone={o.outstandingCount ? "bad" : "muted"} note={`${o.outstandingCount} invoices`} />
      </div>

      <Card className="mt-6 overflow-x-auto">
        <SectionTitle>Invoices</SectionTitle>
        <details className="mb-4 rounded-[var(--radius-ctl)] border border-line">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-accent">Create an invoice</summary>
          <ActionForm action={createInvoice} success="Invoice created and shared with the client." className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label htmlFor="i-client" className="mb-1.5 block text-xs text-muted">Client</label><select id="i-client" name="clientId" className={field}>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label htmlFor="i-desc" className="mb-1.5 block text-xs text-muted">What it is for</label><input id="i-desc" name="description" className={field} placeholder="November retainer" required /></div>
            <div><label htmlFor="i-amount" className="mb-1.5 block text-xs text-muted">Amount in naira</label><input id="i-amount" name="amount" inputMode="numeric" className={field} placeholder="350000" required /></div>
            <div><label htmlFor="i-due" className="mb-1.5 block text-xs text-muted">Due date</label><input id="i-due" name="due" type="date" className={field} required /></div>
            <div className="sm:col-span-2 lg:col-span-4"><button className={btn.primary}>Create invoice</button></div>
          </ActionForm>
        </details>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="pb-3 font-normal">Invoice</th><th className="pb-3 font-normal">Client</th><th className="pb-3 font-normal">Due</th><th className="pb-3 text-right font-normal">Amount</th><th className="pb-3 text-right font-normal">Status</th><th className="pb-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {[...db.invoices].sort((a, b) => b.issued.localeCompare(a.issued)).map((i) => (
              <tr key={i.id}>
                <td className="py-3"><p className="font-medium">{i.number}</p><p className="text-xs text-muted">{i.description}</p></td>
                <td className="py-3 text-muted">{clientName(i.clientId)}</td>
                <td className="num py-3 text-muted">{date(i.due)}</td>
                <td className="num py-3 text-right">{money(i.amount)}</td>
                <td className="py-3 text-right">{i.clientMarkedPaidAt && i.status !== "Paid" ? <Badge tone="accent">Client says paid</Badge> : <Status value={i.status} />}</td>
                <td className="py-3 pl-3 text-right">{i.status !== "Paid" && <form action={markInvoicePaid}><input type="hidden" name="invoiceId" value={i.id} /><button className={btn.small}>Mark paid</button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6">
        <SectionTitle>Collaborator payments</SectionTitle>
        <ul className="divide-y divide-line">
          {db.collaboratorPayments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div><p className="font-medium">{p.collaborator}</p><p className="text-xs text-muted">{p.description}, {clientName(p.clientId)}</p></div>
              <div className="flex items-center gap-3"><span className="num">{money(p.amount)}</span><Status value={p.status === "Paid" ? "Paid" : "Open"} /></div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
