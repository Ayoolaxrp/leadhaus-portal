-- Durable compatibility store used by the Next.js server-only workspace
-- adapter. The existing relational schema remains the source for Auth, profile
-- identity, client invitations, and private Storage. Never expose this table to
-- browser requests: server code uses the service role after role verification.
create table if not exists public.leadhaus_app_state (
  id boolean primary key default true check (id),
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.leadhaus_app_state enable row level security;
revoke all on public.leadhaus_app_state from public, anon, authenticated;
grant select, insert, update on public.leadhaus_app_state to service_role;

insert into public.leadhaus_app_state (id, revision, state)
values (
  true,
  0,
  '{
    "settings":{"agencyName":"Leadhaus Studios","supportEmail":"","supportWhatsApp":"","replyPromise":"within one working day","bank":{"bank":"","accountName":"","accountNumber":""},"announcement":""},
    "users":[],"clients":[],"campaigns":[],"metrics":[],"projects":[],"creatives":[],"strategies":[],"reports":[],"onboarding":[],"documents":[],"messages":[],"tasks":[],"invoices":[],"leads":[],"collaboratorPayments":[],"uploads":[],"audit":[]
  }'::jsonb
)
on conflict (id) do nothing;
