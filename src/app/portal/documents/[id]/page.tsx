import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/session";
import { getDocument, getAccount } from "@/lib/portal-runtime";
import { requireSection } from "@/lib/portal-guard";
import { Card, Badge } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { date } from "@/lib/format";

export const metadata = { title: "Document" };

export default async function DocumentPage({ params }: PageProps<"/portal/documents/[id]">) {
  const me = await requireClient();
  await requireSection(me.clientId, "documents");
  const id = (await params).id;
  const [doc, account] = await Promise.all([getDocument(me, id), getAccount(me)]);
  if (!doc) notFound();
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/portal/documents" className="text-sm text-accent hover:underline">Back to documents</Link>
        <PrintButton />
      </div>
      <Card className="mx-auto max-w-3xl p-8 md:p-12">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.08em]">LEADHAUS STUDIOS</p>
          <Badge>{doc.kind}</Badge>
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-sm text-muted">Prepared for {account.name}, {date(doc.date, { day: "numeric", month: "long", year: "numeric" })}</p>
        <div className="mt-8 space-y-4 leading-relaxed">{doc.body.map((p) => <p key={p}>{p}</p>)}</div>
      </Card>
    </>
  );
}
