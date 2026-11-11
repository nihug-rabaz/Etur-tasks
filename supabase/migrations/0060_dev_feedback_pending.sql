-- Local pending store for משימה לפיתוח — Jira only after Kobi approves (or when Kobi submits).

create table if not exists public.dev_feedback_pending (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  module_id text not null,
  page_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitter_id uuid references public.profiles (id) on delete set null,
  submitter_name text,
  submitter_email text,
  kobi_notes text,
  jira_issue_key text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dev_feedback_pending_status_created_idx
  on public.dev_feedback_pending (status, created_at desc);

create table if not exists public.dev_feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  pending_id uuid not null references public.dev_feedback_pending (id) on delete cascade,
  filename text not null,
  content_type text not null default 'application/octet-stream',
  blob_url text,
  data_base64 text,
  created_at timestamptz not null default now(),
  check (blob_url is not null or data_base64 is not null)
);

create index if not exists dev_feedback_attachments_pending_idx
  on public.dev_feedback_attachments (pending_id);
