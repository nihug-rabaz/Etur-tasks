alter table public.dovrut_projects
  add column if not exists ended_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.dovrut_projects drop constraint if exists dovrut_projects_status_check;
alter table public.dovrut_projects
  add constraint dovrut_projects_status_check
  check (status in ('active', 'completed', 'on_hold', 'draft'));

create index if not exists idx_dovrut_projects_deleted on public.dovrut_projects (deleted_at);
create index if not exists idx_dovrut_projects_ended on public.dovrut_projects (ended_at);

alter table public.dovrut_concepts
  add column if not exists deleted_at timestamptz,
  add column if not exists is_draft boolean not null default false,
  add column if not exists last_opened_at timestamptz,
  add column if not exists target_audiences text[] not null default '{}',
  add column if not exists domains text[] not null default '{}';

update public.dovrut_concepts
set target_audiences = array[target_audience]
where coalesce(target_audience, '') <> ''
  and cardinality(target_audiences) = 0;

update public.dovrut_concepts
set domains = array[domain]
where domain is not null
  and cardinality(domains) = 0;

create index if not exists idx_dovrut_concepts_deleted on public.dovrut_concepts (deleted_at);
create index if not exists idx_dovrut_concepts_draft on public.dovrut_concepts (is_draft);
create index if not exists idx_dovrut_concepts_opened on public.dovrut_concepts (last_opened_at);
