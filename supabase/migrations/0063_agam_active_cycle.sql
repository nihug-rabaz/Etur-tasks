-- The cycle evaluators (ממיינים) work on. Null → nearest upcoming cycle by date.
alter table public.agam_org_settings
  add column if not exists active_cycle_id uuid references public.agam_cycles(id) on delete set null;
