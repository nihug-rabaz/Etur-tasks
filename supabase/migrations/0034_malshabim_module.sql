-- Malshabim (מלש״בים) module: candidates table for interview / board / import

create table if not exists public.malshabim_candidates (
  id uuid primary key default gen_random_uuid(),
  legacy_base44_id text unique,
  full_name text,
  phone text,
  id_number text,
  personal_number text,
  serial_number integer,
  city text,
  photo_url text,
  candidate_status text not null default 'חדש',
  advanced_status text not null default 'בטיפול',
  status_type text,
  request_type text,
  recruitment_track text,
  enlistment_date date,
  interview_at timestamptz,
  next_status_update_at timestamptz,
  observance jsonb not null default '{}'::jsonb,
  quiz_questions jsonb not null default '[]'::jsonb,
  quiz_score real,
  quiz_passed boolean not null default false,
  quiz_skipped boolean not null default false,
  interview_summary text,
  interviewer_notes text,
  instructions text,
  instruction_items jsonb not null default '[]'::jsonb,
  instruction_recipients jsonb not null default '[]'::jsonb,
  is_draft boolean not null default false,
  draft_step integer,
  update_log jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_malshabim_candidates_created_at
  on public.malshabim_candidates (created_at desc);

create index if not exists idx_malshabim_candidates_status
  on public.malshabim_candidates (candidate_status, advanced_status);

create index if not exists idx_malshabim_candidates_serial
  on public.malshabim_candidates (serial_number);

create index if not exists idx_malshabim_candidates_id_number
  on public.malshabim_candidates (id_number);

create index if not exists idx_malshabim_candidates_personal_number
  on public.malshabim_candidates (personal_number);

create index if not exists idx_malshabim_candidates_legacy
  on public.malshabim_candidates (legacy_base44_id)
  where legacy_base44_id is not null;
