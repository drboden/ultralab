create table public.ai_programs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  created_at   timestamptz not null default now(),
  program_json jsonb not null
);

alter table public.ai_programs enable row level security;

create policy "Users can insert own ai programs"
  on public.ai_programs for insert
  with check (auth.uid() = user_id);

create policy "Users can select own ai programs"
  on public.ai_programs for select
  using (auth.uid() = user_id);

create policy "Users can delete own ai programs"
  on public.ai_programs for delete
  using (auth.uid() = user_id);
