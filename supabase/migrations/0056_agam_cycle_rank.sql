-- Manual ranking of candidates within their cycle (1 = top).
alter table public.agam_candidates
  add column if not exists cycle_rank integer;

create index if not exists agam_candidates_cycle_rank_idx
  on public.agam_candidates (cycle_id, cycle_rank);
