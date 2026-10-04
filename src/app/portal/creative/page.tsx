import { requireClient } from "@/lib/session";
import { getCreatives, requireSection } from "@/lib/portal";
import { PageHeader, Empty } from "@/components/ui";
import { CreativeCard } from "./creative-card";

export const metadata = { title: "Creative approval" };

export default async function CreativeApproval() {
  const me = await requireClient();
  requireSection(me.clientId, "creative");
  const creatives = getCreatives(me.clientId);
  const waiting = creatives.filter((c) => c.status === "Client review");
  const rest = creatives.filter((c) => c.status !== "Client review");

  return (
    <>
      <PageHeader title="Creative approval" sub="Check each piece, leave notes, then approve it or ask for changes. Nothing goes live without your approval."
        help={["Look at the picture. If there is more than one version, click V1 or V2 to switch between them.", "To ask a question, type in the Add a comment box and click Post.", "If you are happy, click Approve. If you want changes, write what to change in the note box, then click Request changes.", "Once you decide, the creative moves to the Decided list and your team is told straight away."]} />
      <h2 className="mb-3 text-[15px] font-semibold">Waiting for you <span className="num text-muted">({waiting.length})</span></h2>
      {waiting.length ? (
        <div className="grid gap-6 xl:grid-cols-2">{waiting.map((c) => <CreativeCard key={c.id} c={c} />)}</div>
      ) : (
        <Empty title="You are all caught up" body="New creatives will appear here when they are ready for your review." />
      )}
      {rest.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-[15px] font-semibold">Decided</h2>
          <div className="grid gap-6 xl:grid-cols-2">{rest.map((c) => <CreativeCard key={c.id} c={c} />)}</div>
        </>
      )}
    </>
  );
}
