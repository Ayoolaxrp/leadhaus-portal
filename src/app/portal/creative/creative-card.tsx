"use client";

import Image from "next/image";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Status, btn, field } from "@/components/ui";
import { decideCreative, commentOnCreative } from "@/lib/actions";
import type { getCreatives } from "@/lib/portal";
import { date, dateTime } from "@/lib/format";

type C = ReturnType<typeof getCreatives>[number];

export function CreativeCard({ c }: { c: C }) {
  const [v, setV] = useState(c.versions.length - 1);
  const version = c.versions[v];
  const open = c.status === "Client review";

  return (
    <article className="grid overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="relative aspect-[4/5] bg-surface-2">
        <Image src={version.image} alt={`${c.title}, version ${version.version}`} fill sizes="(min-width: 1280px) 22vw, (min-width: 768px) 40vw, 100vw" className="object-cover" />
      </div>
      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold tracking-tight">{c.title}</h3>
            <p className="text-xs text-muted">{c.format}, {c.platform}</p>
          </div>
          <Status value={c.status} />
        </div>

        {c.versions.length > 1 && (
          <div className="mt-4 flex gap-1.5" role="group" aria-label="Versions">
            {c.versions.map((x, i) => (
              <button key={x.version} onClick={() => setV(i)} aria-pressed={i === v} className={`h-7 rounded-full px-3 text-xs transition ${i === v ? "bg-text text-bg" : "bg-surface-2 text-muted hover:text-text"}`}>
                V{x.version}
              </button>
            ))}
            <span className="num ml-auto self-center text-[11px] text-muted">{date(version.createdAt)}</span>
          </div>
        )}

        <div className="mt-4 flex-1">
          <h4 className="text-xs font-medium text-muted">Comments</h4>
          {c.comments.length ? (
            <ul className="mt-2 max-h-48 space-y-3 overflow-y-auto pr-1">
              {c.comments.map((m) => (
                <li key={m.id} className="text-sm">
                  <p className="text-xs text-muted"><span className="font-medium text-text">{m.author}</span> {dateTime(m.at)}</p>
                  <p className="mt-0.5 leading-relaxed">{m.body}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">No comments yet.</p>}
        </div>

        {open ? (
          <>
            <ActionForm action={commentOnCreative} className="mt-4" success="Comment posted.">
              <input type="hidden" name="creativeId" value={c.id} />
              <label htmlFor={`cm-${c.id}`} className="sr-only">Add a comment</label>
              <div className="flex gap-2">
                <input id={`cm-${c.id}`} name="body" className={field} placeholder="Add a comment" autoComplete="off" />
                <button className={btn.secondary}>Post</button>
              </div>
            </ActionForm>
            <ActionForm action={decideCreative} className="mt-3 border-t border-line pt-4">
              <input type="hidden" name="creativeId" value={c.id} />
              <label htmlFor={`note-${c.id}`} className="mb-1.5 block text-xs text-muted">Note for the team (required for changes)</label>
              <textarea id={`note-${c.id}`} name="note" rows={2} className={field} placeholder="For example: use the October price and swap the end card" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button name="decision" value="revise" className={btn.secondary}>Request changes</button>
                <button name="decision" value="approve" className={btn.primary}>Approve</button>
              </div>
            </ActionForm>
          </>
        ) : (
          <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
            {c.status} by {c.decidedBy} on {c.decidedAt && date(c.decidedAt, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
    </article>
  );
}
