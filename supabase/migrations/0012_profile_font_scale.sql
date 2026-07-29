alter table public.profiles
add column if not exists font_scale text not null default 'default';

alter table public.profiles
drop constraint if exists profiles_font_scale_check;

alter table public.profiles
add constraint profiles_font_scale_check
check (font_scale in ('compact', 'default', 'comfortable', 'large'));
