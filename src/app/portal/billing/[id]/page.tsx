import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/session";
import { getInvoice, getAccount, getAgencyInfo, requireSection } from "@/lib/portal";
import { markInvoiceSent } from "@/lib/actions";
import { Card, Status, Badge, btn } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PrintButton } from "@/components/print-button";
import { date, dateTime, money } from "@/lib/format";

export const metadata = { title: "Invoice" };

const long = { day: "numeric", month: "long", year: "numeric" } as const;

export default async function InvoicePage({ params }: PageProps<"/portal/billing/[id]">) {
  const me = await requireClient();
  requireSection(me.clientId, "billing");
  const inv = getInvoice(me.clientId, (await params).id);
  if (!inv) notFound();
  const account = getAccount(me.clientId);
  const BANK_DETAILS = getAgencyInfo().bank;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/portal/billing" className="text-sm text-accent hover:underline">Back to billing</Link>
        <PrintButton />
      </div>
      <Card className="mx-auto max-w-3xl p-8 md:p-12">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.08em] uppercase">{getAgencyInfo().agencyName}</p>
          {inv.clientMarkedPaidAt && inv.status !== "Paid" ? <Badge tone="accent">Payment sent</Badge> : <Status value={inv.status} />}
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Invoice {inv.number}</h1>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted">Billed to</dt><dd className="font-medium">{account.name}</dd></div>
          <div><dt className="text-xs text-muted">Issued</dt><dd className="num">{date(inv.issued, long)}</dd></div>
          <div><dt className="text-xs text-muted">Due</dt><dd className="num">{date(inv.due, long)}</dd></div>
        </dl>
        <div className="mt-8 flex items-center justify-between border-y border-line py-4">
          <span>{inv.description}</span>
          <span className="num text-lg font-semibold">{money(inv.amount)}</span>
        </div>
        {inv.status === "Paid" ? (
          <p className="mt-6 text-sm text-good">Paid on {inv.paidAt && date(inv.paidAt, long)} by {inv.method?.toLowerCase()}. Thank you.</p>
        ) : (
          <>
            <h2 className="mt-8 text-sm font-semibold">How to pay</h2>
            <dl className="mt-3 grid gap-3 rounded-[var(--radius-ctl)] bg-surface-2 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">Bank</dt><dd>{BANK_DETAILS.bank}</dd></div>
              <div><dt className="text-xs text-muted">Account name</dt><dd>{BANK_DETAILS.accountName}</dd></div>
              <div><dt className="text-xs text-muted">Account number</dt><dd className="num">{BANK_DETAILS.accountNumber}</dd></div>
              <div><dt className="text-xs text-muted">Payment reference</dt><dd className="num font-medium">{inv.number}</dd></div>
            </dl>
            <div className="mt-6 print:hidden">
              {inv.clientMarkedPaidAt ? (
                <p className="text-sm text-muted">You told us you paid on {dateTime(inv.clientMarkedPaidAt)}. We will confirm once it reaches our account.</p>
              ) : (
                <ActionForm action={markInvoiceSent} success="Thank you. We have let the team know.">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <p className="mb-3 text-sm text-muted">Already sent the money? Let us know so we can check for it.</p>
                  <button className={btn.primary}>I have paid</button>
                </ActionForm>
              )}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
