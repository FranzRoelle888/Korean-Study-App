-- ============================================================
-- Koreanisch-App: Datenbank-Einrichtung
-- EINMALIG im Supabase SQL Editor einfügen und auf "Run" klicken.
-- (Kann gefahrlos erneut ausgeführt werden.)
-- ============================================================

-- Wörter (eine Zeile je Vokabel)
create table if not exists words (
  id uuid primary key,
  en text not null,
  ko text not null,
  created_at timestamptz default now()
);

-- Karten (zwei je Wort: front 'en' = eintippen, front 'ko' = umdrehen)
create table if not exists cards (
  id uuid primary key,
  word_id uuid not null references words(id) on delete cascade,
  front text not null check (front in ('en', 'ko')),
  ease real not null default 2.5,
  interval_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  due date not null default current_date,
  last_reviewed date
);

create index if not exists cards_due_idx on cards (due);
create index if not exists cards_word_idx on cards (word_id);

-- Zugriffsregeln (Row Level Security). Persönliche App: voller Zugriff
-- über den öffentlichen Schlüssel. (Später ggf. mit Login absichern.)
alter table words enable row level security;
alter table cards enable row level security;

drop policy if exists "words_all" on words;
drop policy if exists "cards_all" on cards;
create policy "words_all" on words for all using (true) with check (true);
create policy "cards_all" on cards for all using (true) with check (true);
