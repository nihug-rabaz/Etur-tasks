-- קצינים overhaul: timeline templates, dual-part interview, questionnaire fields, subtopic rename

-- Timeline: nullable date + sort order (template rows always shown)
alter table public.agam_timeline_events
  alter column event_date drop not null;

alter table public.agam_timeline_events
  add column if not exists sort_order integer not null default 0;

drop index if exists idx_agam_timeline_events_date;
create index if not exists idx_agam_timeline_events_sort
  on public.agam_timeline_events (sort_order asc, event_date asc nulls last);

-- Dual-part interview (candidate half + screener half)
alter table public.agam_interviews
  add column if not exists candidate_part jsonb,
  add column if not exists candidate_part_completed_at timestamptz,
  add column if not exists evaluator_part_completed_at timestamptz;

alter table public.agam_interviews
  alter column evaluator_id drop not null;

-- Candidate profile: תפקיד מפקד ישיר
alter table public.agam_candidates
  add column if not exists direct_commander_role text;

-- Questions: staff-only flag (section 5 התניות)
alter table public.agam_questionnaire_questions
  add column if not exists is_staff_only boolean not null default false;

update public.agam_questionnaire_questions
set is_active = false, updated_at = now()
where field_key in ('commander_name', 'internet_test');

update public.agam_questionnaire_questions
set question_text = 'שם קצין או קצינת שלישות', updated_at = now()
where field_key = 'religious_officer_logistics';

update public.agam_questionnaire_questions
set is_staff_only = true, updated_at = now()
where question_type = 'pre_screening' and section_number = 5;

insert into public.agam_questionnaire_questions (
  question_type, section_number, section_name, question_text, field_key, field_type,
  options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active, is_staff_only
)
select
  'pre_screening', 2, 'שירות', 'תפקיד מפקד ישיר', 'direct_commander_role', 'text',
  null, false, null, null, null, 6, true, false
where not exists (
  select 1 from public.agam_questionnaire_questions where field_key = 'direct_commander_role'
);

-- Rename agam tasks subtopic to קצינים (keep legacy name lookup in code)
update public.subtopics
set name = 'קצינים'
where name = 'איתור קצונה';

insert into public.subtopics (name, domain_id)
select 'קצינים', id from public.domains where slug = 'recruitment'
  and not exists (select 1 from public.subtopics where name = 'קצינים')
on conflict do nothing;

-- Ensure a project «קצונה» under the קצינים subtopic
insert into public.projects (name, description, subtopic_id, status)
select 'קצונה', 'משימות אפליקציית קצינים', s.id, 'active'
from public.subtopics s
where s.name in ('קצינים', 'איתור קצונה')
  and not exists (
    select 1 from public.projects p
    where p.subtopic_id = s.id and p.name = 'קצונה'
  )
limit 1;

-- Seed default timeline template events if table is empty
insert into public.agam_timeline_events (title, event_date, event_type, sort_order, notes)
select v.title, null, v.event_type, v.sort_order, null
from (values
  ('כנס הסברה', 'hasbara'::text, 10),
  ('יום מיונים', 'selection_day', 20),
  ('יום מכין', 'prep_day', 30),
  ('סמ״ח', 'smach', 40),
  ('מבדק', 'mabdak', 50),
  ('בה״ד 1', 'bahad1', 60)
) as v(title, event_type, sort_order)
where not exists (select 1 from public.agam_timeline_events limit 1);
