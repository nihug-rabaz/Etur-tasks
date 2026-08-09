-- P0/P2 dovrut: status machine, item fields, campaigns, task link

-- 1) Map legacy work statuses before tightening checks
update public.dovrut_concepts
set work_status_article = case work_status_article
  when 'waiting_spokesperson' then 'waiting_approvals'
  when 'waiting_publish' then 'approved'
  when 'published' then 'approved'
  else work_status_article
end
where work_status_article is not null;

update public.dovrut_concepts
set work_status_social = case work_status_social
  when 'waiting_approval' then 'waiting_approvals'
  when 'waiting_publish' then 'approved'
  when 'published' then 'approved'
  else work_status_social
end
where work_status_social is not null;

update public.dovrut_concepts
set work_status_article = 'approved'
where type = 'article_interview'
  and approval_status = 'approved'
  and work_status_article is distinct from 'approved';

-- 2) New columns for item workflow
alter table public.dovrut_concepts
  add column if not exists interviewer text;

alter table public.dovrut_concepts
  add column if not exists requires_chief_rabbi boolean not null default true;

alter table public.dovrut_concepts
  add column if not exists requires_deputy_commander boolean not null default true;

alter table public.dovrut_concepts
  add column if not exists requires_branch_head boolean not null default false;

alter table public.dovrut_concepts
  add column if not exists linked_task_id uuid references public.tasks (id) on delete set null;

alter table public.dovrut_concepts
  add column if not exists target_audience text;

alter table public.dovrut_concepts
  alter column needs_briefing set default true;

-- Backfill approval flags from legacy domain flows
update public.dovrut_concepts
set
  requires_branch_head = domain in ('kashrut', 'halacha', 'reut'),
  requires_deputy_commander = true,
  requires_chief_rabbi = true
where type = 'article_interview';

-- 3) Tighten work status checks
alter table public.dovrut_concepts drop constraint if exists dovrut_concepts_work_status_article_check;
alter table public.dovrut_concepts
  add constraint dovrut_concepts_work_status_article_check
  check (
    work_status_article is null
    or work_status_article in ('planning', 'production', 'waiting_approvals', 'approved')
  );

alter table public.dovrut_concepts drop constraint if exists dovrut_concepts_work_status_social_check;
alter table public.dovrut_concepts
  add constraint dovrut_concepts_work_status_social_check
  check (
    work_status_social is null
    or work_status_social in ('planning', 'production', 'waiting_approvals', 'approved')
  );

-- Keep approval_status values used by role queues; drop unused spokesperson/command from new creates via app logic

-- 4) Campaigns (P2)
create table if not exists public.dovrut_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'on_hold')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dovrut_projects
  add column if not exists campaign_id uuid references public.dovrut_campaigns (id) on delete set null;

create index if not exists idx_dovrut_projects_campaign on public.dovrut_projects (campaign_id);
create index if not exists idx_dovrut_concepts_linked_task on public.dovrut_concepts (linked_task_id);

-- 5) Audience messages tab storage
create table if not exists public.dovrut_audience_messages (
  id uuid primary key default gen_random_uuid(),
  audience text not null,
  domain text,
  title text not null,
  body text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dovrut_audience_messages_audience
  on public.dovrut_audience_messages (audience);
