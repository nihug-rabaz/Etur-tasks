with ranked as (
  select
    s.id,
    s.domain_id,
    s.name,
    (select count(*) from tasks t where t.subtopic_id = s.id) as task_count,
    (select count(*) from projects p where p.subtopic_id = s.id) as project_count,
    row_number() over (
      partition by s.domain_id, lower(s.name)
      order by
        (select count(*) from tasks t where t.subtopic_id = s.id) desc,
        (select count(*) from projects p where p.subtopic_id = s.id) desc,
        s.id
    ) as rn
  from subtopics s
),
canonical as (
  select id as canonical_id, domain_id, lower(name) as key from ranked where rn = 1
),
mapping as (
  select r.id as duplicate_id, c.canonical_id
  from ranked r
  join canonical c on c.domain_id = r.domain_id and c.key = lower(r.name)
  where r.rn > 1
)
update tasks t
set subtopic_id = m.canonical_id
from mapping m
where t.subtopic_id = m.duplicate_id;

with ranked as (
  select
    s.id,
    s.domain_id,
    s.name,
    row_number() over (
      partition by s.domain_id, lower(s.name)
      order by
        (select count(*) from tasks t where t.subtopic_id = s.id) desc,
        (select count(*) from projects p where p.subtopic_id = s.id) desc,
        s.id
    ) as rn
  from subtopics s
),
canonical as (
  select id as canonical_id, domain_id, lower(name) as key from ranked where rn = 1
),
mapping as (
  select r.id as duplicate_id, c.canonical_id
  from ranked r
  join canonical c on c.domain_id = r.domain_id and c.key = lower(r.name)
  where r.rn > 1
)
update projects p
set subtopic_id = m.canonical_id
from mapping m
where p.subtopic_id = m.duplicate_id;

with ranked as (
  select
    s.id,
    s.domain_id,
    s.name,
    row_number() over (
      partition by s.domain_id, lower(s.name)
      order by
        (select count(*) from tasks t where t.subtopic_id = s.id) desc,
        (select count(*) from projects p where p.subtopic_id = s.id) desc,
        s.id
    ) as rn
  from subtopics s
),
canonical as (
  select id as canonical_id, domain_id, lower(name) as key from ranked where rn = 1
),
mapping as (
  select r.id as duplicate_id, c.canonical_id
  from ranked r
  join canonical c on c.domain_id = r.domain_id and c.key = lower(r.name)
  where r.rn > 1
)
insert into user_subtopic_permissions (user_id, subtopic_id)
select usp.user_id, m.canonical_id
from user_subtopic_permissions usp
join mapping m on m.duplicate_id = usp.subtopic_id
on conflict (user_id, subtopic_id) do nothing;

delete from user_subtopic_permissions usp
where usp.subtopic_id in (
  select s.id
  from subtopics s
  where exists (
    select 1
    from subtopics other
    where other.domain_id = s.domain_id
      and lower(other.name) = lower(s.name)
      and other.id <> s.id
      and (
        (select count(*) from tasks t where t.subtopic_id = other.id) >
        (select count(*) from tasks t where t.subtopic_id = s.id)
        or (
          (select count(*) from tasks t where t.subtopic_id = other.id) =
          (select count(*) from tasks t where t.subtopic_id = s.id)
          and (select count(*) from projects p where p.subtopic_id = other.id) >
              (select count(*) from projects p where p.subtopic_id = s.id)
        )
        or (
          (select count(*) from tasks t where t.subtopic_id = other.id) =
          (select count(*) from tasks t where t.subtopic_id = s.id)
          and (select count(*) from projects p where p.subtopic_id = other.id) =
              (select count(*) from projects p where p.subtopic_id = s.id)
          and other.id < s.id
        )
      )
  )
);

delete from subtopics s
where exists (
  select 1
  from subtopics other
  where other.domain_id = s.domain_id
    and lower(other.name) = lower(s.name)
    and other.id <> s.id
    and (
      (select count(*) from tasks t where t.subtopic_id = other.id) >
      (select count(*) from tasks t where t.subtopic_id = s.id)
      or (
        (select count(*) from tasks t where t.subtopic_id = other.id) =
        (select count(*) from tasks t where t.subtopic_id = s.id)
        and (select count(*) from projects p where p.subtopic_id = other.id) >
            (select count(*) from projects p where p.subtopic_id = s.id)
      )
      or (
        (select count(*) from tasks t where t.subtopic_id = other.id) =
        (select count(*) from tasks t where t.subtopic_id = s.id)
        and (select count(*) from projects p where p.subtopic_id = other.id) =
            (select count(*) from projects p where p.subtopic_id = s.id)
        and other.id < s.id
      )
    )
);

alter table subtopics
  drop constraint if exists subtopics_domain_id_name_key;

alter table subtopics
  add constraint subtopics_domain_id_name_key unique (domain_id, name);
