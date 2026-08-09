-- Modular platform: dovrut module tables + shared module roles

create table if not exists public.user_module_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_id text not null,
  role text not null check (role in ('admin', 'user', 'approver')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create index if not exists idx_user_module_roles_module on public.user_module_roles (module_id);

create table if not exists public.dovrut_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  target_audiences text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'completed', 'on_hold')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dovrut_concepts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_id uuid not null references public.dovrut_projects (id) on delete cascade,
  type text not null check (type in ('article_interview', 'social_media')),
  domain text check (domain in (
    'kashrut', 'halacha', 'reut', 'tipuch', 'lehaka', 'zuq', 'masan',
    'agam_hachsharot', 'logistic', 'field'
  )),
  interviewees text[] not null default '{}',
  media_outlet text,
  needs_briefing boolean not null default false,
  link text,
  details text,
  notes text,
  work_status_article text check (work_status_article in (
    'planning', 'production', 'waiting_approvals', 'waiting_spokesperson',
    'waiting_publish', 'published'
  )),
  content_type text check (content_type in ('carousel', 'video', 'image', 'reels', 'text')),
  draft_text text,
  draft_images text[] not null default '{}',
  draft_videos text[] not null default '{}',
  partners text[] not null default '{}',
  work_status_social text check (work_status_social in (
    'planning', 'production', 'waiting_approval', 'waiting_publish', 'published'
  )),
  approval_status text check (approval_status in (
    'waiting_spokesperson_officer', 'waiting_branch_head', 'waiting_deputy_commander',
    'waiting_chief_rabbi', 'waiting_command_rabbi', 'approved'
  )),
  rejection_reason text,
  rejected_at_step text,
  last_rejection_date timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dovrut_concepts_project on public.dovrut_concepts (project_id);
create index if not exists idx_dovrut_concepts_approval on public.dovrut_concepts (approval_status);
create index if not exists idx_dovrut_concepts_type on public.dovrut_concepts (type);

create table if not exists public.dovrut_activity_logs (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid references public.dovrut_concepts (id) on delete set null,
  project_id uuid references public.dovrut_projects (id) on delete set null,
  action_type text not null check (action_type in (
    'created', 'updated', 'status_changed', 'approval_changed', 'deleted'
  )),
  field_changed text,
  old_value text,
  new_value text,
  details text,
  user_name text not null,
  user_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dovrut_activity_concept on public.dovrut_activity_logs (concept_id);

create table if not exists public.dovrut_approver_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Grant default tasks module access to existing approved users
insert into public.user_module_roles (user_id, module_id, role)
select id, 'tasks', case when role = 'admin' then 'admin' else 'user' end
from public.profiles
where coalesce(is_approved, true) = true
on conflict (user_id, module_id) do nothing;

-- Platform admins get dovrut admin by default
insert into public.user_module_roles (user_id, module_id, role)
select id, 'dovrut', 'admin'
from public.profiles
where role = 'admin'
on conflict (user_id, module_id) do nothing;
