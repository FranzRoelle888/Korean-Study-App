-- ============================================================
-- 018: Formalitätsgrad, Partikel und 해요-Form (Franz' Seite)
--      Wunsch Franz 10.09.
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden (alles "if not exists").
-- Rein ADDITIV.
--
-- 1. FORMALITÄTSGRAD (register)
--    Im Koreanischen steckt die Höflichkeit meistens in der ENDUNG,
--    nicht im Wort — 먹다 selbst ist weder formell noch informell.
--    Es gibt aber Wörter, die die Ebene im Stamm tragen, und genau
--    die kann man nicht raten:
--      höflich    über eine Respektsperson: 드시다, 계시다, 주무시다,
--                 분, 성함, 연세
--      bescheiden über mich selbst nach oben: 드리다, 여쭈다, 저
--      neutral    der Normalfall — bekommt KEINEN Chip, sonst
--                 tragen 90 % der Karten Rauschen
--      locker     nur unter Freunden: 뭐, 거, 진짜, 대박
--    register_partner hält das Gegenstück: auf 먹다 steht 드시다,
--    auf 드시다 steht 먹다. Das ist Franz' „Alternative der anderen
--    Seite".
--
-- 2. PARTIKEL (die Spalte kasus aus Migration 017 wird mitbenutzt)
--    Welche Partikel das Verb verlangt — das Gegenstück zum Kasus
--    auf 해인s Seite:
--      친구를 만나다 (를)      nicht 에게, obwohl "sich treffen MIT"
--      버스를 타다 (를)        nicht 에, obwohl "einsteigen IN"
--      커피가 좋다 (가)        gegen 커피를 좋아하다 (를)
--      ~에게 ~을 주다          zwei Ergänzungen
--    Keine neue Spalte nötig.
--
-- 3. 해요-FORM (haeyo) + UNREGELMÄSSIGKEIT (unregel)
--    Das Gegenstück zu Plural und Konjugation auf ihrer Seite.
--    Aus 덥다 wird 더워요, nicht 덥어요 — das ist nicht ableitbar,
--    wenn man die Klasse nicht kennt.
--      haeyo   "더워요"
--      unregel "ㅂ" | "ㄷ" | "ㅅ" | "르" | "ㅎ" | "으" | null
-- ============================================================

-- Sicherung wie bei 016/017 — Rückgängig wäre:
--   update words w set nuance = b.nuance from words_backup_ko3 b
--   where b.id = w.id;
create table if not exists words_backup_ko3 as
  select id, ko, en, de, pos, nuance, now() as gesichert_am
  from words where profile = 'ko';
alter table words_backup_ko3 enable row level security;

alter table words add column if not exists register         text;
alter table words add column if not exists register_partner text;
alter table words add column if not exists haeyo            text;
alter table words add column if not exists unregel          text;

alter table vorrat add column if not exists register         text;
alter table vorrat add column if not exists register_partner text;
alter table vorrat add column if not exists haeyo            text;
alter table vorrat add column if not exists unregel          text;
-- kasus kam mit 017 nur auf words (dort brauchte es 해인s Bibliothek).
-- Franz' Vorrat ist eine TABELLE und traegt die Partikel ebenfalls.
alter table vorrat add column if not exists kasus            text;
-- Nachtrag-Verfahren: getrennt von anreicherung gezählt, damit die
-- teure Bedeutungs-Anreicherung nicht erneut laufen muss.
alter table words add column if not exists extras_stand integer not null default 0;
alter table vorrat add column if not exists extras_stand integer not null default 0;

-- ---------- Kontrolle ----------
-- Erwartet: 5 Zeilen für words, 6 für vorrat, dazu die Sicherungszahl.
select 'words' as tabelle, column_name from information_schema.columns
  where table_name = 'words'
    and column_name in ('register','register_partner','haeyo','unregel','extras_stand')
union all
select 'vorrat', column_name from information_schema.columns
  where table_name = 'vorrat'
    and column_name in ('register','register_partner','haeyo','unregel','extras_stand','kasus')
union all
select 'backup_ko3', count(*)::text from words_backup_ko3;
