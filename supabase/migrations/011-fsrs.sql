-- ============================================================
-- 011: FSRS-Umstellung (Entscheidung Franz, 02.09.2026)
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Zwei Dinge:
-- 1. Karten bekommen die FSRS-Größen: stab (Stabilität in Tagen)
--    und diff (Schwierigkeit 1-10). Die App füllt sie sanft —
--    jede Karte in dem Moment, in dem sie das nächste Mal
--    bewertet wird. Die alten SM-2-Spalten bleiben unangetastet
--    (Notausgang).
-- 2. review_log: jede Bewertung eine Zeile. Grundlage für die
--    spätere persönliche Eichung der FSRS-Parameter und für den
--    Verlaufs-Reiter.
--
-- WICHTIG: Die App erkennt die neuen Spalten beim nächsten Start
-- von selbst und schaltet FSRS erst DANN scharf — vor dem
-- Ausführen dieses SQLs läuft alles wie bisher weiter.
-- ============================================================

alter table cards add column if not exists stab real;
alter table cards add column if not exists diff real;

create table if not exists review_log (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  card_id text not null,
  word_id text,
  rating text not null,          -- again | hard | good | easy
  elapsed_days integer,          -- Tage seit der letzten Wiederholung
  stab_vorher real,
  stab_nachher real,
  diff real,
  created_at timestamptz default now()
);

create index if not exists review_log_idx
  on review_log (profile, created_at);

alter table review_log enable row level security;
drop policy if exists "review_log_auth" on review_log;
create policy "review_log_auth" on review_log
  for all to authenticated using (true) with check (true);

-- Kontrolle: beide Spalten da, Tabelle leer und bereit
select count(*) as karten_mit_fsrs from cards where stab is not null;
select count(*) as log_zeilen from review_log;
