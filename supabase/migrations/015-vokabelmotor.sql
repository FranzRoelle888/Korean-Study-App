-- ============================================================
-- 015: Vokabel-Motor V2 (Franz' Seite) — Konzept docs/VOKABEL-KONZEPT.md
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden (alles "if not exists").
-- Rein ADDITIV: keine Spalte wird geändert oder gelöscht, keine
-- Zeile angefasst. Die App läuft auch ohne diese Migration weiter
-- (Schema-Toleranz) — sie zeigt dann schlicht keine neuen Felder.
--
-- Drei Teile:
--   1. words: Inhaltsfelder für die Karte (deutsche Bedeutung,
--      Nuance, Hanja-Bausteine, Inventar-Bezug)
--   2. cards: Hör-Stufe + Zähler für die Produktions-Freischaltung
--   3. vorrat: angereicherte, noch nicht eingeführte Inventarwörter
--   dazu eine Sicherung der heutigen ko-Wörter (Rückgängig-Netz
--   für den Anreicherungs-Lauf)
-- ============================================================

-- ---------- 0. Sicherung ----------
-- Der Anreicherungs-Lauf schreibt nur in bisher LEERE Felder und
-- nie in en/ko. Trotzdem: Netz. Rückgängig wäre
--   update words w set de = null, nuance = null, hanja = null,
--     inv_id = null, rang = null from words_backup_v2 b where b.id = w.id;
create table if not exists words_backup_v2 as
  select id, ko, en, pos, ex, ex_tr, now() as gesichert_am
  from words where profile = 'ko';

-- ---------- 1. Wörter ----------
alter table words add column if not exists de      text;     -- deutsche Bedeutung (in Klammern auf der Karte)
alter table words add column if not exists nuance  text;     -- Kurzhinweis, per Punkt antippbar; meist null
alter table words add column if not exists hanja   jsonb;    -- [{"z":"水","les":"수","de":"Wasser","i":0}] — i = Silbenindex
alter table words add column if not exists inv_id  text;     -- TOPIK-Inventar-Id (t-123), wenn das Wort dort steht
alter table words add column if not exists rang    integer;  -- Häufigkeitsrang aus dem Inventar

-- ---------- 2. Karten ----------
-- modus: 'text' (Wort lesen) oder 'audio' (nur hören) — die
-- Erkennen-Karte verwandelt sich ab Stabilität 21 Tage.
alter table cards add column if not exists modus text not null default 'text';
alter table cards drop constraint if exists cards_modus_check;
alter table cards add constraint cards_modus_check check (modus in ('text', 'audio'));
-- Hör-Fehlschläge in Folge (2 -> nächstes Mal Text + Audio)
alter table cards add column if not exists hoer_fehler integer not null default 0;
-- Erfolge ("Got it"/"Instant") der Erkennen-Karte — ab 2 gibt es
-- die Produktions-Karte
alter table cards add column if not exists erfolge integer not null default 0;

-- ---------- 3. Vorrat ----------
create table if not exists vorrat (
  inv_id        text not null,
  profile       text not null default 'ko',
  ko            text not null,
  en            text not null,
  de            text,
  pos           text,
  rang          integer,
  ex            text,
  ex_tr         text,
  nuance        text,
  hanja         jsonb,
  bereit        boolean not null default false,  -- Textinhalte komplett und geprüft
  audio_ok      boolean not null default false,  -- TTS für Wort + Satz liegt im Cache
  uebersprungen boolean not null default false,  -- stand schon in der Bibliothek
  created_at    timestamptz default now(),
  primary key (profile, inv_id)
);
create index if not exists vorrat_profile_rang_idx on vorrat (profile, rang);

-- Zugriff wie bei den anderen Tabellen: nur eingeloggte Nutzer.
alter table vorrat enable row level security;
drop policy if exists "vorrat_auth" on vorrat;
create policy "vorrat_auth" on vorrat
  for all to authenticated using (true) with check (true);

-- ---------- Kontrolle ----------
-- Erwartet: de, nuance, hanja, inv_id, rang bei words;
-- modus, hoer_fehler, erfolge bei cards; Tabelle vorrat leer.
select 'words' as tabelle, column_name from information_schema.columns
  where table_name = 'words' and column_name in ('de','nuance','hanja','inv_id','rang')
union all
select 'cards', column_name from information_schema.columns
  where table_name = 'cards' and column_name in ('modus','hoer_fehler','erfolge')
union all
select 'vorrat', count(*)::text from vorrat;
