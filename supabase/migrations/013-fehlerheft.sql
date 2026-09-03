-- ============================================================
-- 013: Fehler-Heft („실수 노트") — AP2, 04.09.
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Sprach-Korrekturen aus den Übungen (falsch -> richtig + kurze
-- Regel-Erklärung) sammeln sich hier automatisch. Haein arbeitet
-- sie im Mini-Drill ab (richtige Form eintippen); geschaffte
-- Einträge bleiben als Archiv erhalten.
-- Der unique-Index verhindert Dubletten: derselbe Fehler wird
-- nie doppelt eingetragen (die App nutzt "ignoreDuplicates").
-- ============================================================

create table if not exists a2_fehler (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  falsch text not null,          -- ihre Formulierung
  richtig text not null,         -- die korrekte Form
  warum text,                    -- kurze Regel-Erklärung (Koreanisch)
  quelle text,                   -- monolog | fragenspiel | zusatzfrage
  status text not null default 'offen',  -- offen | geschafft
  created_at timestamptz default now()
);

create unique index if not exists a2_fehler_unik
  on a2_fehler (profile, falsch, richtig);

create index if not exists a2_fehler_idx
  on a2_fehler (profile, status, created_at);

alter table a2_fehler enable row level security;
drop policy if exists "a2_fehler_auth" on a2_fehler;
create policy "a2_fehler_auth" on a2_fehler
  for all to authenticated using (true) with check (true);

-- Kontrolle
select count(*) as fehler from a2_fehler;
