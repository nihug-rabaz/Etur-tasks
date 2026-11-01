alter table public.agam_candidates
  add column if not exists remaining_cycles text;

alter table public.agam_candidates
  drop constraint if exists agam_candidates_remaining_cycles_check;

alter table public.agam_candidates
  add constraint agam_candidates_remaining_cycles_check
  check (
    remaining_cycles is null
    or remaining_cycles in ('0', '1', '2', '2+')
  );

alter table public.agam_candidates
  add column if not exists kahas integer;

alter table public.agam_candidates
  drop constraint if exists agam_candidates_kahas_check;

alter table public.agam_candidates
  add constraint agam_candidates_kahas_check
  check (kahas is null or kahas in (40, 41, 42, 43));
