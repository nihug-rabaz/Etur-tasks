alter table public.agam_candidates
  add column if not exists command text,
  add column if not exists direct_commander_name text,
  add column if not exists gaps text,
  add column if not exists planning_index integer,
  add column if not exists dapar integer,
  add column if not exists rank_color text check (rank_color is null or rank_color in ('green', 'orange', 'red')),
  add column if not exists needs_sakmar boolean,
  add column if not exists mabdak_approval boolean,
  add column if not exists medical_issue boolean,
  add column if not exists internet_test boolean,
  add column if not exists pre_bahad1_checklist jsonb not null default '{}'::jsonb;

alter table public.agam_cycles
  add column if not exists cohort_year integer,
  add column if not exists archived boolean not null default false;

create index if not exists idx_agam_cycles_archived_date on public.agam_cycles (archived, cycle_date desc);

alter table public.tasks
  drop constraint if exists tasks_origin_check;

alter table public.tasks
  add constraint tasks_origin_check check (origin in ('tasks', 'dovrut', 'agam'));

alter table public.tasks
  add column if not exists agam_candidate_id uuid references public.agam_candidates (id) on delete set null,
  add column if not exists agam_cycle_id uuid references public.agam_cycles (id) on delete set null;

create index if not exists idx_tasks_agam_candidate on public.tasks (agam_candidate_id);
create index if not exists idx_tasks_agam_cycle on public.tasks (agam_cycle_id);

insert into public.subtopics (name, domain_id)
select 'איתור קצונה', id from public.domains where slug = 'recruitment'
on conflict do nothing;

insert into public.user_subtopic_permissions (user_id, subtopic_id)
select umr.user_id, s.id
from public.user_module_roles umr
join public.subtopics s on s.name = 'איתור קצונה'
where umr.module_id = 'agam'
on conflict do nothing;

create table if not exists public.agam_timeline_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_type text not null default 'general'
    check (event_type in ('hasbara', 'selection_day', 'prep_day', 'smach', 'mabdak', 'bahad1', 'general')),
  notes text,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agam_timeline_events_date on public.agam_timeline_events (event_date asc);

insert into public.agam_questionnaire_questions (
  question_type, section_number, section_name, question_text, field_key, field_type,
  options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active
)
values
  ('pre_screening', 2, 'שירות', 'שם המפקד הישיר', 'direct_commander_name', 'text', null, false, null, null, null, 5, true),
  ('pre_screening', 4, 'כנס הסברה', 'האם השתתפת בכנס הסברה?', 'hasbara_attended', 'select', '["כן","לא"]', false, null, null, null, 1, true),
  ('pre_screening', 4, 'כנס הסברה', 'האם ביצעת מבחן אינטרנטי?', 'internet_test', 'select', '["כן","לא"]', false, null, null, null, 2, true),
  ('pre_screening', 5, 'התניות', 'האם צריך סכמר?', 'needs_sakmar', 'select', '["כן","לא"]', false, null, null, null, 1, true),
  ('pre_screening', 5, 'התניות', 'האם יש אישור למבדק?', 'mabdak_approval', 'select', '["כן","לא"]', false, null, null, null, 2, true),
  ('pre_screening', 5, 'התניות', 'האם קיימת בעיה רפואית?', 'medical_issue', 'select', '["כן","לא"]', false, null, null, null, 3, true),
  ('pre_screening', 5, 'התניות', 'מדד תכנוני', 'planning_index', 'number', null, false, null, null, null, 4, true),
  ('pre_screening', 5, 'התניות', 'דפ״ר', 'dapar', 'number', null, false, null, null, null, 5, true)
on conflict do nothing;
