"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";

type Result = { ok?: boolean; error?: string } | void;

// Runs a server action, shows pending/error/success inline, resets on success.
export function ActionForm({ action, children, success, className = "" }: { action: (fd: FormData) => Promise<Result>; children: ReactNode; success?: string; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        start(async () => {
          try {
            const r = await action(fd);
            if (r && r.error) return setMsg({ tone: "err", text: r.error });
            ref.current?.reset();
            setMsg(success ? { tone: "ok", text: success } : null);
          } catch {
            setMsg({ tone: "err", text: "Something went wrong. Try again." });
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      <p role="status" aria-live="polite" className={`mt-2 text-xs ${msg?.tone === "err" ? "text-bad" : "text-good"} ${msg ? "" : "sr-only"}`}>
        {pending ? "Saving..." : msg?.text}
      </p>
    </form>
  );
}
