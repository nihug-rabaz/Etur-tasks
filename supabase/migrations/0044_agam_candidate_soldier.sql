-- Candidate-soldier role + email link for Agam self-service

alter table public.user_module_roles
  drop constraint if exists user_module_roles_role_check;

alter table public.user_module_roles
  add constraint user_module_roles_role_check
  check (role in ('admin', 'user', 'approver', 'viewer', 'ramad', 'candidate'));

alter table public.agam_candidates
  add column if not exists email text;

alter table public.agam_candidates
  add column if not exists linked_user_id uuid references public.profiles (id) on delete set null;

-- Backfill from questionnaire
update public.agam_candidates
set email = nullif(lower(trim(questionnaire_data->>'civilian_email')), '')
where email is null
  and questionnaire_data ? 'civilian_email'
  and nullif(trim(questionnaire_data->>'civilian_email'), '') is not null;

create unique index if not exists idx_agam_candidates_email_unique
  on public.agam_candidates (lower(email))
  where email is not null and email <> '';

create index if not exists idx_agam_candidates_linked_user
  on public.agam_candidates (linked_user_id)
  where linked_user_id is not null;

-- Ensure the email question is clearly labeled and required
update public.agam_questionnaire_questions
set
  question_text = 'מייל',
  is_required = true,
  is_active = true,
  updated_at = now()
where field_key = 'civilian_email'
  and question_type = 'pre_screening';

insert into public.agam_questionnaire_questions (
  question_type, section_number, section_name, question_text, field_key, field_type,
  options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active
)
select
  'pre_screening', 3, 'פרטי קשר ותפקיד', 'מייל', 'civilian_email', 'text',
  null, true, null, null, null, 1, true
where not exists (
  select 1 from public.agam_questionnaire_questions
  where field_key = 'civilian_email' and question_type = 'pre_screening'
);
