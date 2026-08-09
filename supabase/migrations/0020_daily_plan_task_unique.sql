create unique index if not exists idx_user_daily_plan_user_date_task
  on public.user_daily_plan_slots (user_id, plan_date, task_id);
