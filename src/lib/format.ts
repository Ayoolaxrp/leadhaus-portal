const ngn = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const ngnCompact = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", notation: "compact", maximumFractionDigits: 1 });

export const money = (n: number) => ngn.format(n);
export const moneyShort = (n: number) => ngnCompact.format(n);
export const ratio = (n: number) => `${n.toFixed(1)}x`;

export function date(d: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", ...opts });
}

export function dateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function change(cur: number, prev: number) {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

export const fileSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
