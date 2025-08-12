-- Interactions table to persist AI/player conversations and memories
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  day integer,
  type text check (type in ('conversation','dm','scheme','observation','confessional','event')),
  participants text[],
  npc_name text,
  player_name text,
  player_message text,
  ai_response text,
  tone text,
  created_at timestamptz not null default now()
);

-- Enable RLS and allow public read/insert for now (no auth yet)
alter table public.interactions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'interactions' and policyname = 'Interactions are readable by everyone'
  ) then
    create policy "Interactions are readable by everyone"
      on public.interactions
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'interactions' and policyname = 'Anyone can insert interactions'
  ) then
    create policy "Anyone can insert interactions"
      on public.interactions
      for insert
      with check (true);
  end if;
end $$;

-- Helpful index
create index if not exists idx_interactions_day on public.interactions(day);