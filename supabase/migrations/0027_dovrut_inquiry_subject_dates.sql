alter table public.dovrut_inquiry_subjects
  add column if not exists rank text,
  add column if not exists birth_date date,
  add column if not exists role_started_at date;
