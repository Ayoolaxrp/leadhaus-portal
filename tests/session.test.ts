import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verify } from "../src/lib/session-token";

test("valid session token verifies", () => assert.equal(verify(sign("u_ada")), "u_ada"));
test("tampered user id is rejected", () => {
  const [, mac] = sign("u_ada").split(".");
  assert.equal(verify(`u_dare.${mac}`), null);
});
test("missing or malformed token is rejected", () => {
  assert.equal(verify(undefined), null);
  assert.equal(verify("u_ada"), null);
  assert.equal(verify("."), null);
});
