-- Online žebříček Team Karton Run.
-- Spustit jednou v Supabase: SQL Editor → vložit celý soubor → Run.

-- Každý odeslaný osobní rekord hráče je jeden řádek.
create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  player_id  uuid        not null,
  nickname   text        not null check (char_length(nickname) between 1 and 16),
  character  text        not null check (char_length(character) between 1 and 20),
  score      integer     not null check (score between 0 and 10000000),
  distance   integer     not null default 0 check (distance >= 0),
  boxes      integer     not null default 0 check (boxes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists scores_player_idx on public.scores (player_id, score desc);

-- Hra smí jen číst a přidávat. Úpravy a mazání jdou jen přes Supabase dashboard.
alter table public.scores enable row level security;

drop policy if exists "scores_read" on public.scores;
create policy "scores_read" on public.scores for select to anon, authenticated using (true);

drop policy if exists "scores_insert" on public.scores;
create policy "scores_insert" on public.scores for insert to anon, authenticated with check (true);

-- Žebříček: nejlepší výsledek každého hráče + jeho poslední přezdívka.
create or replace view public.leaderboard with (security_invoker = true) as
select b.player_id, n.nickname, b.character, b.score, b.created_at
from (
  select distinct on (player_id) player_id, character, score, created_at
  from public.scores
  order by player_id, score desc, created_at asc
) b
join (
  select distinct on (player_id) player_id, nickname
  from public.scores
  order by player_id, created_at desc
) n using (player_id);

grant select, insert on public.scores to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
