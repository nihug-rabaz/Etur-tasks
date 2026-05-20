import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const sql = neon(databaseUrl.trim().replace(/^['"]|['"]$/g, ""));

const statements = [
  `create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, user_id)
)`,
  `create index if not exists idx_task_assignees_user_id on public.task_assignees (user_id)`,
  `insert into public.task_assignees (task_id, user_id)
select id, assigned_to from public.tasks where assigned_to is not null
on conflict do nothing`,
  `create or replace view public.task_details as
select
  t.id,
  t.title,
  t.description,
  t.subtopic_id,
  t.project_id,
  coalesce(
    (select ta.user_id from public.task_assignees ta where ta.task_id = t.id order by ta.user_id limit 1),
    t.assigned_to
  ) as assigned_to,
  t.created_by,
  t.priority,
  t.status,
  t.due_date,
  t.created_at,
  t.updated_at,
  s.name as subtopic_name,
  d.name as domain_name,
  p.name as project_name,
  (
    select string_agg(pr.name, ', ' order by pr.name)
    from public.task_assignees ta
    join public.profiles pr on pr.id = ta.user_id
    where ta.task_id = t.id
  ) as assignee_name,
  coalesce(
    (
      select array_agg(ta.user_id order by ta.user_id)
      from public.task_assignees ta
      where ta.task_id = t.id
    ),
    array[]::uuid[]
  ) as assignee_ids
from public.tasks t
join public.subtopics s on s.id = t.subtopic_id
join public.domains d on d.id = s.domain_id
left join public.projects p on p.id = t.project_id`,
];

for (const text of statements) {
  await sql.query(text);
}

console.log("Migration 0004_task_assignees applied.");
