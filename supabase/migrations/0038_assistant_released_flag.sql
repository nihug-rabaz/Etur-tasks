-- Seed locked state for "לא נייהוז" (missing key also means locked in app code).
insert into public.app_settings (key, value)
values ('assistant_released', 'false')
on conflict (key) do nothing;
