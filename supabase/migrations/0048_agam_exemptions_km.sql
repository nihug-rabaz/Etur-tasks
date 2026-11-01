alter table public.agam_candidates
  add column if not exists exemptions text;

alter table public.agam_candidates
  add column if not exists km text;
