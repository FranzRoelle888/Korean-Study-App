-- ============================================================
-- 010: Aufgaben-Bank (Konzept: docs/TAGESAUFGABEN.md §5)
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Der Vorrat an vorproduzierten, validierten Übungen. Gefüllt
-- vom Nacht-Batch (GitHub Action "Aufgaben-Bank füllen"), gelesen
-- von der App, live wird hier NICHTS erzeugt. payload trägt die
-- eigentliche Aufgabe als JSON (Satz mit Lücke, Lösung, Basis-
-- Wort, Übersetzung, Glossar der unbekannten Wörter).
-- ============================================================

create table if not exists exercise_bank (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  typ text not null,             -- 'lueckentext' (weitere folgen)
  grammatik_id text,             -- Kanon-Punkt, den die Aufgabe übt
  payload jsonb not null,
  status text not null default 'neu',   -- neu | erledigt
  korrekt boolean,               -- Ergebnis nach Bearbeitung
  extras_auto boolean default true,
  created_at timestamptz default now(),
  erledigt_am timestamptz
);

create index if not exists exercise_bank_idx
  on exercise_bank (profile, typ, status, created_at);

alter table exercise_bank enable row level security;
drop policy if exists "exercise_bank_auth" on exercise_bank;
create policy "exercise_bank_auth" on exercise_bank
  for all to authenticated using (true) with check (true);

-- ---------- Kontrolle ----------
select 'exercise_bank' as tabelle, count(*) from exercise_bank;
