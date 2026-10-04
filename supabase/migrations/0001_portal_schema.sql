-- Leadhaus portal schema with default-deny Row Level Security.
-- Not applied yet. Apply with `supabase db push` once a project is linked.
--
-- Design rule: RLS filters rows, not columns. So internal-only fields live in
-- separate *_internal tables that only staff can read. Client portal users can
-- never select them, even by hand-writing PostgREST queries.

create extension if not exists pgcrypto;

-- ---------- identity ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service text not null,
  status text not null default 'Onboarding' check (status in ('Onboarding','Active','Paused','Completed','Churned')),
  account_lead text,
  renewal_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.clients_internal (
  client_id uuid primary key references public.clients(id) on delete cascade,
  monthly_fee numeric(12,2),
  margin_pct numeric(5,2),
  health text check (health in ('Healthy','Attention','At Risk')),
  notes text
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('client','admin')),
  client_id uuid references public.clients(id) on delete cascade,
  title text,
  constraint client_role_has_client check (role <> 'client' or client_id is not null)
);

-- Helpers. SECURITY DEFINER so policies can read profiles without recursion;
-- search_path pinned per Supabase linter guidance.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select client_id from public.profiles where id = auth.uid() and role = 'client';
$$;

revoke execute on function public.is_staff() from anon;
revoke execute on function public.my_client_id() from anon;

-- ---------- client-visible tables ----------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null, platform text, objective text,
  status text not null check (status in ('Planning','Awaiting Approval','Live','Optimising','Paused','Completed')),
  start_date date, end_date date, monthly_budget numeric(12,2)
);

create table if not exists public.weekly_metrics (
  client_id uuid not null references public.clients(id) on delete cascade,
  week_start date not null,
  spend numeric(12,2) not null default 0,
  leads int not null default 0,
  revenue numeric(14,2) not null default 0,
  primary key (client_id, week_start)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null, type text, start_date date, end_date date,
  progress int not null default 0 check (progress between 0 and 100)
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, due date,
  status text not null check (status in ('Planned','In progress','Client review','Delivered'))
);

create table if not exists public.creatives (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null, format text, platform text,
  status text not null default 'Internal review' check (status in ('Internal review','Client review','Revision requested','Approved')),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz
);

create table if not exists public.creative_versions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  creative_id uuid not null references public.creatives(id) on delete cascade,
  version int not null,
  storage_path text not null, -- clients/<client_id>/creatives/...
  created_at timestamptz not null default now(),
  unique (creative_id, version)
);

create table if not exists public.creative_comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  creative_id uuid not null references public.creatives(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.strategies (
  client_id uuid primary key references public.clients(id) on delete cascade,
  title text not null, summary text, updated_at timestamptz not null default now(),
  recommendations jsonb not null default '[]', plans jsonb not null default '[]', goals jsonb not null default '[]'
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null, cadence text check (cadence in ('Weekly','Monthly')),
  period_start date, period_end date,
  status text not null default 'Draft' check (status in ('Draft','Published')),
  summary text, highlights jsonb not null default '[]'
);

create table if not exists public.onboarding_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('info','access','asset')),
  label text not null, detail text,
  done boolean not null default false, completed_at timestamptz, answer text
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null, size_bytes bigint not null, storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  kind text check (kind in ('Contract','Proposal','Invoice','Report','Brand','Other')),
  storage_path text not null,
  client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('Update','Question','Announcement')),
  author_id uuid not null references public.profiles(id),
  body text not null check (length(body) between 1 and 2000),
  client_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null, assignee text not null check (assignee in ('client','agency')),
  owner text, due date,
  status text not null default 'Open' check (status in ('Open','In progress','Done')),
  client_visible boolean not null default false
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  number text not null unique, description text,
  amount numeric(12,2) not null, issued date not null, due date not null,
  status text not null default 'Unpaid' check (status in ('Paid','Unpaid','Overdue')),
  paid_at date, method text
);

-- ---------- staff-only tables ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company text not null, contact text, email text, phone text, source text,
  stage text not null default 'New Lead', value numeric(12,2),
  score text check (score in ('HOT','WARM','LOW')),
  owner text, next_action text, lost_reason text, notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  subject_table text not null, subject_id uuid not null,
  author_id uuid references public.profiles(id),
  body text not null, created_at timestamptz not null default now()
);

create table if not exists public.collaborator_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  collaborator text not null, description text,
  amount numeric(12,2) not null, status text not null default 'Pending'
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid, action text not null, client_id uuid, detail jsonb
);

-- ---------- RLS: default deny everywhere ----------
do $$
declare t text;
begin
  foreach t in array array['clients','clients_internal','profiles','campaigns','weekly_metrics','projects','deliverables','creatives','creative_versions','creative_comments','strategies','reports','onboarding_items','uploads','documents','messages','tasks','invoices','leads','internal_notes','collaborator_payments','audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
  end loop;
end $$;

-- Client read policies: own client only, plus per-table visibility rules.
drop policy if exists client_read on public.clients;
create policy client_read on public.clients for select to authenticated using (id = (select public.my_client_id()));

drop policy if exists self_read on public.profiles;
create policy self_read on public.profiles for select to authenticated using (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['campaigns','weekly_metrics','projects','deliverables','strategies','onboarding_items','uploads','invoices']
  loop
    execute format('drop policy if exists client_read on public.%I', t);
    execute format('create policy client_read on public.%I for select to authenticated using (client_id = (select public.my_client_id()))', t);
  end loop;
end $$;

drop policy if exists client_read on public.creatives;
create policy client_read on public.creatives for select to authenticated
  using (client_id = (select public.my_client_id()) and status <> 'Internal review');

drop policy if exists client_read on public.creative_versions;
create policy client_read on public.creative_versions for select to authenticated
  using (client_id = (select public.my_client_id()) and exists (select 1 from public.creatives c where c.id = creative_id and c.status <> 'Internal review'));

drop policy if exists client_read on public.creative_comments;
create policy client_read on public.creative_comments for select to authenticated using (client_id = (select public.my_client_id()));

drop policy if exists client_read on public.reports;
create policy client_read on public.reports for select to authenticated using (client_id = (select public.my_client_id()) and status = 'Published');

drop policy if exists client_read on public.documents;
create policy client_read on public.documents for select to authenticated using (client_id = (select public.my_client_id()) and client_visible);

drop policy if exists client_read on public.messages;
create policy client_read on public.messages for select to authenticated using (client_id = (select public.my_client_id()) and client_visible);

drop policy if exists client_read on public.tasks;
create policy client_read on public.tasks for select to authenticated using (client_id = (select public.my_client_id()) and client_visible);

-- Client writes: comments, questions, uploads. Approvals and onboarding
-- completion go through server actions using the service role after the
-- server re-checks client_id, so clients cannot set arbitrary statuses.
drop policy if exists client_comment on public.creative_comments;
create policy client_comment on public.creative_comments for insert to authenticated
  with check (client_id = (select public.my_client_id()) and author_id = (select auth.uid()));

drop policy if exists client_question on public.messages;
create policy client_question on public.messages for insert to authenticated
  with check (client_id = (select public.my_client_id()) and author_id = (select auth.uid()) and kind = 'Question' and client_visible);

drop policy if exists client_upload on public.uploads;
create policy client_upload on public.uploads for insert to authenticated
  with check (client_id = (select public.my_client_id()) and uploaded_by = (select auth.uid()) and storage_path like 'clients/' || client_id::text || '/%');

-- Indexes for the client_id filter every policy uses.
create index if not exists campaigns_client on public.campaigns(client_id);
create index if not exists projects_client on public.projects(client_id);
create index if not exists deliverables_client on public.deliverables(client_id);
create index if not exists creatives_client on public.creatives(client_id);
create index if not exists creative_versions_client on public.creative_versions(client_id);
create index if not exists creative_comments_client on public.creative_comments(client_id);
create index if not exists reports_client on public.reports(client_id);
create index if not exists onboarding_client on public.onboarding_items(client_id);
create index if not exists uploads_client on public.uploads(client_id);
create index if not exists documents_client on public.documents(client_id);
create index if not exists messages_client on public.messages(client_id);
create index if not exists tasks_client on public.tasks(client_id);
create index if not exists invoices_client on public.invoices(client_id);
