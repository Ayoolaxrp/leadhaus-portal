import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isEmail } from "../src/lib/email";

test("real addresses pass", () => {
  for (const e of ["someone@gmail.com", "a.b@leadhausstudios.com", "x@y.co"]) assert.ok(isEmail(e), e);
});
test("broken addresses fail", () => {
  for (const e of ["", "no-at.com", "a@b", "a b@c.com", "a@b c.com"]) assert.ok(!isEmail(e), e);
});
test("forms use the shared check, not their own regex", () => {
  for (const f of ["src/lib/actions.ts", "src/lib/lead-intake.ts"]) {
    assert.ok(!readFileSync(f, "utf8").includes("@]+@"), `${f} has its own email regex`);
  }
});
