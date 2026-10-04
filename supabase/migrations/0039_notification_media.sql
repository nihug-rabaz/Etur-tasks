-- Cached notification images for OneSignal rich push (fast HTTPS fetch on device expand).
create table if not exists notification_media (
  id uuid primary key default gen_random_uuid(),
  content_type text not null default 'image/jpeg',
  data_base64 text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists notification_media_expires_at_idx
  on notification_media (expires_at);
