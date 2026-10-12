import { requireAdmin } from "@/lib/session";
import { getAdminData } from "@/lib/admin-runtime";
import { saveAgencySettings } from "@/lib/actions";
import { PageHeader, Card, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Settings" };

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted/80">{hint}</p>}
    </div>
  );
}

export default async function Settings() {
  await requireAdmin();
  const db = await getAdminData();
  const s = db.settings;
  return (
    <>
      <PageHeader
        title="Settings"
        sub="Agency details every client sees. Per-client controls live under Clients, Manage portal."
        help={[
          "Change any box and click Save settings. Clients see the change the next time they open a page.",
          "Announcement shows a pink banner at the top of every client dashboard. Leave it empty to hide it.",
          "Bank details appear on every invoice clients open.",
          "To switch pages on or off for one client, or update their progress, go to Clients and click Manage portal.",
        ]}
      />
      <ActionForm action={saveAgencySettings} success="Settings saved. Clients see the change now." className="grid max-w-3xl gap-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-[15px] font-semibold sm:col-span-2">Contact details</h2>
          <Field id="agencyName" label="Agency name"><input id="agencyName" name="agencyName" defaultValue={s.agencyName} className={field} required /></Field>
          <Field id="supportEmail" label="Support email"><input id="supportEmail" name="supportEmail" type="email" defaultValue={s.supportEmail} className={field} required /></Field>
          <Field id="supportWhatsApp" label="WhatsApp number"><input id="supportWhatsApp" name="supportWhatsApp" defaultValue={s.supportWhatsApp} className={field} /></Field>
          <Field id="replyPromise" label="How fast you reply" hint={'Shown as "We reply within one working day."'}><input id="replyPromise" name="replyPromise" defaultValue={s.replyPromise} className={field} /></Field>
        </Card>

        <Card className="grid gap-4 sm:grid-cols-3">
          <h2 className="text-[15px] font-semibold sm:col-span-3">Bank details for invoices</h2>
          <Field id="bank" label="Bank"><input id="bank" name="bank" defaultValue={s.bank.bank} className={field} /></Field>
          <Field id="accountName" label="Account name"><input id="accountName" name="accountName" defaultValue={s.bank.accountName} className={field} /></Field>
          <Field id="accountNumber" label="Account number" hint="10 digits"><input id="accountNumber" name="accountNumber" inputMode="numeric" defaultValue={s.bank.accountNumber} className={field} /></Field>
        </Card>

        <Card>
          <h2 className="mb-4 text-[15px] font-semibold">Announcement to all clients</h2>
          <Field id="announcement" label="Message" hint="Up to 300 characters. Leave empty to show nothing.">
            <textarea id="announcement" name="announcement" rows={3} maxLength={300} defaultValue={s.announcement} className={field} placeholder="For example: Our office is closed on 1 October. Campaigns keep running as normal." />
          </Field>
        </Card>
        <div><button className={btn.primary}>Save settings</button></div>
      </ActionForm>
    </>
  );
}
