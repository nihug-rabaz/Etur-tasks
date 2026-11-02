-- Dovrut workflow redesign: status axis helpers, approval tokens, settings, news seen

alter table public.dovrut_concepts
  add column if not exists briefing_done_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists last_approval_note text;

create index if not exists idx_dovrut_concepts_archived
  on public.dovrut_concepts (archived_at)
  where archived_at is not null;

create table if not exists public.dovrut_approval_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  concept_id uuid not null references public.dovrut_concepts (id) on delete cascade,
  approval_step text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dovrut_approval_tokens_concept
  on public.dovrut_approval_tokens (concept_id);

create index if not exists idx_dovrut_approval_tokens_expires
  on public.dovrut_approval_tokens (expires_at);

create table if not exists public.dovrut_workflow_settings (
  id int primary key default 1 check (id = 1),
  phones jsonb not null default '{}'::jsonb,
  news_keywords text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.dovrut_workflow_settings (id, phones, news_keywords)
values (1, '{}'::jsonb, '{}')
on conflict (id) do nothing;

create table if not exists public.dovrut_news_seen (
  url_hash text primary key,
  url text not null,
  title text,
  keyword text,
  first_seen_at timestamptz not null default now()
);
