-- Exam results (כושר / עיוני attempts) per candidate, shared across stages.
-- Previously stored inside each evaluator's סמ״ח row (agam_smach_evaluations.threshold_tests).
create table if not exists public.agam_exam_results (
  candidate_id uuid not null references public.agam_candidates(id) on delete cascade,
  test_key text not null check (test_key ~ '^(mikraot_israel|weapon_test|fitness_run|fitness_strength)_[1-4]$'),
  score numeric,
  run_time text,
  count integer,
  pass boolean,
  updated_by_id uuid references public.profiles(id) on delete set null,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (candidate_id, test_key)
);

-- Backfill: latest non-empty value per candidate × test from סמ״ח rows (legacy single keys → attempt 1).
insert into public.agam_exam_results (candidate_id, test_key, score, run_time, count, pass, updated_by_id, updated_by_name, updated_at)
select distinct on (src.candidate_id, src.test_key)
  src.candidate_id,
  src.test_key,
  case when src.family in ('mikraot_israel', 'weapon_test') and src.raw ~ '^\d+(\.\d+)?$' then src.raw::numeric end,
  case when src.family = 'fitness_run' then src.raw end,
  case when src.family = 'fitness_strength' and src.raw ~ '^\d+$' then src.raw::integer end,
  src.pass,
  src.evaluator_id,
  src.evaluator_name,
  src.updated_at
from (
  select
    s.candidate_id,
    s.evaluator_id,
    s.evaluator_name,
    s.updated_at,
    e.key = k.test_key as is_modern,
    k.test_key,
    regexp_replace(k.test_key, '_[1-4]$', '') as family,
    nullif(coalesce(e.value->>'score', e.value->>'time', e.value->>'count', e.value->>'datum'), '') as raw,
    (e.value->>'pass')::boolean as pass
  from public.agam_smach_evaluations s
  cross join lateral jsonb_each(case when jsonb_typeof(s.threshold_tests) = 'object' then s.threshold_tests else '{}'::jsonb end) e
  cross join lateral (
    select case when e.key ~ '^(mikraot_israel|weapon_test|fitness_run|fitness_strength)$' then e.key || '_1' else e.key end as test_key
  ) k
  where k.test_key ~ '^(mikraot_israel|weapon_test|fitness_run|fitness_strength)_[1-4]$'
) src
where src.raw is not null
order by src.candidate_id, src.test_key, src.updated_at desc, src.is_modern desc
on conflict (candidate_id, test_key) do nothing;

-- סמ״ח rows that only ever held exam scores (no actual סמ״ח evaluation) are now redundant.
delete from public.agam_smach_evaluations
where coalesce(professional_scores, '{}'::jsonb) = '{}'::jsonb
  and passed is null
  and decision is null
  and weighted_score is null
  and coalesce(key_points, '') = ''
  and coalesce(decision_reasoning, '') = '';
