create table public.practitioner_access (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references auth.users on delete cascade not null,
  practitioner_id  uuid references auth.users on delete cascade not null,
  granted_at       timestamptz not null default now(),
  status           text not null default 'active',
  unique (client_id, practitioner_id)
);

alter table public.practitioner_access enable row level security;

-- Clients manage their own rows
create policy "Clients can insert own practitioner access"
  on public.practitioner_access for insert
  with check (auth.uid() = client_id);

create policy "Clients can update own practitioner access"
  on public.practitioner_access for update
  using (auth.uid() = client_id);

create policy "Clients can delete own practitioner access"
  on public.practitioner_access for delete
  using (auth.uid() = client_id);

create policy "Clients can view own practitioner access"
  on public.practitioner_access for select
  using (auth.uid() = client_id);

-- Practitioners can see rows where they are the practitioner
create policy "Practitioners can view their client access"
  on public.practitioner_access for select
  using (auth.uid() = practitioner_id);

-- Practitioner notes
create table public.practitioner_notes (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references auth.users on delete cascade not null,
  practitioner_id  uuid references auth.users on delete cascade not null,
  note             text not null,
  created_at       timestamptz not null default now()
);

alter table public.practitioner_notes enable row level security;

create policy "Practitioners can manage own notes"
  on public.practitioner_notes for all
  using (auth.uid() = practitioner_id)
  with check (auth.uid() = practitioner_id);
