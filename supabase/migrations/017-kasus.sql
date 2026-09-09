-- ============================================================
-- 017: Kasus bei Verben (해인s Seite) — Wunsch Franz 09.09.
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden (alles "if not exists").
-- Rein ADDITIV.
--
-- Ein deutsches Verb sagt nicht von selbst, welchen Fall es
-- verlangt. „helfen" steht mit Dativ, „sehen" mit Akkusativ,
-- „geben" mit beidem, „warten" mit einer Präposition. Für eine
-- A2-Lernerin ist das der häufigste Fehler überhaupt, also gehört
-- es sichtbar auf die Karte.
--
--   kasus   kurzes, lesbares Muster:
--             "jdm. helfen (D)"
--             "etw. sehen (A)"
--             "jdm. etw. geben (D + A)"
--             "warten auf + A"
--           null bei allem, was kein Verb ist oder keinen festen
--           Fall verlangt.
--
-- Die Anzeige färbt Dativ und Akkusativ verschieden — der Fall
-- soll am Blick erkennbar sein, nicht erst beim Lesen.
--
-- Dazu eine Sicherung ihrer heutigen Bedeutungen, analog zu 016.
-- Rückgängig wäre:
--   update words w set en = b.en, nuance = b.nuance
--   from words_backup_de b where b.id = w.id;
-- ============================================================

create table if not exists words_backup_de as
  select id, ko, en, pos, nuance, now() as gesichert_am
  from words where profile = 'de';
alter table words_backup_de enable row level security;

alter table words add column if not exists kasus text;

-- ---------- Kontrolle ----------
-- Erwartet: eine Zeile "kasus" und die Zahl der gesicherten Wörter.
select 'words' as tabelle, column_name from information_schema.columns
  where table_name = 'words' and column_name = 'kasus'
union all
select 'backup_de', count(*)::text from words_backup_de;
