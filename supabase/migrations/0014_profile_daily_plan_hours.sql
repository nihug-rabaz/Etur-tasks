alter table public.profiles
add column if not exists daily_plan_hour_start smallint not null default 6;

alter table public.profiles
add column if not exists daily_plan_hour_end smallint not null default 22;

alter table public.profiles
drop constraint if exists profiles_daily_plan_hour_start_check;

alter table public.profiles
add constraint profiles_daily_plan_hour_start_check
check (daily_plan_hour_start >= 0 and daily_plan_hour_start <= 23);

alter table public.profiles
drop constraint if exists profiles_daily_plan_hour_end_check;

alter table public.profiles
add constraint profiles_daily_plan_hour_end_check
check (daily_plan_hour_end >= 0 and daily_plan_hour_end <= 23);
