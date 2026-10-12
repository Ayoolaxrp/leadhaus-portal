import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/data/store";
import { isLiveRuntime } from "@/lib/data/runtime";
import { allowedOrigin, leadFromWebsite } from "@/lib/lead-intake";
import { savePersistentStore, withPersistentStore } from "@/lib/supabase/persistent-store";

// Public endpoint for the leadhausstudios.com forms. The site posts with
// mode "no-cors" next to its Formspree and Google Sheet calls, so the response
// body is never read; status codes are for logs and tests.

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function addLead(data: FormData) {
  const owner = db.users.find((u) => u.role === "admin")?.name ?? "Unassigned";
  const result = leadFromWebsite(data, owner);
  if ("error" in result) return result;
  db.leads.unshift(result.lead);
  logEvent("Website", `New lead from ${result.lead.source.replace("Website: ", "")}: ${result.lead.company}`);
  return result;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const dev = process.env.NODE_ENV !== "production";
  if (!allowedOrigin(origin) && !(dev && origin?.startsWith("http://localhost"))) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Too many submissions." }, { status: 429 });

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the form as form data." }, { status: 400 });
  }

  if (!isLiveRuntime()) {
    const result = addLead(data);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.spam ? 202 : 400 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // Team members may save at the same moment; reload and retry a few times.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await withPersistentStore(async () => {
        const r = addLead(data);
        if (!("error" in r)) await savePersistentStore();
        return r;
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.spam ? 202 : 400 });
      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (cause) {
      const conflict = cause instanceof Error && cause.message.includes("same time");
      if (!conflict || attempt === 2) {
        console.error("Lead intake failed", cause);
        return NextResponse.json({ error: "Could not save the lead." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: "Could not save the lead." }, { status: 500 });
}
