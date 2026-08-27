-- ============================================================
-- Wortart-Spalte + einheitliche Übersetzungen für 해인
--
-- EINMALIG im Supabase SQL Editor einfügen und auf "Run" klicken.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Format der Bedeutung ab jetzt:  English (한국어)
--
-- Schritt 1 legt eine SICHERUNG an. Falls dir etwas nicht passt:
--   update words w set en = b.en_alt, ko = b.ko_alt
--   from words_backup_wordclass b where b.id = w.id;
-- ============================================================

-- ---------- 1. Sicherung der jetzigen Werte ----------
create table if not exists words_backup_wordclass as
  select id, ko as ko_alt, en as en_alt, now() as gesichert_am
  from words where profile = 'de';

-- ---------- 2. Neue Spalte für die Wortart ----------
-- noun | verb | adj | adv | phrase | other
alter table words add column if not exists pos text;

-- ---------- 3. Zwei Schreibfehler im deutschen Wort ----------
update words set ko = 'schreiben' where profile = 'de' and ko = 'screiben';
update words set ko = 'denken'    where profile = 'de' and ko = 'denke';

-- ---------- 4. Bedeutung + Wortart setzen ----------
-- Zugeordnet über das deutsche Wort (pro Person eindeutig).
update words w
set en = v.en, pos = v.pos
from (values
  -- ----- Substantive -----
  ('das Kind',    'child (아이)',            'noun'),
  ('die Leute',   'people (사람들)',          'noun'),
  ('das Geld',    'money (돈)',              'noun'),
  ('das Handy',   'mobile phone (휴대폰)',    'noun'),
  ('das Bier',    'beer (맥주)',             'noun'),
  ('der Wein',    'wine (와인)',             'noun'),
  ('das Wasser',  'water (물)',              'noun'),
  ('die Katze',   'cat (고양이)',             'noun'),
  ('der Hund',    'dog (개)',                'noun'),
  ('die Mutter',  'mother (어머니)',          'noun'),
  ('die Familie', 'family (가족)',            'noun'),

  -- ----- Verben -----
  ('trinken',    'to drink (마시다)',                    'verb'),
  ('wissen',     'to know (알다)',                       'verb'),
  ('mögen',      'to like (좋아하다)',                    'verb'),
  ('duschen',    'to shower (샤워하다)',                  'verb'),
  ('waschen',    'to wash (씻다)',                       'verb'),
  ('schlafen',   'to sleep (자다)',                      'verb'),
  ('fahren',     'to drive, to go by vehicle (타고 가다)', 'verb'),
  ('lesen',      'to read (읽다)',                       'verb'),
  ('sehen',      'to see (보다)',                        'verb'),
  ('nehmen',     'to take (가져가다)',                    'verb'),
  ('treffen',    'to meet (만나다)',                     'verb'),
  ('sagen',      'to say (말하다)',                      'verb'),
  ('sprechen',   'to speak (이야기하다)',                 'verb'),
  ('essen',      'to eat (먹다)',                        'verb'),
  ('helfen',     'to help (돕다)',                       'verb'),
  ('geben',      'to give (주다)',                       'verb'),
  ('haben',      'to have (가지다)',                     'verb'),
  ('schreiben',  'to write (쓰다)',                      'verb'),
  ('antworten',  'to answer (대답하다)',                  'verb'),
  ('reisen',     'to travel (여행하다)',                  'verb'),
  ('öffnen',     'to open (열다)',                       'verb'),
  ('warten',     'to wait (기다리다)',                    'verb'),
  ('schenken',   'to give as a present (선물하다)',        'verb'),
  ('brauchen',   'to need (필요하다)',                    'verb'),
  ('denken',     'to think (생각하다)',                   'verb'),
  ('besuchen',   'to visit (방문하다)',                   'verb'),
  ('suchen',     'to look for (찾다)',                    'verb'),
  ('sitzen',     'to sit (앉다)',                        'verb'),
  ('bauen',      'to build (짓다)',                      'verb'),
  ('tanzen',     'to dance (춤추다)',                    'verb'),
  ('hören',      'to hear (듣다)',                       'verb'),
  ('spazieren',  'to stroll (산책하다)',                  'verb'),
  ('kochen',     'to cook (요리하다)',                    'verb'),
  ('arbeiten',   'to work (일하다)',                     'verb'),
  ('heißen',     'to be called (이름이 ~이다)',            'verb'),
  ('backen',     'to bake (굽다)',                       'verb'),
  ('studieren',  'to study at university (대학에서 공부하다)', 'verb'),
  ('machen',     'to do, to make (하다, 만들다)',          'verb'),
  ('gehen',      'to go (가다)',                         'verb'),
  ('lieben',     'to love (사랑하다)',                    'verb'),
  ('verkaufen',  'to sell (팔다)',                       'verb'),
  ('schwimmen',  'to swim (수영하다)',                    'verb'),
  ('kommen',     'to come (오다)',                       'verb'),
  ('wohnen',     'to live, to reside (살다)',             'verb'),
  ('kaufen',     'to buy (사다)',                        'verb'),
  ('lernen',     'to learn (배우다)',                     'verb')
) as v(ko, en, pos)
where w.profile = 'de' and w.ko = v.ko;

-- ---------- 5. Kontrolle ----------
-- Sollte 57 Zeilen zeigen, keine davon mit leerer Wortart.
select pos, count(*) from words where profile = 'de' group by pos
union all
select 'OHNE WORTART', count(*) from words where profile = 'de' and pos is null;
