-- Malshabim batch: status remap, approval, interviewer, request_meta, dup indexes

-- Remap legacy candidate_status values
update public.malshabim_candidates
set candidate_status = case
  when advanced_status = 'אושר' then 'אושר'
  when candidate_status in ('חדש') then 'ממתין לריאיון'
  when candidate_status in ('ממתין לעדכון', 'בטיפול') then 'בטיפול'
  when candidate_status in ('הושלם') then 'אושר'
  when candidate_status in ('ממתין לריאיון', 'בטיפול', 'אושר', 'שובץ') then candidate_status
  else 'ממתין לריאיון'
end;

alter table public.malshabim_candidates
  alter column candidate_status set default 'ממתין לריאיון';

alter table public.malshabim_candidates
  alter column advanced_status drop not null;

alter table public.malshabim_candidates
  add column if not exists interviewer_user_id uuid references public.profiles (id) on delete set null;

alter table public.malshabim_candidates
  add column if not exists awaiting_admin_approval boolean not null default false;

alter table public.malshabim_candidates
  add column if not exists approval_requested_at timestamptz;

alter table public.malshabim_candidates
  add column if not exists interview_reminder_sent_at timestamptz;

alter table public.malshabim_candidates
  add column if not exists request_meta jsonb not null default '{}'::jsonb;

create index if not exists idx_malshabim_candidates_awaiting_approval
  on public.malshabim_candidates (awaiting_admin_approval, approval_requested_at desc)
  where awaiting_admin_approval = true;

create index if not exists idx_malshabim_candidates_interviewer
  on public.malshabim_candidates (interviewer_user_id)
  where interviewer_user_id is not null;

create index if not exists idx_malshabim_candidates_interview_at
  on public.malshabim_candidates (interview_at)
  where interview_at is not null and is_draft = false;

-- Soft uniqueness for published files
update public.malshabim_candidates
set id_number = null
where id_number is not null and btrim(id_number) = '';

update public.malshabim_candidates
set personal_number = null
where personal_number is not null and btrim(personal_number) = '';

-- Clear duplicate identity values on older rows so unique indexes can apply
with ranked_ids as (
  select id,
    row_number() over (partition by id_number order by created_at asc, id asc) as rn
  from public.malshabim_candidates
  where is_draft = false and id_number is not null
)
update public.malshabim_candidates c
set id_number = null
from ranked_ids r
where c.id = r.id and r.rn > 1;

with ranked_personal as (
  select id,
    row_number() over (partition by personal_number order by created_at asc, id asc) as rn
  from public.malshabim_candidates
  where is_draft = false and personal_number is not null
)
update public.malshabim_candidates c
set personal_number = null
from ranked_personal r
where c.id = r.id and r.rn > 1;

create unique index if not exists idx_malshabim_candidates_id_number_unique
  on public.malshabim_candidates (id_number)
  where is_draft = false and id_number is not null and btrim(id_number) <> '';

create unique index if not exists idx_malshabim_candidates_personal_number_unique
  on public.malshabim_candidates (personal_number)
  where is_draft = false and personal_number is not null and btrim(personal_number) <> '';
