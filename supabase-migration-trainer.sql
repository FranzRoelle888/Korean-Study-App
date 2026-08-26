-- ============================================================
-- Der Trainer: Tabellen für Skills, Lernjournal und Kosten-Log
--
-- EINMALIG im Supabase SQL Editor einfügen und auf "Run" klicken.
-- Kann gefahrlos erneut ausgeführt werden.
-- ============================================================

-- ---------- Grammatik-Skills ----------
-- Was der Lernende schon erklärt bekommen hat / beherrscht.
-- Kurz und atomar ("-았/었어요 Vergangenheit"), keine Absätze.
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  topic text not null,
  note text,
  created_at timestamptz default now()
);

create index if not exists skills_profile_idx on skills (profile);

-- ---------- Lernjournal ----------
-- Eine Zeile pro abgeschlossener Trainer-Einheit. summary ist die
-- Kurz-Zusammenfassung, errors die Fehlerliste dieser Einheit.
-- Der Trainer bekommt vor jeder Einheit die letzten ~5 Zeilen —
-- so entsteht das Gedächtnis über Unterhaltungen.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  mode text not null,          -- scenario | free | cloze | grammar
  scenario text,               -- welches Szenario (falls Modus scenario)
  summary text not null,
  errors jsonb,                -- ["vergisst 을/를", ...]
  created_at timestamptz default now()
);

create index if not exists sessions_profile_idx on sessions (profile, created_at desc);

-- ---------- Kosten-Log ----------
-- Jeder Modell-Aufruf eine Zeile. Dient zwei Zwecken:
--  1. Ratenlimit (die Edge Function zählt Aufrufe der letzten Stunde)
--  2. Modellwahl nach echten Zahlen statt Schätzung (Konzept §8)
create table if not exists trainer_usage (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  action text not null,        -- chat | summary
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz default now()
);

create index if not exists trainer_usage_rate_idx on trainer_usage (profile, created_at desc);

-- ---------- Zugriffsregeln ----------
-- Wie bei den bestehenden Tabellen: offene Policies (persönliche
-- App, zwei Nutzer). Die Edge Function greift ohnehin mit dem
-- Service-Schlüssel zu; die App liest sessions/skills direkt.
alter table skills enable row level security;
alter table sessions enable row level security;
alter table trainer_usage enable row level security;

drop policy if exists "skills_all" on skills;
drop policy if exists "sessions_all" on sessions;
drop policy if exists "trainer_usage_all" on trainer_usage;
create policy "skills_all" on skills for all using (true) with check (true);
create policy "sessions_all" on sessions for all using (true) with check (true);
create policy "trainer_usage_all" on trainer_usage for all using (true) with check (true);

-- ---------- Kontrolle ----------
select 'skills' as tabelle, count(*) from skills
union all select 'sessions', count(*) from sessions
union all select 'trainer_usage', count(*) from trainer_usage;
