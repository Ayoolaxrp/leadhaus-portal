"use client";

import { btn } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">Nothing you did was lost. Try again, and if it keeps happening, message your Leadhaus contact.</p>
        <button onClick={reset} className={`${btn.primary} mt-6`}>Try again</button>
      </div>
    </main>
  );
}
