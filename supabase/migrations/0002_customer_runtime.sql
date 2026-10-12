-- Runtime fields and policies needed by the Leadhaus portal.
-- Apply with `supabase db reset` locally or `supabase db push` after linking.
-- The Next.js app must use a user-scoped Supabase client; never bypass these
-- policies with the service-role key for customer requests.

-- Profiles created by Auth invitations begin unlinked and receive no client
-- data until a trusted staff provisioning step assigns client_id.
alter table public.profiles drop constraint if exists client_role_has_client;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('client','admin'));

alter table public.profiles add column if not exists email text not null default '';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role, client_id, title)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    'client',
    null,
    null
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Existing client_role_has_client was intentionally removed above so an
-- invited-but-not-yet-assigned account has no tenant access until linked.


alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists currency text not null default 'NGN';
alter table public.clients add column if not exists welcome_note text not null default '';
alter table public.clients add column if not exists onboarding_stage text not null default 'Not Started'
  check (onboarding_stage in ('Not Started','In Progress','Ready for Strategy','Ready for Launch','Complete'));
alter table public.clients add column if not exists portal_sections jsonb not null default '{"projects":true,"creative":true,"strategy":true,"reports":true,"onboarding":true,"documents":true,"messages":true,"billing":true}'::jsonb;

create table if not exists public.agency_settings (
  id boolean primary key default true check (id),
  agency_name text not null default 'Leadhaus Studios',
  support_email text not null default '',
  support_whatsapp text not null default '',
  reply_promise text not null default 'within one working day',
  bank_name text not null default '',
  bank_account_name text not null default '',
  bank_account_number text not null default '',
  announcement text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.agency_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.campaigns_internal (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  notes text not null default ''
);
create table if not exists public.projects_internal (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner text not null default '',
  capacity_note text not null default ''
);
create table if not exists public.creatives_internal (
  creative_id uuid primary key references public.creatives(id) on delete cascade,
  designer text not null default '',
  production_cost numeric(12,2) not null default 0
);
create table if not exists public.strategies_internal (
  client_id uuid primary key references public.strategies(client_id) on delete cascade,
  discussion text not null default ''
);
create table if not exists public.reports_internal (
  report_id uuid primary key references public.reports(id) on delete cascade,
  review_notes text not null default ''
);
create table if not exists public.collaborator_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  collaborator text not null,
  description text not null default '',
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'Pending' check (status in ('Paid','Pending')),
  created_at timestamptz not null default now()
);

-- Composite parent keys are defined in 0001_portal_schema.sql so a child row
-- can never be attached to a different tenant's project or creative.

alter table public.documents alter column storage_path drop not null;
alter table public.documents add column if not exists body text[] not null default '{}';
alter table public.messages alter column client_visible set default false;
alter table public.messages add column if not exists answered boolean not null default false;
alter table public.messages add column if not exists author_name text not null default '';
alter table public.tasks add column if not exists link text;
alter table public.tasks add column if not exists relates_to text;
alter table public.tasks add column if not exists client_visible boolean not null default false;
alter table public.tasks add column if not exists owner text not null default '';
alter table public.invoices add column if not exists client_marked_paid_at timestamptz;
alter table public.onboarding_items add column if not exists completed_at date;
alter table public.onboarding_items add column if not exists answer text;
alter table public.weekly_metrics add constraint weekly_metrics_nonnegative check (spend >= 0 and leads >= 0 and revenue >= 0);
alter table public.invoices add constraint invoices_positive_amount check (amount > 0);

-- Add the remaining internal-only tables to the default-deny RLS policy set.
alter table public.agency_settings enable row level security;
alter table public.campaigns_internal enable row level security;
alter table public.projects_internal enable row level security;
alter table public.creatives_internal enable row level security;
alter table public.strategies_internal enable row level security;
alter table public.reports_internal enable row level security;
alter table public.collaborator_payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['agency_settings','campaigns_internal','projects_internal','creatives_internal','strategies_internal','reports_internal','collaborator_payments']
  loop
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
  end loop;
end;
$$;

-- Staff-only atomic client provisioning called after an Auth invitation.
-- Supabase Auth invitation and this RPC cannot share one transaction, so the
-- server action deletes the invited Auth user if this RPC fails.
create or replace function public.provision_leadhaus_client(
  p_actor_id uuid,
  p_contact_email text,
  p_name text,
  p_service text,
  p_contact_name text,
  p_account_lead text,
  p_monthly_fee numeric,
  p_start_onboarding boolean,
  p_checklist jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_client_id uuid := gen_random_uuid();
  invited_profile public.profiles%rowtype;
  item jsonb;
  item_id uuid;
begin
  if auth.role() <> 'service_role' and not public.is_staff() then
    raise exception 'staff authorization required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_actor_id and p.role = 'admin') then
    raise exception 'valid staff actor required' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) < 2 or p_service not in ('Ads Management','Influencer Campaign','Creative Production','Strategy and Audit') then
    raise exception 'invalid client details' using errcode = '22023';
  end if;
  if exists (select 1 from public.clients c where lower(c.name) = lower(trim(p_name))) then
    raise exception 'client already exists' using errcode = '23505';
  end if;
  select p.* into invited_profile from public.profiles p
  where lower(p.email) = lower(trim(p_contact_email)) and p.role = 'client' and p.client_id is null
  for update;
  if invited_profile.id is null then
    raise exception 'invited account not found or already assigned' using errcode = 'P0002';
  end if;

  insert into public.clients (id,name,service,status,account_lead,contact_name,currency,renewal_date,onboarding_stage)
  values (new_client_id,trim(p_name),p_service,'Onboarding',coalesce(nullif(trim(p_account_lead),''),'Leadhaus team'),trim(p_contact_name),'NGN',current_date + 90,case when p_start_onboarding then 'In Progress' else 'Not Started' end);
  insert into public.clients_internal (client_id,monthly_fee,health,margin_pct,notes)
  values (new_client_id,greatest(coalesce(p_monthly_fee,0),0),'Healthy',0,'');
  update public.profiles set client_id = new_client_id, full_name = trim(p_contact_name)
  where id = invited_profile.id and client_id is null;
  insert into public.strategies (client_id,title,summary) values (new_client_id,'Growth strategy','We are preparing your strategy. It will appear here after kickoff.');
  insert into public.strategies_internal (client_id,discussion) values (new_client_id,'');
  insert into public.tasks (client_id,title,assignee,owner,due,status,client_visible)
  values (new_client_id,'Book kickoff call with ' || trim(p_name),'agency',coalesce(nullif(trim(p_account_lead),''),'Leadhaus team'),current_date,'Open',false);

  if p_start_onboarding then
    for item in select value from jsonb_array_elements(coalesce(p_checklist,'[]'::jsonb))
    loop
      item_id := gen_random_uuid();
      insert into public.onboarding_items (id,client_id,kind,label,detail,done)
      values (item_id,new_client_id,item->>'kind',item->>'label',coalesce(item->>'detail',''),false);
      insert into public.tasks (client_id,title,assignee,owner,due,status,client_visible,link,relates_to)
      values (new_client_id,item->>'label','client',trim(p_contact_name),current_date + 7,'Open',true,'/portal/onboarding',item_id::text);
    end loop;
    insert into public.messages (client_id,kind,author_id,author_name,body,client_visible)
    values (new_client_id,'Announcement',p_actor_id,'Leadhaus Studios','Welcome to Leadhaus Studios. Your onboarding has started. Open the Onboarding page to see what we need from you.',true);
  end if;
  insert into public.audit_log (actor_id,action,client_id) values (p_actor_id,'Created client account',new_client_id);
  return new_client_id;
end;
$$;
revoke all on function public.provision_leadhaus_client(uuid,text,text,text,text,text,numeric,boolean,jsonb) from public, anon, authenticated;
grant execute on function public.provision_leadhaus_client(uuid,text,text,text,text,text,numeric,boolean,jsonb) to service_role;

-- Clients may update only the "I have paid" marker, never invoice amount,
-- status, due date or client ownership.
revoke update on public.invoices from authenticated;
grant update (client_marked_paid_at) on public.invoices to authenticated;
drop policy if exists client_mark_invoice_paid on public.invoices;
create policy client_mark_invoice_paid on public.invoices for update to authenticated
  using (client_id = (select public.my_client_id()) and status <> 'Paid')
  with check (client_id = (select public.my_client_id()) and status <> 'Paid');

-- Prevent client inserts from setting an internal comment visible. Existing
-- insert policy additionally verifies tenant, author, and review-state parent.

-- Private, tenant-scoped object storage. Object names must start with the
-- authenticated client's UUID, e.g. <client-id>/uploads/<random-name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadhaus-client-files',
  'leadhaus-client-files',
  false,
  262144000,
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','application/pdf','image/svg+xml','application/zip']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists leadhaus_client_file_read on storage.objects;
create policy leadhaus_client_file_read on storage.objects for select to authenticated
  using (
    bucket_id = 'leadhaus-client-files'
    and (
      (select public.is_staff())
      or (
        (storage.foldername(name))[1] = 'clients'
        and (storage.foldername(name))[2] = (select public.my_client_id())::text
        and (storage.foldername(name))[3] <> 'internal'
      )
    )
  );
drop policy if exists leadhaus_client_file_insert on storage.objects;
create policy leadhaus_client_file_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'leadhaus-client-files'
    and (storage.foldername(name))[1] = 'clients'
    and (storage.foldername(name))[2] = (select public.my_client_id())::text
    and (storage.foldername(name))[3] = 'uploads'
  );
drop policy if exists leadhaus_staff_file_manage on storage.objects;
create policy leadhaus_staff_file_manage on storage.objects for all to authenticated
  using (bucket_id = 'leadhaus-client-files' and (select public.is_staff()))
  with check (bucket_id = 'leadhaus-client-files' and (select public.is_staff()));

create index if not exists profiles_client_id on public.profiles(client_id);
create index if not exists invoices_client_status on public.invoices(client_id, status);
create index if not exists messages_client_created on public.messages(client_id, created_at desc);
create index if not exists tasks_client_status_due on public.tasks(client_id, status, due);
create index if not exists uploads_storage_path on public.uploads(storage_path);

-- Keep the customer portal's upload metadata in sync with successful private
-- Storage uploads. Failed storage writes never create an uploads row.
create or replace function public.record_leadhaus_client_upload()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  path_parts text[] := string_to_array(new.name, '/');
  owning_client uuid;
begin
  if new.bucket_id <> 'leadhaus-client-files'
     or array_length(path_parts, 1) < 4
     or path_parts[1] <> 'clients'
     or path_parts[3] <> 'uploads'
     or new.owner is null then
    return new;
  end if;
  owning_client := path_parts[2]::uuid;
  insert into public.uploads (client_id, name, size_bytes, storage_path, uploaded_by)
  select owning_client, path_parts[array_length(path_parts, 1)],
         coalesce((new.metadata ->> 'size')::bigint, 0), new.name, new.owner::uuid
  where exists (select 1 from public.profiles p where p.id = new.owner::uuid and p.client_id = owning_client);
  return new;
end;
$$;
revoke all on function public.record_leadhaus_client_upload() from public, anon, authenticated;
drop trigger if exists record_leadhaus_client_upload on storage.objects;
create trigger record_leadhaus_client_upload
after insert on storage.objects
for each row execute function public.record_leadhaus_client_upload();

-- Explicit SQL grants complement RLS. These grants do not bypass policies;
-- tables remain inaccessible unless a matching policy authorizes the row.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
