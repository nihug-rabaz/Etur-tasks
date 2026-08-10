alter table public.tasks
  add column if not exists origin text not null default 'tasks'
    check (origin in ('tasks', 'dovrut'));

alter table public.tasks
  add column if not exists dovrut_campaign_id uuid references public.dovrut_campaigns (id) on delete set null;

alter table public.tasks
  add column if not exists dovrut_project_id uuid references public.dovrut_projects (id) on delete set null;

alter table public.tasks
  add column if not exists dovrut_concept_id uuid references public.dovrut_concepts (id) on delete set null;

create index if not exists idx_tasks_origin on public.tasks (origin);
create index if not exists idx_tasks_dovrut_campaign on public.tasks (dovrut_campaign_id);
create index if not exists idx_tasks_dovrut_project on public.tasks (dovrut_project_id);
create index if not exists idx_tasks_dovrut_concept on public.tasks (dovrut_concept_id);
