alter table public.user_module_roles
  drop constraint if exists user_module_roles_role_check;

alter table public.user_module_roles
  add constraint user_module_roles_role_check
  check (role in ('admin', 'user', 'approver', 'viewer', 'ramad'));

create table if not exists public.agam_org_settings (
  id uuid primary key default gen_random_uuid(),
  logo_url text,
  unit_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agam_candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  personal_number text not null,
  phone text,
  questionnaire_data jsonb,
  status text not null default 'pending' check (status in ('pending', 'passed', 'not_passed')),
  ramad_notes text,
  archived boolean not null default false,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agam_candidates_archived on public.agam_candidates (archived, created_at desc);
create index if not exists idx_agam_candidates_identity on public.agam_candidates (personal_number, phone);

create table if not exists public.agam_day_evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  bullets text,
  weight real not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agam_day_evaluations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.agam_candidates (id) on delete cascade,
  evaluator_id uuid not null references public.profiles (id) on delete cascade,
  evaluator_name text,
  scores_data jsonb,
  feedback_data jsonb,
  final_score real,
  final_feedback text,
  weighted_score real,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agam_preparation_day_evaluations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.agam_candidates (id) on delete cascade,
  evaluator_id uuid not null references public.profiles (id) on delete cascade,
  evaluator_name text,
  mikra_score real,
  conversation_score real,
  conversation_feedback text,
  social_dynamics_score real,
  social_dynamics_feedback text,
  general_impression text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, evaluator_id)
);

create table if not exists public.agam_smach_evaluations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.agam_candidates (id) on delete cascade,
  evaluator_id uuid not null references public.profiles (id) on delete cascade,
  evaluator_name text,
  threshold_tests jsonb,
  professional_scores jsonb,
  professional_feedback jsonb,
  weighted_score real,
  key_points text,
  decision text check (decision is null or decision in ('מומלץ', 'מומלץ בהסתייגות', 'לא מומלץ')),
  decision_reasoning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, evaluator_id)
);

create table if not exists public.agam_interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.agam_candidates (id) on delete cascade,
  evaluator_id uuid not null references public.profiles (id) on delete cascade,
  evaluator_name text,
  interview_data jsonb,
  evaluator_assessment text,
  recommendation text check (
    recommendation is null or recommendation in ('ממליץ', 'ממליץ בהסתייגות', 'לא ממליץ')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agam_questionnaire_questions (
  id uuid primary key default gen_random_uuid(),
  question_type text not null default 'pre_screening' check (question_type in ('pre_screening', 'interview')),
  section_number integer not null,
  section_name text,
  question_text text not null,
  field_key text not null,
  field_type text not null check (field_type in ('text', 'number', 'select', 'textarea')),
  options text,
  is_required boolean not null default true,
  condition_field text,
  condition_operator text default 'eq' check (
    condition_operator is null or condition_operator in ('eq', 'neq', 'gt', 'lt', 'gte', 'lte')
  ),
  condition_value text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agam_candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.agam_candidates (id) on delete cascade,
  name text not null,
  file_url text not null,
  document_type text,
  upload_source text check (upload_source in ('candidate', 'evaluator', 'ramad', 'admin')),
  notes text,
  uploaded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agam_candidate_timeline (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.agam_candidates (id) on delete cascade,
  event_type text not null check (
    event_type in ('questionnaire', 'interview', 'evaluation', 'document', 'decision', 'stage_change', 'note')
  ),
  title text not null,
  description text,
  actor_name text,
  stage_key text,
  created_at timestamptz not null default now()
);

insert into public.agam_org_settings (unit_name, logo_url)
select 'מדור אומ״ץ', '/logo-intro.png'
where not exists (select 1 from public.agam_org_settings);

insert into public.agam_day_evaluation_criteria (name, key, bullets, weight, sort_order, is_active)
select v.name, v.key, v.bullets, v.weight, v.sort_order, true
from (
  values
    ('התנהגות ומשמעת', 'conduct', 'משמעת, כבוד, אחריות', 20, 1),
    ('מנהיגות', 'leadership', 'יוזמה, השפעה, דוגמה אישית', 20, 2),
    ('ידע מקצועי', 'knowledge', 'הלכה, תוכן, עומק', 20, 3),
    ('מוטיבציה', 'motivation', 'רצון, מחויבות, חזון', 20, 4),
    ('עבודת צוות', 'teamwork', 'שיתוף פעולה, הקשבה', 20, 5)
) as v(name, key, bullets, weight, sort_order)
where not exists (select 1 from public.agam_day_evaluation_criteria);

insert into public.agam_questionnaire_questions (
  question_type, section_number, section_name, question_text, field_key, field_type,
  options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active
)
select *
from (
  values
    ('pre_screening', 1, 'פרטים אישיים', 'שם מלא', 'full_name', 'text', null::text, true, null::text, null::text, null::text, 1, true),
    ('pre_screening', 1, 'פרטים אישיים', 'מספר אישי', 'personal_number', 'text', null, true, null, null, null, 2, true),
    ('pre_screening', 2, 'שירות', 'פיקוד', 'command', 'text', null, true, null, null, null, 1, true),
    ('pre_screening', 2, 'שירות', 'יחידה', 'unit', 'text', null, true, null, null, null, 2, true),
    ('pre_screening', 2, 'שירות', 'שם מפקד', 'commander_name', 'text', null, true, null, null, null, 3, true),
    ('pre_screening', 2, 'שירות', 'שם קצין דת וחיילת שלישות', 'religious_officer_logistics', 'text', null, true, null, null, null, 4, true),
    ('pre_screening', 3, 'פרטי קשר ותפקיד', 'אימייל אזרחי', 'civilian_email', 'text', null, true, null, null, null, 1, true),
    ('pre_screening', 3, 'פרטי קשר ותפקיד', 'תפקיד', 'position', 'text', null, true, null, null, null, 2, true),
    ('pre_screening', 3, 'פרטי קשר ותפקיד', 'פז״ם (חודשים בשירות)', 'pazam_months', 'number', null, true, null, null, null, 3, true),
    ('interview', 1, 'ראיון', 'רושם כללי מהמועמד', 'interview_impression', 'textarea', null, false, null, null, null, 1, true),
    ('interview', 1, 'ראיון', 'נקודות חוזק', 'interview_strengths', 'textarea', null, false, null, null, null, 2, true)
) as v(
  question_type, section_number, section_name, question_text, field_key, field_type,
  options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active
)
where not exists (select 1 from public.agam_questionnaire_questions);
