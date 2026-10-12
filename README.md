# Leadhaus portal

One Next.js 16 app with two role-aware surfaces:

- **Client portal** (`/portal`): Dashboard, Projects, Creative approval, Strategy, Reports, Onboarding, Documents, Messages, Billing. One client at a time.
- **Agency workspace** (`/admin`): Overview, Inbox (chat with clients), Leads, Clients (with a Manage portal page per client), Delivery, Finance, Team and Settings for Dare, Oma and Fareedah.

What the team controls: agency contact and bank details, an announcement to all clients, and per client: which portal pages they can open, account lead, a dashboard note, project progress and deliverables, campaign status, goals and KPIs, and onboarding items.

## What the team controls, and where the client sees it

Every client page has a matching team control. Most live under **Clients > Manage portal**, in tabs named after the client pages.

| Client page | Team control | Where |
|---|---|---|
| Account and menu | Add a client (gives portal access), client status, account lead, which pages they can open, dashboard note | Clients > Add a client; Manage portal > Overview |
| Onboarding | Start onboarding (service checklist + welcome + to-do), stage (Not Started to Complete), reminders, tick items, ask for anything | Manage portal > Onboarding |
| Dashboard | Weekly numbers (spend, leads, revenue), announcement to all clients, tasks, dashboard note | Manage portal > Reports and numbers; Settings; Delivery |
| Projects | Start projects, progress, deliverables, add campaigns, campaign status | Manage portal > Projects |
| Creative approval | Add creatives, send for review, reply to comments, upload new versions | Manage portal > Creatives; Delivery |
| Strategy | Summary, recommendations, campaign plan, goals and targets | Manage portal > Strategy |
| Reports | Write, draft, publish reports | Manage portal > Reports and numbers; Delivery |
| Documents | Share documents, hide or show them | Manage portal > Documents |
| Messages | Chat, announcements, internal notes | Inbox |
| Billing | Create invoices, confirm payments, bank details | Finance; Settings |

Onboarding follows the build spec: checklists per service (Ads Management, Influencer Campaign, Creative Production, Strategy and Audit) in `src/lib/data/templates.ts`, and stages Not Started, In Progress, Ready for Strategy, Ready for Launch, Complete. Completing onboarding marks the client Active and sends a thank-you announcement.

## Run

```bash
npm install
npm run dev        # http://localhost:3000, pick a demo account on /login
npm test           # privacy boundary + session tests
npm run e2e        # clicks every feature in Chrome as a client and as the team (desktop + phone)
npm run build
```

Demo mode keeps data in memory (`src/lib/data/store.ts`) and resets on server restart or when someone clicks **Reset demo** on the sign in page. Copy `.env.example`: `SESSION_SECRET` is required in production, and production demo access requires `DEMO_PASSCODE`. This shared code is only an access gate for the demo account picker; it is not per-user authentication. Connect Supabase Auth before using the portal with real client data.

Non-technical testers: give them `TESTING_GUIDE.md` (67 tick-box steps, plain English).

## Privacy boundary (the important part)

- `src/lib/portal.ts` is the ONLY data source for `/portal`. Every function filters by the session's `clientId` and builds new objects from an explicit field allow-list. Never spread internal records.
- Internal fields (margin, fees of other clients, internal notes and comments, lead scores, collaborator payments, draft reports, internal tasks/docs/messages) exist only in the store/admin layer.
- `tests/privacy.test.ts` serializes every portal projection per client and fails on any internal key, internal value, or other client's data.
- `requireClient()` / `requireAdmin()` run in every page and server action. `src/proxy.ts` is only a fast-path redirect.
- `supabase/migrations/0001_portal_schema.sql` mirrors this in Postgres: default-deny RLS, internal fields in separate staff-only tables (RLS filters rows, not columns).

## Hosting (pick one)

| Option | Good for | How |
|---|---|---|
| **Render** or **Railway** (one always-on Node server) | Demo and testing with the sample data | New Web Service from this repo. Build `npm ci && npm run build`, start `npm start`. Set `SESSION_SECRET` and `DEMO_PASSCODE`. |
| **Any VPS** (DigitalOcean, Hetzner, AWS Lightsail) | Full control | `npm ci && npm run build && npm start` behind Nginx or Caddy for HTTPS. Same env vars. |
| **Vercel** or **Netlify** | Production, once Supabase is connected | Import the repo, set env vars. Do NOT use for the in-memory demo: these platforms run many short-lived copies, so demo changes appear and vanish. |

Requirements: Node 20.9 or newer. Environment variables are listed in `.env.example`.

## Going live (off demo)

Production builds run in live mode: Supabase Auth sign-in, data in Supabase, no demo accounts. The website links to the portal from "Client Login" at `https://portal.leadhausstudios.com/login`.

1. **Supabase project.** Create a new project for Leadhaus (not shared with any other client). Link and push the schema:
   `npx supabase link --project-ref <ref>` then `npx supabase db push` (applies `supabase/migrations/0001` to `0003`, empty workspace, no sample data).
2. **Auth settings** (Supabase dashboard > Authentication > URL configuration): Site URL `https://portal.leadhausstudios.com`, add `https://portal.leadhausstudios.com/auth/callback` to redirect URLs. Set up custom SMTP so invite emails come from a Leadhaus address.
3. **Host** on Vercel (or any Node host). Env vars from `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_MAIN_SITE_URL`.
4. **Domain.** Add `portal.leadhausstudios.com` to the host, then a CNAME at the domain's DNS provider.
5. **Team accounts.** For each staff member:
   `node --env-file=.env.local scripts/add-staff.mjs dare@leadhausstudios.com "Dare" "Founder"`
   They get an invite email and land in `/admin`.
6. **Clients.** Staff add clients in Admin > Clients. That sends the client an invite and creates their portal.
7. Merge the "Client Login" pull request on the website repo.

Not built yet: file contents for creatives, documents and client uploads (only the file details are saved; Supabase Storage with 10-minute signed URLs is next), email notifications for workflow events, Paystack, Meta/Google Ads sync.

Local live-mode testing: put the keys in `.env.local` and set `AUTH_PROVIDER=supabase`. The e2e suite forces `AUTH_PROVIDER=demo`.
