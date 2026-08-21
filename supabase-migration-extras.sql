-- ============================================================
-- Zusatzinfos zu Wörtern: Plural und Konjugation
--
-- EINMALIG im Supabase SQL Editor einfügen und auf "Run" klicken.
-- Kann gefahrlos erneut ausgeführt werden. Legt nur Spalten an,
-- ändert keine bestehenden Daten.
-- ============================================================

-- Pluralform bei Substantiven, z. B. "die Häuser".
-- NULL = noch nicht bekannt.
alter table words add column if not exists plural text;

-- Hinweis, wenn es nicht eindeutig ist:
--   "die Worte (zusammenhängende Rede) / die Wörter (einzelne)"
--   oder "kein Plural"
-- Damit steht im Zweifel eine Erklärung da statt einer erfundenen Form.
alter table words add column if not exists plural_note text;

-- Konjugation im Präsens als JSON:
--   {"ich":"gehe","du":"gehst","er":"geht",
--    "wir":"gehen","ihr":"geht","sie":"gehen"}
-- Bei trennbaren Verben steht die geteilte Form drin:
--   {"ich":"stehe auf", ...}
alter table words add column if not exists conj jsonb;

-- Wurde das vom woechentlichen Lauf ergaenzt (true) oder von Hand
-- geprueft (false)? Steuert den kleinen Hinweis in der Bibliothek.
alter table words add column if not exists extras_auto boolean not null default false;

-- Beschleunigt die Suche nach "noch ohne Zusatzinfos" im Wochenlauf.
create index if not exists words_extras_todo_idx
  on words (profile, pos)
  where plural is null and conj is null;

-- ---------- Kontrolle ----------
select
  pos,
  count(*)                                as woerter,
  count(plural)                           as mit_plural,
  count(conj)                             as mit_konjugation
from words
where profile = 'de'
group by pos
order by pos;
