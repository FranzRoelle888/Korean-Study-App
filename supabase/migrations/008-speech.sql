-- ============================================================
-- 008: Stimmen-Cache und Nutzungs-Log für die speech-Funktion
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden.
-- ============================================================

-- ---------- Audio-Cache-Bucket ----------
-- Öffentlich lesbar: Die Dateinamen sind SHA-256-Streuwerte des
-- Satztextes — ohne den exakten Text zu kennen, kann niemand eine
-- Datei erraten. Nur die Edge Function (Service-Schlüssel) kann
-- schreiben; die App liest direkt über die öffentliche URL, ganz
-- ohne Funktions-Aufruf. So kostet ein einmal erzeugter Satz nie
-- wieder etwas.
insert into storage.buckets (id, name, public)
values ('tts-cache', 'tts-cache', true)
on conflict (id) do nothing;

-- ---------- Nutzungs-Log ----------
-- Eigene Tabelle (bewusst getrennt von trainer_usage, damit sich
-- die Ratenlimits von Trainer und Stimmen nie in die Quere kommen).
-- amount = Zeichen (tts) bzw. Kilobyte der Aufnahme (stt).
create table if not exists speech_usage (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  action text not null,          -- tts | stt
  amount integer,
  created_at timestamptz default now()
);

create index if not exists speech_usage_rate_idx
  on speech_usage (profile, action, created_at desc);

-- Kein Client-Zugriff: nur die Edge Function schreibt (Service-
-- Schlüssel darf an den Regeln vorbei), die App braucht nichts.
alter table speech_usage enable row level security;

-- ---------- Kontrolle ----------
select 'bucket' as was, count(*)::text as wert from storage.buckets where id = 'tts-cache'
union all
select 'speech_usage', count(*)::text from speech_usage;
