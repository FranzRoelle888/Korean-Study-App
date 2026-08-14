-- ============================================================
-- Zwei Lernende in einer Datenbank trennen
--
-- EINMALIG im Supabase SQL Editor einfügen und auf "Run" klicken.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Was passiert: jede Zeile bekommt ein Kürzel, wem sie gehört.
--   'ko' = Franz  (lernt Koreanisch)
--   'de' = seine Freundin (lernt Deutsch)
-- Alle BESTEHENDEN Zeilen bekommen automatisch 'ko' — es geht
-- also nichts verloren und nichts wird überschrieben.
-- ============================================================

-- ---------- 1. Die Spalte anlegen ----------
alter table words     add column if not exists profile text not null default 'ko';
alter table cards     add column if not exists profile text not null default 'ko';
alter table daily_log add column if not exists profile text not null default 'ko';

-- ---------- 2. Der wichtigste Teil: die Streak trennen ----------
-- Bisher war der Tag allein der Schlüssel von daily_log. Damit würde
-- ein erledigter Tag von ihr denselben Tag bei Franz mit abhaken.
-- Neuer Schlüssel: Kürzel + Tag.
alter table daily_log drop constraint if exists daily_log_pkey;
alter table daily_log add primary key (profile, day);

-- ---------- 3. Karten-Vorderseiten ----------
-- Die alte Regel liess nur 'en' und 'ko' zu. Die Bedeutung ist jetzt
-- allgemein: 'type' = Wort eintippen, 'flip' = Karte umdrehen.
-- Die alten Werte bleiben gültig, damit nichts umgeschrieben werden muss.
alter table cards drop constraint if exists cards_front_check;
alter table cards add constraint cards_front_check
  check (front in ('en', 'ko', 'type', 'flip'));

-- ---------- 4. Suchgeschwindigkeit ----------
create index if not exists words_profile_idx on words (profile);
create index if not exists cards_profile_due_idx on cards (profile, due);

-- ---------- 5. Kontrolle ----------
-- Sollte zeigen: alle bisherigen Zeilen stehen auf 'ko'.
select 'words' as tabelle, profile, count(*) from words     group by profile
union all
select 'cards',            profile, count(*) from cards     group by profile
union all
select 'daily_log',        profile, count(*) from daily_log group by profile;
