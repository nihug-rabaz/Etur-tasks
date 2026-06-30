create table if not exists public.project_subtopics (
  project_id uuid not null references public.projects (id) on delete cascade,
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  primary key (project_id, subtopic_id)
);

create table if not exists public.task_subtopics (
  task_id uuid not null references public.tasks (id) on delete cascade,
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  primary key (task_id, subtopic_id)
);

create index if not exists idx_project_subtopics_subtopic_id on public.project_subtopics (subtopic_id);
create index if not exists idx_task_subtopics_subtopic_id on public.task_subtopics (subtopic_id);

insert into public.project_subtopics (project_id, subtopic_id)
select id, subtopic_id
from public.projects
on conflict do nothing;

insert into public.task_subtopics (task_id, subtopic_id)
select id, subtopic_id
from public.tasks
on conflict do nothing;
