export function demoPasscodeValid(passcode: string | undefined): boolean {
  const expected = process.env.DEMO_PASSCODE;
  if (process.env.NODE_ENV === "production" && !expected) return false;
  return !expected || passcode === expected;
}
