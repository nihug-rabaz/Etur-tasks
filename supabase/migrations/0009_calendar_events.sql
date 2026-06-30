create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subtopic_id uuid not null references public.subtopics (id) on delete restrict,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_event_participants (
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (event_id, user_id)
);

create index if not exists idx_calendar_events_starts_at on public.calendar_events (starts_at);
create index if not exists idx_calendar_events_subtopic_id on public.calendar_events (subtopic_id);
create index if not exists idx_calendar_event_participants_user_id on public.calendar_event_participants (user_id);

create or replace view public.calendar_event_details as
select
  e.id,
  e.title,
  e.description,
  e.subtopic_id,
  e.location,
  e.starts_at,
  e.ends_at,
  e.all_day,
  e.created_by,
  e.cancelled_at,
  e.created_at,
  e.updated_at,
  s.name as subtopic_name,
  d.name as domain_name,
  (
    select string_agg(pr.name, ', ' order by pr.name)
    from public.calendar_event_participants cep
    join public.profiles pr on pr.id = cep.user_id
    where cep.event_id = e.id
  ) as participant_name,
  coalesce(
    (
      select array_agg(cep.user_id order by cep.user_id)
      from public.calendar_event_participants cep
      where cep.event_id = e.id
    ),
    array[]::uuid[]
  ) as participant_ids
from public.calendar_events e
join public.subtopics s on s.id = e.subtopic_id
join public.domains d on d.id = s.domain_id;
