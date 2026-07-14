create table if not exists public.task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint task_messages_body_not_blank check (char_length(trim(body)) > 0)
);

create index if not exists idx_task_messages_task_created
  on public.task_messages (task_id, created_at);
