@AGENTS.md

# Leadhaus portal

- Next.js 16: `proxy.ts`, not middleware. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- `/portal` pages may only import data from `src/lib/portal.ts`. Never import `store.ts` or `admin.ts` there.
- Any new internal field: add it to `INTERNAL_KEYS` in `tests/privacy.test.ts`.
- Design: one accent (`--accent`), radius 14px cards / 10px controls / full pills, Phosphor icons, no em dashes in UI copy.
- Log real problems in `lessons/LOG.md`.
