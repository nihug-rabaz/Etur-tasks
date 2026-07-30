alter table public.user_daily_plan_slots
drop constraint if exists user_daily_plan_slots_duration_minutes_check;

alter table public.user_daily_plan_slots
add constraint user_daily_plan_slots_duration_minutes_check
check (duration_minutes between 1 and 1440);
