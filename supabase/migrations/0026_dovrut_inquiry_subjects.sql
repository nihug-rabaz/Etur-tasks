create table if not exists public.dovrut_inquiry_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer,
  hometown text,
  family_status text,
  enlistment_year integer,
  years_in_role numeric,
  role_title text,
  previous_roles text,
  bio text not null default '',
  notes text,
  deleted_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dovrut_inquiry_subjects_deleted
  on public.dovrut_inquiry_subjects (deleted_at);
create index if not exists idx_dovrut_inquiry_subjects_updated
  on public.dovrut_inquiry_subjects (updated_at desc);
