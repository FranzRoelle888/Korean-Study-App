-- ============================================================
-- 014: Tagesstand über Geräte hinweg — Fund Franz 06.09.
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Die Tages-Häkchen (neue Wörter gelernt, Tages-Quiz gemacht)
-- lagen nur im localStorage des Geräts — ein zweites Gerät
-- zeigte alles als offen und bot sogar weitere neue Wörter an.
-- Jetzt speichert die App den Stand als jsonb in der
-- daily_log-Zeile des Tages: { "wort": 3, "quiz": true }.
-- ============================================================

alter table daily_log add column if not exists stand jsonb;

-- Kontrolle
select column_name from information_schema.columns
  where table_name = 'daily_log';
