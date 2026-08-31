alter table public.agam_candidate_timeline
  add column if not exists created_by_id uuid references public.profiles (id) on delete set null;

create index if not exists idx_agam_candidate_timeline_created_by
  on public.agam_candidate_timeline (created_by_id);
