import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const sql = neon(databaseUrl);

const statements = [
  'create extension if not exists "pgcrypto"',
  "create table if not exists profiles (id uuid primary key default gen_random_uuid(), name text not null, email text unique, role text not null default 'user' check (role in ('admin','user')), telegram_id text, avatar text, created_at timestamptz not null default now())",
  "alter table profiles add column if not exists email text",
  "create unique index if not exists idx_profiles_email_unique on profiles(email) where email is not null",
  "alter table profiles add column if not exists is_approved boolean not null default false",
  "alter table profiles add column if not exists approved_at timestamptz",
  "alter table profiles add column if not exists approved_by uuid references profiles(id) on delete set null",
  "update profiles set is_approved = true where role = 'admin'",
  "create table if not exists domains (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique)",
  "create table if not exists subtopics (id uuid primary key default gen_random_uuid(), name text not null, domain_id uuid not null references domains(id) on delete cascade)",
  "create table if not exists user_subtopic_permissions (user_id uuid not null references profiles(id) on delete cascade, subtopic_id uuid not null references subtopics(id) on delete cascade, primary key (user_id, subtopic_id))",
  "create table if not exists projects (id uuid primary key default gen_random_uuid(), name text not null, description text, subtopic_id uuid not null references subtopics(id) on delete cascade, start_date date, end_date date, status text not null default 'active' check (status in ('active','completed','archived')), created_at timestamptz not null default now())",
  "create table if not exists tasks (id uuid primary key default gen_random_uuid(), title text not null, description text, subtopic_id uuid not null references subtopics(id) on delete cascade, project_id uuid references projects(id) on delete set null, assigned_to uuid references profiles(id) on delete set null, created_by uuid not null references profiles(id) on delete restrict, priority text not null default 'medium' check (priority in ('low','medium','high')), status text not null default 'open' check (status in ('open','in_progress','completed')), due_date timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now())",
  "create or replace view task_details as select t.*, s.name as subtopic_name, d.name as domain_name, p.name as project_name, pr.name as assignee_name from tasks t join subtopics s on s.id=t.subtopic_id join domains d on d.id=s.domain_id left join projects p on p.id=t.project_id left join profiles pr on pr.id=t.assigned_to",
  "create index if not exists idx_tasks_status on tasks(status)",
  "create index if not exists idx_tasks_due_date on tasks(due_date)",
  "create index if not exists idx_tasks_assigned_to on tasks(assigned_to)",
  "create index if not exists idx_tasks_subtopic_id on tasks(subtopic_id)",
  "create index if not exists idx_tasks_project_id on tasks(project_id)",
  "create table if not exists project_subtopics (project_id uuid not null references projects(id) on delete cascade, subtopic_id uuid not null references subtopics(id) on delete cascade, primary key (project_id, subtopic_id))",
  "create table if not exists task_subtopics (task_id uuid not null references tasks(id) on delete cascade, subtopic_id uuid not null references subtopics(id) on delete cascade, primary key (task_id, subtopic_id))",
  "create index if not exists idx_project_subtopics_subtopic_id on project_subtopics(subtopic_id)",
  "create index if not exists idx_task_subtopics_subtopic_id on task_subtopics(subtopic_id)",
  "insert into project_subtopics (project_id, subtopic_id) select id, subtopic_id from projects on conflict do nothing",
  "insert into task_subtopics (task_id, subtopic_id) select id, subtopic_id from tasks on conflict do nothing",
  "insert into domains(name,slug) values ('Recruitment','recruitment'),('Positioning','positioning'),('General','general') on conflict (slug) do nothing",
  "insert into subtopics(name,domain_id) select 'Officers', id from domains where slug='recruitment' on conflict do nothing",
  "insert into subtopics(name,domain_id) select 'NCOs', id from domains where slug='recruitment' on conflict do nothing",
  "insert into subtopics(name,domain_id) select 'Candidates', id from domains where slug='recruitment' on conflict do nothing",
  "insert into subtopics(name,domain_id) select 'PR', id from domains where slug='positioning' on conflict do nothing",
  "insert into subtopics(name,domain_id) select 'Social Media', id from domains where slug='positioning' on conflict do nothing",
  "insert into subtopics(name,domain_id) select 'Visits', id from domains where slug='positioning' on conflict do nothing",
  "insert into subtopics(name,domain_id) select 'General', id from domains where slug='general' on conflict do nothing",
];

for (const statement of statements) {
  await sql.query(statement);
}

const result = await sql.query("select count(*)::int as count from domains");
console.log(`Bootstrap complete, domains: ${result[0].count}`);
