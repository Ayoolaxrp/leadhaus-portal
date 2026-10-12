insert into public.agency_settings (id, agency_name, support_email)
values (true, 'Leadhaus Studios', 'hello@example.invalid')
on conflict (id) do nothing;
