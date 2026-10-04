-- Unique public invite slug per cycle for candidate self-registration links.
alter table public.agam_cycles
  add column if not exists invite_slug text;

update public.agam_cycles
set invite_slug = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
where invite_slug is null or invite_slug = '';

alter table public.agam_cycles
  alter column invite_slug set not null;

create unique index if not exists idx_agam_cycles_invite_slug
  on public.agam_cycles (invite_slug);
