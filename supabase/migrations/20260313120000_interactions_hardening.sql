-- Hardening + query performance improvements for public.interactions

-- Faster "recent interactions for (npc, player)" lookups
create index if not exists idx_interactions_npc_player_created_at
  on public.interactions (npc_name, player_name, created_at desc);

-- Useful for retention / time-bounded reads
create index if not exists idx_interactions_created_at
  on public.interactions (created_at);

-- Keep public read posture, but limit reads to a recent window to reduce scraping value.
-- Client already only requests the most recent rows.
do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'interactions'
      and policyname = 'Interactions are readable by everyone'
  ) then
    alter policy "Interactions are readable by everyone"
      on public.interactions
      using (created_at > now() - interval '30 days');
  else
    create policy "Interactions are readable by everyone"
      on public.interactions
      for select
      using (created_at > now() - interval '30 days');
  end if;
end $$;
