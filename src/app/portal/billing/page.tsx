import { requireClient } from "@/lib/session";
import { getInvoices, requireSection } from "@/lib/portal";
import Link from "next/link";
import { PageHeader, Card, Stat, Status, Empty, Badge, btn } from "@/components/ui";
import { date, money } from "@/lib/format";

export const metadata = { title: "Billing" };

export default async function Billing() {
  const me = await requireClient();
  requireSection(me.clientId, "billing");
  const invoices = getInvoices(me.clientId);
  const open = invoices.filter((i) => i.status !== "Paid");
  const paid = invoices.filter((i) => i.status === "Paid");
  const due = open.reduce((a, i) => a + i.amount, 0);
  const overdue = open.some((i) => i.status === "Overdue");
  const next = [...open].sort((a, b) => a.due.localeCompare(b.due))[0];

  return (
    <>
      <PageHeader title="Billing" sub="Invoices, what is outstanding and everything you have paid."
        help={["To pay lists invoices that are still open. Click View invoice to see the bank details.", "After you pay, open the invoice and click I have paid. Your team will confirm it.", "Payment history lists everything you have already paid."]} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Outstanding" value={money(due)} note={open.length ? `${open.length} invoice${open.length === 1 ? "" : "s"}${overdue ? ", overdue" : ""}` : "Nothing to pay"} tone={overdue ? "bad" : "muted"} />
        <Stat label="Next due" value={next ? date(next.due) : "None"} note={next?.number} />
        <Stat label="Paid to date" value={money(paid.reduce((a, i) => a + i.amount, 0))} note={`${paid.length} payment${paid.length === 1 ? "" : "s"}`} />
      </div>

      {open.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-[15px] font-semibold">To pay</h2>
          <Card className="divide-y divide-line p-0">
            {open.map((i) => (
              <div key={i.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{i.number}, {i.description}</p>
                  <p className="num text-xs text-muted">Issued {date(i.issued)}, due {date(i.due, { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="num font-semibold">{money(i.amount)}</span>
                  {i.clientMarkedPaidAt ? <Badge tone="accent">Payment sent, awaiting confirmation</Badge> : <Status value={i.status} />}
                  <Link href={`/portal/billing/${i.id}`} className={btn.small}>View invoice</Link>
                </div>
              </div>
            ))}
          </Card>
          <p className="mt-3 text-xs text-muted">Pay by bank transfer using the invoice number as the reference. Open the invoice for bank details.</p>
        </>
      )}

      <h2 className="mt-10 mb-3 text-[15px] font-semibold">Payment history</h2>
      {paid.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="pb-3 font-normal">Invoice</th><th className="pb-3 font-normal">Paid on</th><th className="pb-3 font-normal">Method</th><th className="pb-3 text-right font-normal">Amount</th></tr></thead>
            <tbody className="divide-y divide-line">
              {paid.map((i) => (
                <tr key={i.id}>
                  <td className="py-3"><Link href={`/portal/billing/${i.id}`} className="font-medium hover:text-accent">{i.number}</Link><p className="text-xs text-muted">{i.description}</p></td>
                  <td className="num py-3 text-muted">{i.paidAt && date(i.paidAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="py-3 text-muted">{i.method}</td>
                  <td className="num py-3 text-right">{money(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : <Empty title="No payments yet" body="Paid invoices will be listed here." />}
    </>
  );
}
