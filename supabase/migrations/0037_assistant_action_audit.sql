-- Assistant action audit / backup trail for "לא נייהוז"
create table if not exists public.assistant_action_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tool_name text not null,
  severity text not null default 'normal' check (severity in ('normal', 'destructive')),
  label text,
  method text,
  path text,
  args jsonb,
  before_snapshot jsonb,
  after_snapshot jsonb,
  result_ok boolean,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists assistant_action_audit_user_created_idx
  on public.assistant_action_audit (user_id, created_at desc);

create index if not exists assistant_action_audit_created_idx
  on public.assistant_action_audit (created_at desc);
