alter table public.profiles
add column if not exists daily_plan_slot_minutes smallint not null default 60;

alter table public.profiles
drop constraint if exists profiles_daily_plan_slot_minutes_check;

alter table public.profiles
add constraint profiles_daily_plan_slot_minutes_check
check (daily_plan_slot_minutes in (15, 30, 60));

alter table public.user_daily_plan_slots
add column if not exists start_minute smallint;

update public.user_daily_plan_slots
set start_minute = hour * 60
where start_minute is null;

alter table public.user_daily_plan_slots
drop constraint if exists user_daily_plan_slots_user_id_plan_date_hour_key;

alter table public.user_daily_plan_slots
drop column if exists hour;

alter table public.user_daily_plan_slots
alter column start_minute set not null;

alter table public.user_daily_plan_slots
drop constraint if exists user_daily_plan_slots_user_id_plan_date_start_minute_key;

alter table public.user_daily_plan_slots
add constraint user_daily_plan_slots_user_id_plan_date_start_minute_key
unique (user_id, plan_date, start_minute);
