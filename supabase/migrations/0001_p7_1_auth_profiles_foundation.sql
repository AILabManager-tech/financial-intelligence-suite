-- P7.1: auth foundation. profiles backs Supabase Auth users.
-- Applied to project wymuuoapoyugxmrzrjan (financial-intelligence-suite, ca-central-1).
-- Roles (pm/client/compliance/admin) are declared here; role-based UI gating is P7.2.
-- org_id is forward-prep for multi-tenant scoping (P7.4), nullable until then.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'pm' check (role in ('pm','client','compliance','admin')),
  org_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'FIS user profile, 1:1 with auth.users. P7.1 auth foundation.';

alter table public.profiles enable row level security;

-- Own-row read.
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

-- Own-row update (column privileges below restrict WHICH columns).
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Anti-escalation: authenticated users may only edit email/full_name, never
-- role or org_id. Role/tenant assignment is an admin/server concern (P7.2/P7.4).
revoke update on public.profiles from anon, authenticated;
grant update (email, full_name) on public.profiles to authenticated;

-- Auto-provision a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
