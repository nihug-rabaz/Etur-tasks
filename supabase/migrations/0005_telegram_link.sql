create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tg_link_codes_user on public.telegram_link_codes (user_id);
create index if not exists idx_tg_link_codes_expires on public.telegram_link_codes (expires_at);

alter table public.profiles
  add column if not exists telegram_username text,
  add column if not exists telegram_linked_at timestamptz;

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
