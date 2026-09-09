-- ============================================================
-- 016: Vokabel-Qualität (Franz 09.09.) — Infotext, Bedeutungsfamilien,
--      Zählwörter, Hand-Schutz, Anreicherungs-Version
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden (alles "if not exists").
-- Rein ADDITIV: keine Spalte wird geändert oder gelöscht, keine
-- Zeile angefasst. Die App läuft auch ohne diese Migration weiter.
--
-- Hintergrund: Die deutschen Bedeutungen entstanden bisher mit Blick
-- auf die (teils schlampige) englische Inventar-Glosse; jetzt
-- übersetzt der Lauf aus dem Koreanischen und lässt jede Bedeutung
-- von einem zweiten Modell prüfen. Dafür braucht es:
--   info         Infotext „Gut zu wissen" (2-5 Zeilen, Deutsch)
--   familie      Bedeutungsfamilie (때/시간, 진짜/정말) — auf der
--                Erkennen-Karte zählt jedes Familienmitglied
--   zaehlwort    Zählwort ja/nein, zahlsystem native/sino/beide
--   hand         Felder, die Franz von Hand geändert hat, z. B.
--                ["de","nuance"] — der Lauf fasst die nie mehr an
--   anreicherung Versionsnummer des Verfahrens; alles unter 2 wird
--                beim nächsten Lauf neu erzeugt
-- ============================================================

-- ---------- 0. Sicherung ----------
-- Rückgängig wäre:
--   update words w set de = b.de, nuance = b.nuance
--   from words_backup_v3 b where b.id = w.id;
create table if not exists words_backup_v3 as
  select id, ko, en, de, pos, nuance, now() as gesichert_am
  from words where profile = 'ko';
alter table words_backup_v3 enable row level security;

-- ---------- 1. Wörter ----------
alter table words add column if not exists info         text;
alter table words add column if not exists familie      text;
alter table words add column if not exists zaehlwort    boolean not null default false;
alter table words add column if not exists zahlsystem   text;
alter table words add column if not exists hand         jsonb;
alter table words add column if not exists anreicherung integer not null default 0;

-- ---------- 2. Vorrat ----------
alter table vorrat add column if not exists info         text;
alter table vorrat add column if not exists familie      text;
alter table vorrat add column if not exists zaehlwort    boolean not null default false;
alter table vorrat add column if not exists zahlsystem   text;
alter table vorrat add column if not exists anreicherung integer not null default 0;
-- Warum das Wort übersprungen wurde (Bibliothek / Zahl / Ableitung)
alter table vorrat add column if not exists grund        text;

-- ---------- Kontrolle ----------
-- Erwartet: 6 Zeilen words, 6 Zeilen vorrat, dazu die Sicherungszahl.
select 'words' as tabelle, column_name from information_schema.columns
  where table_name = 'words'
    and column_name in ('info','familie','zaehlwort','zahlsystem','hand','anreicherung')
union all
select 'vorrat', column_name from information_schema.columns
  where table_name = 'vorrat'
    and column_name in ('info','familie','zaehlwort','zahlsystem','anreicherung','grund')
union all
select 'backup_v3', count(*)::text from words_backup_v3;
