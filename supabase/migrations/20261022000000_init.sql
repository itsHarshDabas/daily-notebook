-- Daily Notebook: structured tracker data. Free-form data (photos, notes, foods,
-- activity log) lives in MongoDB behind apps/api.

create type public.gender as enum ('female', 'male', 'other', 'prefer_not_to_say');
create type public.meal_kind as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.period_flow as enum ('light', 'medium', 'heavy');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  gender public.gender,
  period_tracking_hidden boolean not null default false,
  timezone text not null default 'UTC',
  currency text not null default 'INR',
  -- GridFS file id of the avatar in MongoDB
  avatar_file_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.targets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  calories integer not null default 2000 check (calories > 0),
  water_ml integer not null default 2000 check (water_ml > 0),
  sleep_hours numeric(3, 1) not null default 8 check (sleep_hours > 0),
  exercise_min_week integer not null default 150 check (exercise_min_week >= 0),
  budget_month numeric(12, 2) not null default 0 check (budget_month >= 0),
  updated_at timestamptz not null default now()
);

-- One row per user per local calendar date.
create table public.days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mood_score smallint check (mood_score between 1 and 5),
  stress smallint check (stress between 1 and 5),
  calories_total integer check (calories_total >= 0),
  water_ml integer check (water_ml >= 0),
  sleep_bed time,
  sleep_wake time,
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 24),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  period_flow public.period_flow,
  period_symptoms text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  type text not null,
  minutes integer not null check (minutes > 0),
  updated_at timestamptz not null default now()
);
create index exercises_user_date on public.exercises (user_id, date);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal public.meal_kind not null,
  food_name text not null,
  calories integer not null check (calories >= 0),
  -- MongoDB foods document id, when picked from a barcode scan or search
  food_doc_id text,
  updated_at timestamptz not null default now()
);
create index meals_user_date on public.meals (user_id, date);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  note text,
  updated_at timestamptz not null default now()
);
create index expenses_user_date on public.expenses (user_id, date);

create table public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month char(7) not null check (month ~ '^\d{4}-\d{2}$'),
  title text not null,
  unit text not null,
  target numeric(12, 2) not null check (target > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.monthly_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  updated_at timestamptz not null default now()
);
create index goal_progress_goal on public.goal_progress (goal_id, date);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  end_date date check (end_date >= start_date),
  updated_at timestamptz not null default now(),
  unique (user_id, start_date)
);

-- Keep updated_at current; sync uses it to find changed rows.
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','targets','days','exercises','meals','expenses','monthly_goals','goal_progress','cycles']
  loop
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;

-- Row Level Security: each user sees and changes only their own rows.
do $$
declare t text;
begin
  foreach t in array array['targets','days','exercises','meals','expenses','monthly_goals','goal_progress','cycles']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- goal_progress must point at the user's own goal.
create policy "own goal" on public.goal_progress as restrictive for all to authenticated
  using (exists (select 1 from public.monthly_goals g where g.id = goal_id and g.user_id = (select auth.uid())))
  with check (exists (select 1 from public.monthly_goals g where g.id = goal_id and g.user_id = (select auth.uid())));

-- Create a profile and default targets when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.targets (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
