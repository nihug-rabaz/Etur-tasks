-- Revert tasks.cancelled status (added by mistake).
alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('in_progress', 'completed'));
