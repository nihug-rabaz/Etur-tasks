-- Per-cycle open dates for scheduled candidate exams: { "<exam_id>": "YYYY-MM-DD" }.
-- A missing key falls back to the cycle's prep_day schedule date.
alter table public.agam_cycles
  add column if not exists exam_openings jsonb not null default '{}'::jsonb;
