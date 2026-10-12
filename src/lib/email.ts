// One email check for every form. Kept tiny and unit tested (tests/email.test.ts)
// after a double-escaped copy of this regex rejected every real address.
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
