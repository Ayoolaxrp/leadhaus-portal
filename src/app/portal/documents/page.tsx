import Link from "next/link";
import { FileText } from "@phosphor-icons/react/dist/ssr";
import { requireClient } from "@/lib/session";
import { getDocuments } from "@/lib/portal";
import { requireSection } from "@/lib/portal-guard";
import { PageHeader, Card, Badge, Empty } from "@/components/ui";
import { date } from "@/lib/format";

export const metadata = { title: "Documents" };

const order = ["Contract", "Proposal", "Invoice", "Report", "Brand", "Other"] as const;

export default async function Documents() {
  const me = await requireClient();
  requireSection(me.clientId, "documents");
  const docs = getDocuments(me.clientId);

  return (
    <>
      <PageHeader title="Documents" sub="Your contract, proposal, invoices and shared files."
        help={["Click any document to open it.", "Inside a document, click Print or save as PDF to download a copy."]} />
      {!docs.length ? <Empty title="No documents yet" body="Signed contracts and shared files will appear here." /> : (
        <Card className="divide-y divide-line p-0">
          {[...docs].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.date.localeCompare(a.date)).map((d) => (
            <Link key={d.id} href={`/portal/documents/${d.id}`} className="flex items-center gap-4 p-4 transition hover:bg-surface-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-ctl)] bg-surface-2 text-muted"><FileText size={20} aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.title}</p>
                <p className="num text-xs text-muted">{date(d.date, { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <Badge>{d.kind}</Badge>
              <span className="text-xs text-accent">Open</span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
