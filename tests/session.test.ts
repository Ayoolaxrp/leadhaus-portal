import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verify } from "../src/lib/session-token";
import { demoPasscodeValid } from "../src/lib/demo-access";

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

test("production demo login requires a configured passcode", () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const previousPasscode = process.env.DEMO_PASSCODE;
  env.NODE_ENV = "production";
  delete process.env.DEMO_PASSCODE;
  try {
    assert.equal(demoPasscodeValid(undefined), false);
    process.env.DEMO_PASSCODE = "sample-code";
    assert.equal(demoPasscodeValid(undefined), false);
    assert.equal(demoPasscodeValid("wrong"), false);
    assert.equal(demoPasscodeValid("sample-code"), true);
  } finally {
    if (previousNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previousNodeEnv;
    if (previousPasscode === undefined) delete process.env.DEMO_PASSCODE;
    else process.env.DEMO_PASSCODE = previousPasscode;
  }
});

test("development demo login remains available without a passcode", () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const previousPasscode = process.env.DEMO_PASSCODE;
  env.NODE_ENV = "development";
  delete process.env.DEMO_PASSCODE;
  try {
    assert.equal(demoPasscodeValid(undefined), true);
  } finally {
    if (previousNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previousNodeEnv;
    if (previousPasscode === undefined) delete process.env.DEMO_PASSCODE;
    else process.env.DEMO_PASSCODE = previousPasscode;
  }
});

test("missing session secret is rejected in production on every host", () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const previousSecret = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  env.NODE_ENV = "production";

  try {
    assert.throws(() => sign("u_ada"), /SESSION_SECRET must be set in production/);
  } finally {
    if (previousNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});
