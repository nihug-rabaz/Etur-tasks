-- Discharge date (תאריך שחרור) replaces "remaining cycles" in the candidate profile UI

alter table public.agam_candidates
  add column if not exists release_date date;
