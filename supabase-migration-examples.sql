-- ============================================================
-- Beispielsätze zu Wörtern
--
-- EINMALIG im Supabase SQL Editor einfügen und auf "Run" klicken.
-- Kann gefahrlos erneut ausgeführt werden. Legt nur Spalten an.
--
-- ex     kurzer Beispielsatz in der ZIELsprache
--        (Koreanisch bei Franz, Deutsch bei 해인)
-- ex_tr  Übersetzung des Satzes in die jeweils bekannte Sprache
--
-- Gefüllt werden sie vom nächtlichen Lauf ("Zusatzinfos
-- nachtragen") — für BEIDE Seiten. Beim Nachziehen aus dem
-- Vorrat kommen die dort hinterlegten Sätze direkt mit.
-- ============================================================

alter table words add column if not exists ex text;
alter table words add column if not exists ex_tr text;

-- Beschleunigt die Suche nach "noch ohne Beispielsatz" im Nachtlauf.
create index if not exists words_ex_todo_idx on words (profile) where ex is null;

-- ---------- Kontrolle ----------
select profile, count(*) as woerter, count(ex) as mit_beispielsatz
from words group by profile order by profile;
