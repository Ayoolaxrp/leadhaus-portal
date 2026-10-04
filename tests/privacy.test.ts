// Privacy boundary tests: run with `npm test`.
// Asserts that portal projections never contain internal fields or other
// clients' records, by serializing every projection and scanning it.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as portal from "../src/lib/portal";
import { db } from "../src/lib/data/store";

const fns = [portal.getAccount, portal.getCampaigns, portal.getPerformance, portal.getProjects, portal.getCreatives, portal.getStrategy, portal.getReports, portal.getOnboarding, portal.getDocuments, portal.getMessages, portal.getTasks, portal.getInvoices];
const dump = (clientId: string) => JSON.stringify(fns.map((f) => f(clientId)));

const INTERNAL_KEYS = ["marginPct", "internalNotes", "health", "monthlyFee", "capacityNote", "owner", "designer", "productionCost", "internalDiscussion", "reviewNotes", "visibility", "clientVisible", "internal", "score", "clientId", "relatesTo", "answered"];

for (const client of db.clients) {
  const out = dump(client.id);

  test(`${client.name}: no internal field names in portal output`, () => {
    for (const k of INTERNAL_KEYS) assert.ok(!out.includes(`"${k}":`), `leaked key ${k}`);
  });

  test(`${client.name}: no internal values in portal output`, () => {
    const secrets = [
      client.internalNotes,
      ...db.creatives.flatMap((c) => c.comments.filter((m) => m.internal).map((m) => m.body)),
      ...db.messages.filter((m) => m.visibility === "internal").map((m) => m.body),
      ...db.tasks.filter((t) => !t.clientVisible).map((t) => t.title),
      ...db.documents.filter((d) => d.visibility === "internal").map((d) => d.title),
      ...db.reports.filter((r) => r.status === "Draft").map((r) => r.title),
      ...db.strategies.map((s) => s.internalDiscussion),
      ...db.leads.map((l) => l.company),
    ].filter(Boolean);
    for (const s of secrets) assert.ok(!out.includes(JSON.stringify(s).slice(1, -1)), `leaked: ${s}`);
  });

  test(`${client.name}: no other client's data`, () => {
    for (const other of db.clients.filter((c) => c.id !== client.id)) {
      assert.ok(!out.includes(other.name), `saw ${other.name}`);
      for (const c of db.campaigns.filter((x) => x.clientId === other.id)) assert.ok(!out.includes(c.name), `saw campaign ${c.name}`);
      for (const i of db.invoices.filter((x) => x.clientId === other.id)) assert.ok(!out.includes(i.number), `saw invoice ${i.number}`);
    }
  });
}
