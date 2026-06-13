-- Table: strava_tokens
create table public.strava_tokens (
  user_id      uuid references auth.users on delete cascade primary key,
  access_token  text not null,
  refresh_token text not null,
  expires_at    bigint not null,
  athlete_id    bigint,
  connected_at  timestamptz not null default now()
);

alter table public.strava_tokens enable row level security;

create policy "Users can view own strava tokens"
  on public.strava_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own strava tokens"
  on public.strava_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own strava tokens"
  on public.strava_tokens for update
  using (auth.uid() = user_id);

-- Table: strava_activities
create table public.strava_activities (
  id                    bigint primary key,
  user_id               uuid references auth.users on delete cascade not null,
  name                  text,
  type                  text,
  start_date            timestamptz,
  distance_meters       numeric,
  moving_time_seconds   integer,
  average_heartrate     numeric,
  max_heartrate         numeric,
  total_elevation_gain  numeric,
  synced_at             timestamptz not null default now()
);

alter table public.strava_activities enable row level security;

create policy "Users can view own strava activities"
  on public.strava_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert own strava activities"
  on public.strava_activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own strava activities"
  on public.strava_activities for update
  using (auth.uid() = user_id);
