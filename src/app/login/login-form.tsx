"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { btn, field } from "@/components/ui";

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured. Set the public URL and anon key.");
  return createBrowserClient(url, key);
}

export function LoginForm() {
  const [mode, setMode] = useState<"password" | "link">("link");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setMessage("");
    setError("");
    setBusy(true);
    try {
      const client = supabase();
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      const response = mode === "password"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` } });
      if (response.error) throw response.error;
      if (mode === "link") {
        setMessage("Check your email for a secure sign-in link.");
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in could not be completed. Try again.");
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium text-muted">Work email</label>
        <input id="auth-email" name="email" type="email" autoComplete="email" className={field} required />
      </div>
      {mode === "password" && <div>
        <label htmlFor="auth-password" className="mb-1.5 block text-xs font-medium text-muted">Password</label>
        <input id="auth-password" name="password" type="password" autoComplete="current-password" className={field} required />
      </div>}
      {error && <p role="alert" className="rounded-[var(--radius-ctl)] border border-bad/40 bg-bad/10 px-3 py-2.5 text-sm text-bad">{error}</p>}
      {message && <p role="status" className="rounded-[var(--radius-ctl)] border border-good/40 bg-good/10 px-3 py-2.5 text-sm text-good">{message}</p>}
      <button className={`${btn.primary} w-full`} disabled={busy}>{busy ? "Please wait…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}</button>
      <button type="button" className="w-full py-2 text-sm text-accent hover:underline" onClick={() => { setMode(mode === "password" ? "link" : "password"); setError(""); setMessage(""); }}>
        {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
      </button>
    </form>
  );
}
