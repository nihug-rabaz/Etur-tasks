-- Recurring timeline events per cycle (templates with day_offset from cycle_date)

create table if not exists public.agam_timeline_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'general'
    check (event_type in ('hasbara', 'selection_day', 'prep_day', 'smach', 'mabdak', 'bahad1', 'general')),
  day_offset integer not null default 0,
  notes text,
  sort_order integer not null default 0,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agam_timeline_templates_sort
  on public.agam_timeline_templates (sort_order asc, day_offset asc);

alter table public.agam_timeline_events
  add column if not exists cycle_id uuid references public.agam_cycles (id) on delete cascade;

create index if not exists idx_agam_timeline_events_cycle
  on public.agam_timeline_events (cycle_id);

-- Seed default recurring track if templates table is empty
insert into public.agam_timeline_templates (title, event_type, day_offset, notes, sort_order)
select v.title, v.event_type, v.day_offset, null, v.sort_order
from (values
  ('כנס הסברה', 'hasbara'::text, -21, 10),
  ('יום מיונים', 'selection_day', 0, 20),
  ('יום מכין', 'prep_day', 7, 30),
  ('סמ״ח', 'smach', 14, 40),
  ('מבדק', 'mabdak', 21, 50),
  ('בה״ד 1', 'bahad1', 28, 60)
) as v(title, event_type, day_offset, sort_order)
where not exists (select 1 from public.agam_timeline_templates limit 1);

-- Drop undated legacy rows (replaced by templates)
delete from public.agam_timeline_events where event_date is null;
