-- Table 1: lab_results (VO2max / threshold tests)
create table public.lab_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  test_date  date not null,
  test_type  text not null default 'vo2max',
  vo2max     numeric,
  lt1_hr     integer,
  lt1_pace   numeric, -- seconds per km
  lt2_hr     integer,
  lt2_pace   numeric, -- seconds per km
  max_hr     integer,
  weight_kg  numeric,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.lab_results enable row level security;

-- Users can read their own results
create policy "Users can view own lab results"
  on public.lab_results for select
  using (auth.uid() = user_id);

-- Admins can insert results for any user
create policy "Admins can insert lab results"
  on public.lab_results for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update results
create policy "Admins can update lab results"
  on public.lab_results for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Table 2: force_plate_results
create table public.force_plate_results (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users on delete cascade not null,
  test_date               date not null,
  imtp_score              numeric, -- relative peak force x BW
  left_quad_strength      numeric,
  right_quad_strength     numeric,
  left_adductor_strength  numeric,
  right_adductor_strength numeric,
  hq_ratio_left           numeric,
  hq_ratio_right          numeric,
  notes                   text,
  created_at              timestamptz not null default now()
);

alter table public.force_plate_results enable row level security;

-- Users can read their own results
create policy "Users can view own force plate results"
  on public.force_plate_results for select
  using (auth.uid() = user_id);

-- Admins can insert results for any user
create policy "Admins can insert force plate results"
  on public.force_plate_results for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update results
create policy "Admins can update force plate results"
  on public.force_plate_results for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
