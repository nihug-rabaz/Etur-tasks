-- Malshabim "פנייה חדשה" / חייבים ראיון waitlist (name + phone only)

create table if not exists public.malshabim_interview_waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_malshabim_interview_waitlist_created_at
  on public.malshabim_interview_waitlist (created_at desc);
