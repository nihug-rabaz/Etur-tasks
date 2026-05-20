alter table public.profiles
add column if not exists is_approved boolean not null default false;

alter table public.profiles
add column if not exists approved_at timestamptz;

alter table public.profiles
add column if not exists approved_by uuid references public.profiles (id) on delete set null;

update public.profiles
set is_approved = true
where role = 'admin';
