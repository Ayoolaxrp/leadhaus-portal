# Lessons log

## 2026-10-04 Initial build
- Running two `npm i` commands at once on Windows corrupted node_modules and dropped deps from package.json. Run installs sequentially.
- RLS filters rows, not columns: internal fields must live in separate staff-only tables, or clients can select them via PostgREST.
- Portal projections use explicit allow-lists so a new internal column stays hidden by default; the privacy test scans serialized output for keys and values.

## 2026-10-04 Feature pass + browser tests
- Every page has a "How does this page work?" panel, so the same words appear twice in the DOM. Playwright getByText is case-insensitive substring: target headings, summaries or `{ exact: true }` instead.
- Tasks used to close by fuzzy title match ("October offer" closed the wrong task). Tasks now carry `relatesTo` with the creative/onboarding id.
- `next build` failed type check from stale `.next/dev` types while a dev server was running. Stop dev servers and `rm -rf .next` before building.
- In-memory demo data is not safe on serverless: deploy the demo as a single long-running server, or connect Supabase.

## 2026-10-04 Admin and client correspondence
- Importing next/navigation into portal.ts broke the plain node test runner (React createContext). Keep portal.ts pure data; page-level guards live in portal-guard.ts.
- Playwright: after clicking a tab link, wait for something on the new tab before filling fields, or labels from the previous tab get matched.

## 2026-10-12 Going live
- A regex written as `\\s` (double backslash) inside a `/.../` literal matches a literal backslash: the live invite rejected every real email. Test live-only branches, not only demo mode.
- Live client provisioning wrote only relational tables while every screen reads `leadhaus_app_state`, so invited clients had no portal. The invite now also writes the client into the workspace store with the Supabase ids.
- Production forced live mode, so the e2e suite (which runs `next start`) lost the demo picker. `AUTH_PROVIDER=demo` overrides it for tests only.
- Throwing on missing env before `cookies()` made Next try to prerender `/admin` and fail the build. Read cookies first.
- Invited users have no password: the sign-in form defaults to the email link.
