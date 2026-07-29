alter table public.user_daily_plan_slots
add column if not exists duration_minutes smallint not null default 60;

alter table public.user_daily_plan_slots
drop constraint if exists user_daily_plan_slots_duration_minutes_check;

alter table public.user_daily_plan_slots
add constraint user_daily_plan_slots_duration_minutes_check
check (duration_minutes in (15, 30, 45, 60));
