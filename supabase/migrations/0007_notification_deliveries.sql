create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_deliveries_created_at
  on public.notification_deliveries (created_at);
