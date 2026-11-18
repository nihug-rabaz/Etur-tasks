-- Candidate knowledge exams (מקראות / נשק) — attempt persistence for /agam/me
create table if not exists public.agam_candidate_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.agam_candidates (id) on delete cascade,
  exam_id text not null,
  answers jsonb not null default '{}'::jsonb,
  answered_count integer not null default 0,
  question_count integer not null default 0,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agam_candidate_exam_attempts_candidate_idx
  on public.agam_candidate_exam_attempts (candidate_id);

create index if not exists agam_candidate_exam_attempts_candidate_exam_idx
  on public.agam_candidate_exam_attempts (candidate_id, exam_id);

create unique index if not exists agam_candidate_exam_attempts_active_uidx
  on public.agam_candidate_exam_attempts (candidate_id, exam_id)
  where status = 'in_progress';
