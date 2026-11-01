-- Per-cycle schedule dates (selection day, fitness tests, prep day, smach range, bahad1 intake)

alter table public.agam_cycles
  add column if not exists schedule jsonb not null default '{}'::jsonb;

alter table public.agam_timeline_events
  drop constraint if exists agam_timeline_events_event_type_check;
alter table public.agam_timeline_events
  add constraint agam_timeline_events_event_type_check
  check (event_type in ('hasbara', 'selection_day', 'fitness_test', 'prep_day', 'theory_test', 'smach', 'mabdak', 'bahad1', 'general'));

alter table public.agam_timeline_templates
  drop constraint if exists agam_timeline_templates_event_type_check;
alter table public.agam_timeline_templates
  add constraint agam_timeline_templates_event_type_check
  check (event_type in ('hasbara', 'selection_day', 'fitness_test', 'prep_day', 'theory_test', 'smach', 'mabdak', 'bahad1', 'general'));
