-- Enrich nagadim candidates with personal fields, pipeline outcome,
-- stage-event results, and remap pipeline stage labels.

alter table public.nagadim_candidates
  add column if not exists phone text,
  add column if not exists id_number text,
  add column if not exists personal_number text,
  add column if not exists family_status text,
  add column if not exists children_count integer,
  add column if not exists residence text,
  add column if not exists pipeline_outcome text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nagadim_candidates_pipeline_outcome_check'
  ) then
    alter table public.nagadim_candidates
      add constraint nagadim_candidates_pipeline_outcome_check
      check (pipeline_outcome is null or pipeline_outcome in ('גויס', 'לא גויס'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nagadim_candidates_children_count_check'
  ) then
    alter table public.nagadim_candidates
      add constraint nagadim_candidates_children_count_check
      check (children_count is null or children_count >= 0);
  end if;
end $$;

alter table public.nagadim_stage_events
  add column if not exists result text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nagadim_stage_events_result_check'
  ) then
    alter table public.nagadim_stage_events
      add constraint nagadim_stage_events_result_check
      check (
        result is null
        or result in ('עבר', 'לא עבר', 'לא מתאים לפיקוד')
      );
  end if;
end $$;

update public.nagadim_candidates
set current_stage = case current_stage
  when 'בדיקת סגל' then 'אישור מדור סגל'
  when 'ראיון פרויקטור נגדים' then 'ראיון רב הנגדים'
  when 'בדיקת עומק' then 'נשלח לפיקוד'
  when 'ראיון פיקודים ויחידות' then 'ראיון פיקודים'
  else current_stage
end
where current_stage in (
  'בדיקת סגל',
  'ראיון פרויקטור נגדים',
  'בדיקת עומק',
  'ראיון פיקודים ויחידות'
);

update public.nagadim_stage_events
set stage = case stage
  when 'בדיקת סגל' then 'אישור מדור סגל'
  when 'ראיון פרויקטור נגדים' then 'ראיון רב הנגדים'
  when 'בדיקת עומק' then 'נשלח לפיקוד'
  when 'ראיון פיקודים ויחידות' then 'ראיון פיקודים'
  else stage
end
where stage in (
  'בדיקת סגל',
  'ראיון פרויקטור נגדים',
  'בדיקת עומק',
  'ראיון פיקודים ויחידות'
);

create index if not exists idx_nagadim_candidates_id_number
  on public.nagadim_candidates (id_number);

create index if not exists idx_nagadim_candidates_personal_number
  on public.nagadim_candidates (personal_number);

create index if not exists idx_nagadim_candidates_pipeline_outcome
  on public.nagadim_candidates (pipeline_outcome);
