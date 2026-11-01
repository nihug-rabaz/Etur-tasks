alter table public.agam_preparation_day_evaluations
  add column if not exists passed boolean;

alter table public.agam_smach_evaluations
  add column if not exists passed boolean;
