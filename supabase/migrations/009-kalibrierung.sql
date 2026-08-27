-- ============================================================
-- 009: Kalibrierungs-Ergebnisse (Wissensmodell über den Inventaren)
--
-- EINMALIG im Supabase SQL Editor ausführen.
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Eine Zeile je beurteiltem Inventar-Eintrag (Wort oder
-- Grammatikpunkt). label trägt die lesbare Form ("가다 (to go)"),
-- damit die Trainer-Funktion die Tabelle direkt in den Prompt
-- kippen kann, ohne die Inventar-Dateien zu kennen.
-- ============================================================

create table if not exists inventory_status (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  item_id text not null,          -- z. B. 't-123', 'g-45', 'tg-vergangenheit'
  kind text not null,             -- wort | grammatik
  status text not null,           -- sicher | wackelig | unbekannt
  label text,                     -- lesbare Form für den Trainer-Prompt
  source text not null default 'kalibrierung',
  created_at timestamptz default now(),
  unique (profile, item_id)
);

create index if not exists inventory_status_idx
  on inventory_status (profile, kind, status);

alter table inventory_status enable row level security;
drop policy if exists "inventory_status_auth" on inventory_status;
create policy "inventory_status_auth" on inventory_status
  for all to authenticated using (true) with check (true);

-- ---------- Kontrolle ----------
select 'inventory_status' as tabelle, count(*) from inventory_status;
