-- ============================================================
-- 012: A2-Sprint — Belege für Prüfungsteile (Phase 0)
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Jede A2-Übung schreibt nach Abschluss eine Zeile: welches
-- Modul (lesen/hoeren/schreiben/sprechen), welcher Teil, wie
-- viele Punkte von wie vielen. Daraus entstehen der
-- Stärken-Radar und die Bestehens-Prognose (Roadmap Phase 5).
-- ============================================================

create table if not exists a2_belege (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  modul text not null,           -- lesen | hoeren | schreiben | sprechen | wortschatz
  teil text,                     -- z. B. 't1', 'artikel', 'satzbau-stufe3'
  punkte real not null,
  max real not null,
  details jsonb,                 -- optional: Einzelergebnisse für spätere Auswertung
  created_at timestamptz default now()
);

create index if not exists a2_belege_idx
  on a2_belege (profile, modul, created_at);

alter table a2_belege enable row level security;
drop policy if exists "a2_belege_auth" on a2_belege;
create policy "a2_belege_auth" on a2_belege
  for all to authenticated using (true) with check (true);

-- Kontrolle
select count(*) as belege from a2_belege;
