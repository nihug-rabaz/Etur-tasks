alter table public.user_daily_plan_slots
add column if not exists is_done boolean not null default false;
