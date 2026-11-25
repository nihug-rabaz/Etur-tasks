-- Deleting a user keeps their officer evaluations and interviews; the evaluator_name
-- snapshot stays as the record of who wrote them.

alter table public.agam_day_evaluations
  alter column evaluator_id drop not null;

alter table public.agam_preparation_day_evaluations
  alter column evaluator_id drop not null;

alter table public.agam_smach_evaluations
  alter column evaluator_id drop not null;

alter table public.agam_day_evaluations
  drop constraint if exists agam_day_evaluations_evaluator_id_fkey,
  add constraint agam_day_evaluations_evaluator_id_fkey
    foreign key (evaluator_id) references public.profiles (id) on delete set null;

alter table public.agam_preparation_day_evaluations
  drop constraint if exists agam_preparation_day_evaluations_evaluator_id_fkey,
  add constraint agam_preparation_day_evaluations_evaluator_id_fkey
    foreign key (evaluator_id) references public.profiles (id) on delete set null;

alter table public.agam_smach_evaluations
  drop constraint if exists agam_smach_evaluations_evaluator_id_fkey,
  add constraint agam_smach_evaluations_evaluator_id_fkey
    foreign key (evaluator_id) references public.profiles (id) on delete set null;

alter table public.agam_interviews
  drop constraint if exists agam_interviews_evaluator_id_fkey,
  add constraint agam_interviews_evaluator_id_fkey
    foreign key (evaluator_id) references public.profiles (id) on delete set null;
