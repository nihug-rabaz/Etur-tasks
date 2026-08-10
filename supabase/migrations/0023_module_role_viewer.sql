alter table public.user_module_roles
  drop constraint if exists user_module_roles_role_check;

alter table public.user_module_roles
  add constraint user_module_roles_role_check
  check (role in ('admin', 'user', 'approver', 'viewer'));
