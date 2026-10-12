import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getAdminData } from "@/lib/admin-runtime";
import { postClientMessage, markQuestionsAnswered } from "@/lib/actions";
import { PageHeader, Card, Empty, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ChatThread } from "@/components/chat-thread";

export const metadata = { title: "Inbox" };

export default async function Inbox({ searchParams }: PageProps<"/admin/inbox">) {
  await requireAdmin();
  const db = await getAdminData();
  const waiting = (clientId: string) => db.messages.filter((m) => m.clientId === clientId && m.kind === "Question" && m.fromRole === "client" && !m.answered).length;
  const sp = await searchParams;
  const selected = db.clients.find((c) => c.id === sp.c) ?? [...db.clients].sort((a, b) => waiting(b.id) - waiting(a.id))[0];
  const contact = db.users.find((u) => u.clientId === selected?.id);
  const messages = selected
    ? db.messages.filter((m) => m.clientId === selected.id).map((m) => ({
        id: m.id, from: m.from, fromRole: m.fromRole, kind: m.kind, body: m.body, at: m.at,
        internal: m.visibility === "internal", needsReply: m.kind === "Question" && m.fromRole === "client" && !m.answered,
      }))
    : [];

  return (
    <>
      <PageHeader
        title="Inbox"
        sub="Chat with each client. Replies appear on their Messages page straight away."
        help={[
          "Pick a client on the left. A red number means they asked something and are waiting for a reply.",
          "Type in the reply box and click Send. Sending a reply clears the Needs reply label.",
          "Choose Announcement to show your message as a highlighted notice on their Messages page.",
          "Tick Internal note only to leave a note for the team. The client never sees it.",
        ]}
      />
      {!selected ? <Empty title="No clients yet" body="Clients appear here once they are added." /> : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label="Clients" className="flex gap-2 overflow-x-auto lg:flex-col">
            {db.clients.map((c) => {
              const n = waiting(c.id);
              const active = c.id === selected.id;
              return (
                <Link key={c.id} href={`/admin/inbox?c=${c.id}`} aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-[var(--radius-ctl)] border px-4 py-3 text-sm transition ${active ? "border-accent/60 bg-surface-2" : "border-line bg-surface hover:bg-surface-2"}`}>
                  <span className="font-medium">{c.name}</span>
                  {n > 0 && <span className="num rounded-full bg-bad px-2 text-[11px] font-semibold text-white" aria-label={`${n} waiting`}>{n}</span>}
                </Link>
              );
            })}
          </nav>

          <Card>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="font-semibold">{selected.name}</h2>
                <p className="text-xs text-muted">{contact ? `${contact.name}, ${contact.title}` : "No portal user"}. Account lead {selected.accountLead}.</p>
              </div>
              {waiting(selected.id) > 0 && (
                <form action={markQuestionsAnswered}>
                  <input type="hidden" name="clientId" value={selected.id} />
                  <button className={btn.small}>Mark as handled</button>
                </form>
              )}
            </div>
            <ChatThread messages={messages} mine="admin" empty="No messages with this client yet." />
            <ActionForm key={selected.id} action={postClientMessage} success="Sent." className="mt-6 border-t border-line pt-5">
              <input type="hidden" name="clientId" value={selected.id} />
              <label htmlFor="reply" className="mb-1.5 block text-xs text-muted">Reply to {selected.name}</label>
              <textarea id="reply" name="body" rows={3} className={field} required />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label htmlFor="kind" className="sr-only">Message type</label>
                <select id="kind" name="kind" className="h-10 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-sm">
                  <option value="Update">Normal message</option>
                  <option value="Announcement">Announcement</option>
                </select>
                <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="internal" className="accent-[var(--accent)]" /> Internal note only</label>
                <button className={`${btn.primary} ml-auto`}>Send</button>
              </div>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}
