-- Stack Quest: database setup for accounts, progress sync and the leaderboard.
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query
-- → paste this whole file → Run. Running it again is safe.
--
-- Security model ("Row Level Security", RLS): the browser talks to the
-- database directly, so the database itself checks every request.
-- auth.uid() is the id of whoever is signed in. Each policy below says
-- "you may only touch rows whose user_id is yours".

------------------------------------------------------------------------
-- 1. Progress: one row per learner, holding their whole progress record.
------------------------------------------------------------------------
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  xp         integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "Read own progress" on public.progress;
create policy "Read own progress" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Create own progress" on public.progress;
create policy "Create own progress" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own progress" on public.progress;
create policy "Update own progress" on public.progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own progress" on public.progress;
create policy "Delete own progress" on public.progress
  for delete to authenticated using ((select auth.uid()) = user_id);

------------------------------------------------------------------------
-- 2. Leaderboard profile: OPT-IN. Nobody appears unless they choose to.
------------------------------------------------------------------------
create table if not exists public.leaderboard_profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 2 and 24),
  show_on_leaderboard boolean not null default false,
  updated_at          timestamptz not null default now()
);

alter table public.leaderboard_profiles enable row level security;

drop policy if exists "Read own profile" on public.leaderboard_profiles;
create policy "Read own profile" on public.leaderboard_profiles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Create own profile" on public.leaderboard_profiles;
create policy "Create own profile" on public.leaderboard_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own profile" on public.leaderboard_profiles;
create policy "Update own profile" on public.leaderboard_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own profile" on public.leaderboard_profiles;
create policy "Delete own profile" on public.leaderboard_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

------------------------------------------------------------------------
-- 3. The leaderboard itself: only display names and XP of people who
--    opted in. A "security definer" function can read across everyone's
--    rows, but it only ever returns these two harmless columns.
------------------------------------------------------------------------
create or replace function public.get_leaderboard()
returns table (display_name text, xp integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.display_name, coalesce(g.xp, 0) as xp
  from public.leaderboard_profiles p
  left join public.progress g on g.user_id = p.user_id
  where p.show_on_leaderboard
  order by xp desc, p.display_name
  limit 20;
$$;

revoke all on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;

------------------------------------------------------------------------
-- 4. "Delete my account": removes the login and (through "on delete
--    cascade") all progress and profile rows. POPIA gives people the right
--    to have their personal information deleted.
------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
