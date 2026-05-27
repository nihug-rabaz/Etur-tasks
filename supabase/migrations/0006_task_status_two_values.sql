-- Collapse task status options to only in_progress and completed.
-- Any existing 'open' tasks become 'in_progress'.

update public.tasks
set status = 'in_progress'
where status = 'open';

alter table public.tasks
  alter column status drop default;

alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('in_progress', 'completed'));

alter table public.tasks
  alter column status set default 'in_progress';
