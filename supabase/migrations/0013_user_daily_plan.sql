create table if not exists public.user_daily_plan_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  plan_date date not null,
  hour smallint not null check (hour >= 0 and hour <= 23),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date, hour)
);

create index if not exists idx_user_daily_plan_user_date on public.user_daily_plan_slots (user_id, plan_date);
