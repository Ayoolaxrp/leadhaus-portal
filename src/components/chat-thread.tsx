import { Badge } from "./ui";
import { dateTime } from "@/lib/format";

export type ChatMessage = { id: string; from: string; fromRole: "client" | "admin"; kind: string; body: string; at: string; internal?: boolean; needsReply?: boolean };

// Oldest first, like a chat app. "mine" decides which side is right-aligned.
export function ChatThread({ messages, mine, empty }: { messages: ChatMessage[]; mine: "client" | "admin"; empty: string }) {
  if (!messages.length) return <p className="py-10 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="flex flex-col gap-4" aria-label="Conversation">
      {[...messages].sort((a, b) => a.at.localeCompare(b.at)).map((m) => {
        const own = m.fromRole === mine;
        return (
          <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[75%] ${own ? "items-end self-end" : "items-start self-start"}`}>
            <p className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="font-medium text-text">{m.from}</span>
              <span className="num">{dateTime(m.at)}</span>
              {m.kind === "Announcement" && <Badge tone="accent">Announcement</Badge>}
              {m.internal && <Badge tone="warn">Internal note</Badge>}
              {m.needsReply && <Badge tone="bad">Needs reply</Badge>}
            </p>
            <p
              className={`rounded-[var(--radius-card)] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                m.internal ? "border border-dashed border-warn/50 bg-warn/10" : own ? "bg-accent text-accent-ink" : "bg-surface-2"
              }`}
            >
              {m.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
