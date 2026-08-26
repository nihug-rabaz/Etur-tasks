alter table public.dovrut_campaigns
  add column if not exists deleted_at timestamptz;

alter table public.dovrut_campaigns
  drop constraint if exists dovrut_campaigns_status_check;

alter table public.dovrut_campaigns
  add constraint dovrut_campaigns_status_check
  check (status in ('active', 'completed', 'on_hold', 'draft'));

create index if not exists idx_dovrut_campaigns_deleted_at
  on public.dovrut_campaigns (deleted_at);
