create table if not exists public.task_close_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete restrict,
  note text null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid null references public.profiles (id) on delete set null,
  review_note text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_task_close_requests_one_pending
  on public.task_close_requests (task_id)
  where status = 'pending';

create index if not exists idx_task_close_requests_status_created
  on public.task_close_requests (status, created_at desc);

create index if not exists idx_task_close_requests_requester
  on public.task_close_requests (requested_by, status);
