-- User access lifecycle: pending | approved | rejected (בוטלו).

alter table public.profiles
  add column if not exists access_status text;

update public.profiles
set access_status = case
  when coalesce(is_approved, false) then 'approved'
  else 'pending'
end
where access_status is null;

alter table public.profiles
  alter column access_status set default 'pending';

alter table public.profiles
  alter column access_status set not null;

alter table public.profiles
  drop constraint if exists profiles_access_status_check;

alter table public.profiles
  add constraint profiles_access_status_check
  check (access_status in ('pending', 'approved', 'rejected'));
