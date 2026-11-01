-- Replace pre-screening "פז״ם" with "תאריך שחרור" (date field).
alter table public.agam_questionnaire_questions
  drop constraint if exists agam_questionnaire_questions_field_type_check;

alter table public.agam_questionnaire_questions
  add constraint agam_questionnaire_questions_field_type_check
  check (field_type in ('text', 'number', 'select', 'textarea', 'date'));

update public.agam_questionnaire_questions
set
  question_text = 'תאריך שחרור',
  field_key = 'release_date',
  field_type = 'date',
  updated_at = now()
where question_type = 'pre_screening'
  and field_key = 'pazam_months';
