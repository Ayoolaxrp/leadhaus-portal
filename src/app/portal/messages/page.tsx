import { Megaphone } from "@phosphor-icons/react/dist/ssr";
import { requireClient } from "@/lib/session";
import { getMessages, getAccount, getAgencyInfo, requireSection } from "@/lib/portal";
import { sendClientMessage } from "@/lib/actions";
import { PageHeader, Card, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ChatThread } from "@/components/chat-thread";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function Messages() {
  const me = await requireClient();
  requireSection(me.clientId, "messages");
  const all = getMessages(me.clientId);
  const account = getAccount(me.clientId);
  const agency = getAgencyInfo();
  const announcements = all.filter((m) => m.kind === "Announcement");
  const thread = all.filter((m) => m.kind !== "Announcement");

  return (
    <>
      <PageHeader
        title="Messages"
        sub={`Chat with ${account.accountLead} and the ${agency.agencyName} team. We reply ${agency.replyPromise}.`}
        help={["Pink boxes at the top are important announcements.", "The chat shows your messages on the right and the team's replies on the left, oldest at the top.", "To ask something, type in the box under the chat and click Send message."]}
      />
      {announcements.map((a) => (
        <div key={a.id} className="mb-6 flex gap-3 rounded-[var(--radius-card)] border border-accent/40 bg-accent-soft p-4">
          <Megaphone size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div><p className="text-sm leading-relaxed">{a.body}</p><p className="num mt-1 text-xs text-muted">{dateTime(a.at)}</p></div>
        </div>
      ))}

      <Card className="mx-auto max-w-3xl">
        <ChatThread messages={thread} mine="client" empty="No messages yet. Ask your team anything below." />
        <ActionForm action={sendClientMessage} success="Sent. We will reply here." className="mt-6 border-t border-line pt-5">
          <label htmlFor="body" className="mb-1.5 block text-xs text-muted">Message</label>
          <textarea id="body" name="body" rows={3} className={field} required />
          <button className={`${btn.primary} mt-3`}>Send message</button>
        </ActionForm>
      </Card>
    </>
  );
}
