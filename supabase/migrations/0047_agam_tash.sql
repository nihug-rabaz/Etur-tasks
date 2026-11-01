alter table public.agam_candidates
  add column if not exists tash integer;

alter table public.agam_candidates
  drop constraint if exists agam_candidates_tash_check;

alter table public.agam_candidates
  add constraint agam_candidates_tash_check
  check (tash is null or tash between 1 and 7);
