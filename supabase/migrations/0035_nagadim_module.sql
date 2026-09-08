-- Nagadim (נגדים) module: pipeline candidates, stage events, gap positions

create table if not exists public.nagadim_candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  notes text,
  current_stage text not null default 'מוקד איתור',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nagadim_candidates_created_at
  on public.nagadim_candidates (created_at desc);

create index if not exists idx_nagadim_candidates_stage
  on public.nagadim_candidates (current_stage);

create table if not exists public.nagadim_stage_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.nagadim_candidates (id) on delete cascade,
  stage text not null,
  person_name text,
  event_date date,
  notes text,
  command text,
  unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_nagadim_stage_events_candidate
  on public.nagadim_stage_events (candidate_id, stage, event_date desc nulls last, created_at desc);

create table if not exists public.nagadim_positions (
  id uuid primary key default gen_random_uuid(),
  command text,
  division text,
  brigade text,
  unit text,
  activity_level text,
  gap_status text not null default 'open'
    check (gap_status in ('open', 'closed', 'permanently_closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nagadim_positions_gap_status
  on public.nagadim_positions (gap_status, created_at desc);

create index if not exists idx_nagadim_positions_command
  on public.nagadim_positions (command);

create table if not exists public.nagadim_position_candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.nagadim_positions (id) on delete cascade,
  full_name text not null,
  decision text,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_nagadim_position_candidates_position
  on public.nagadim_position_candidates (position_id, sort_order, created_at);
