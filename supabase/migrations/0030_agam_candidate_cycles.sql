create table if not exists public.agam_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cycle_date date not null,
  notes text,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agam_cycles_date on public.agam_cycles (cycle_date desc);

alter table public.agam_candidates
  add column if not exists cycle_id uuid references public.agam_cycles (id) on delete set null;

create index if not exists idx_agam_candidates_cycle_id on public.agam_candidates (cycle_id);
