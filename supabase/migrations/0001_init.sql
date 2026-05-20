create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  telegram_id text,
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table if not exists public.subtopics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain_id uuid not null references public.domains (id) on delete cascade
);

create table if not exists public.user_subtopic_permissions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  primary key (user_id, subtopic_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_tasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
before update on public.tasks
for each row execute function public.set_tasks_updated_at();

create or replace view public.task_details as
select
  t.*,
  s.name as subtopic_name,
  d.name as domain_name,
  p.name as project_name,
  pr.name as assignee_name
from public.tasks t
join public.subtopics s on s.id = t.subtopic_id
join public.domains d on d.id = s.domain_id
left join public.projects p on p.id = t.project_id
left join public.profiles pr on pr.id = t.assigned_to;

create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_assigned_to on public.tasks (assigned_to);
create index if not exists idx_tasks_subtopic_id on public.tasks (subtopic_id);
create index if not exists idx_tasks_project_id on public.tasks (project_id);

insert into public.domains (name, slug)
values
  ('Recruitment', 'recruitment'),
  ('Positioning', 'positioning'),
  ('General', 'general')
on conflict (slug) do nothing;

insert into public.subtopics (name, domain_id)
select 'Officers', id from public.domains where slug = 'recruitment'
on conflict do nothing;
insert into public.subtopics (name, domain_id)
select 'NCOs', id from public.domains where slug = 'recruitment'
on conflict do nothing;
insert into public.subtopics (name, domain_id)
select 'Candidates', id from public.domains where slug = 'recruitment'
on conflict do nothing;
insert into public.subtopics (name, domain_id)
select 'PR', id from public.domains where slug = 'positioning'
on conflict do nothing;
insert into public.subtopics (name, domain_id)
select 'Social Media', id from public.domains where slug = 'positioning'
on conflict do nothing;
insert into public.subtopics (name, domain_id)
select 'Visits', id from public.domains where slug = 'positioning'
on conflict do nothing;
insert into public.subtopics (name, domain_id)
select 'General', id from public.domains where slug = 'general'
on conflict do nothing;
