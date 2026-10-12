# Backend Build Brief

## Purpose and current state

Build a production backend for the Leadhaus client portal and agency workspace, replacing the demo-only in-memory store while preserving the existing screens and `portal.ts` client-safe projection boundary.

Today, application data is seeded in `src/lib/data/store.ts`, and mutations in `src/lib/actions.ts` change process memory. Changes are lost on restart and are not shared safely between server instances. Authentication is a signed demo account-picker cookie. The SQL in `supabase/migrations/0001_portal_schema.sql` is a draft and explicitly has not been applied.

## Recommended shape

Use the existing Supabase direction: PostgreSQL for durable data, Supabase Auth for magic-link sign-in, and private Supabase Storage for files. Keep reads and writes behind server-side data-access functions and Next.js server actions; preserve the current portal projection interfaces where practical. Use the authenticated user's Supabase session for ordinary queries. If privileged server-side operations require the service-role key, keep it server-only, re-check role and `client_id` on every action, and never expose it to browser code.

## Required capabilities

1. **Identity and access**
   - Replace the public demo account picker with email magic links and invitation/provisioning flows for new client users and staff.
   - Use `profiles.role` and `profiles.client_id` as the authoritative identity-to-tenant mapping; reject clients without a client assignment.
   - Preserve role guards at every protected page and mutation. Support sign-out, expired/revoked sessions, and account deactivation.

2. **Persistent portal and workspace data**
   - Persist clients and portal settings; projects/deliverables, campaigns and weekly metrics; creatives/versions/comments/decisions; strategies/goals; onboarding; reports; documents/uploads; messages; tasks; invoices; leads; agency settings; collaborator costs; and audit events.
   - Make multi-record business operations atomic (for example, creating a client with its profile, strategy, checklist, task, and welcome message).
   - Preserve client-safe projections and ensure drafts, internal notes, margins, collaborator costs, and other clients' records are inaccessible to client accounts.

3. **File storage**
   - Store creatives, documents, and client uploads in private buckets under a tenant-scoped path such as `clients/<client_id>/...`.
   - Authorize uploads and downloads against the authenticated profile and client assignment; issue short-lived signed URLs (the README proposes 10 minutes).
   - Enforce file type/size limits server-side, persist storage metadata, and define deletion/retention behavior. The current upload action only records file metadata and does not persist file contents.

4. **Notifications and external integrations**
   - Send email for invitation/sign-in and key workflow events (approval requested, client message/reply, report published, onboarding reminder, invoice due). Use the existing email templates referenced by the README.
   - Treat Paystack invoice payments and Meta/Google Ads metric synchronization as follow-on integrations, not prerequisites for a durable portal MVP. If enabled, verify payment webhooks and make sync/webhook processing idempotent.

## Security and data rules

- Enable and test default-deny RLS on every exposed table. Client policies must scope records to `my_client_id()` and apply visibility/state rules (for example, published reports only and client-visible messages/documents/tasks only).
- RLS filters rows, not columns. Keep staff-only values in separate tables, not merely hidden UI fields. Keep portal reads as explicit field allow-lists; never serialize raw database rows into client pages.
- Clients may only perform narrowly allowed actions (questions, non-internal comments, uploads, and approved workflow requests). Validate inputs and ownership on the server; do not let a client set arbitrary approval, invoice, onboarding, or visibility states.
- Add audit records for sensitive staff changes and client decisions. Keep credentials and service-role keys out of source control and client bundles.

## Draft-schema reconciliation before applying migrations

The current migration is a useful starting point, not production-ready. Reconcile it with `src/lib/data/types.ts` and the actions before applying it. In particular, it currently lacks or does not model several app behaviors/fields, including:

- Agency-wide settings (including support/bank details and announcements) and per-client portal section visibility, welcome note, contact/currency, and onboarding stage.
- The client's "I have paid" timestamp on invoices; onboarding answers; question/reply state; task deep-link/relationship fields; and some profile/display fields.
- A safe representation for internal creative comments. The app marks comments internal, but the draft comments table has no visibility column; a client-readable comments policy without a distinct safe/internal representation risks disclosure. Keep internal comments separate or enforce visibility through an explicitly safe model.
- Staff-only strategy discussion and any other internal fields that must not be selected by clients. Keep these in separate staff-only records, consistent with the existing lesson that RLS does not hide columns.
- Relationship constraints and indexes for tenant-owned child rows; ensure each child record's `client_id` agrees with its parent to prevent cross-client mismatches.

Review every table's grants and policies, including newly added tables, and run the Supabase security/linter checks plus direct client-role tests before production data is loaded.

## Delivery sequence and acceptance

1. Finalize the relational model and migrations against the app types/actions; apply to a non-production Supabase project and seed isolated test data.
2. Implement server-only repository/data-access adapters, replacing the in-memory store while keeping portal projections and action behavior stable.
3. Integrate Supabase Auth and invite flows; test client, staff, signed-out, disabled, and wrong-tenant access.
4. Implement private Storage upload/download and signed URLs; test cross-client access denial and limits.
5. Add transactional workflow behavior, audit logging, and email notifications. Add payment/ads integrations separately if prioritized.
6. Deploy with secrets configured and verify persistence across restarts and multiple app instances.

**Release acceptance:** existing user workflows remain functional; data survives restart and is consistent across instances; client A cannot read or mutate client B or staff-only data, including through direct database/API requests; unauthenticated and wrong-role access is denied; file access is tenant-scoped; and migration, typecheck, unit, privacy, and end-to-end checks pass.

## Existing project notes

The repo README already documents Supabase as the intended production backend and says to preserve `portal.ts` signatures. It also warns not to deploy the in-memory demo on serverless hosting. The current `.env.example` only covers `SESSION_SECRET` and optional `DEMO_PASSCODE`; production Supabase, email, and optional integration credentials will need documented environment variables when those integrations are implemented.
