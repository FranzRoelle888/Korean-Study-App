-- ============================================================
-- 007: Echte Zugriffsregeln — nur eingeloggte Nutzer
--
-- EINMALIG im Supabase SQL Editor ausführen (erst NACHDEM die
-- beiden Nutzerkonten in Authentication -> Users angelegt sind,
-- sonst sperrt man sich selbst aus der App aus!).
-- Kann gefahrlos erneut ausgeführt werden.
--
-- Was hier passiert: Bisher standen alle Tabellen für JEDEN offen,
-- der die App-Adresse und den öffentlichen Schlüssel kennt (beides
-- steht im öffentlichen Code auf GitHub Pages). Ab jetzt gilt:
-- ohne Login keine Daten.
--
-- Bewusste Entscheidung (siehe ZIELBILD.md Entscheidungs-Log):
-- Die Regeln schützen vor FREMDEN, nicht voreinander. Beide
-- eingeloggten Konten dürfen beide Profile lesen und schreiben —
-- Franz verwaltet auch 해인s Seite, der Kalender zeigt den Partner,
-- und das Umschalten per Flagge funktioniert weiter.
-- ============================================================

-- Sicherstellen, dass die Zeilenschutz-Schalter überall an sind
-- (daily_log war früh von Hand angelegt und fehlt in 001)
alter table words         enable row level security;
alter table cards         enable row level security;
alter table daily_log     enable row level security;
alter table skills        enable row level security;
alter table sessions      enable row level security;
alter table trainer_usage enable row level security;

-- Alle bisherigen (offenen) Regeln auf diesen Tabellen entfernen,
-- egal wie sie heißen
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('words','cards','daily_log','skills','sessions','trainer_usage')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Neue Regeln: Zugriff nur für angemeldete Nutzer ("authenticated").
-- Wer nur den öffentlichen Schlüssel hat (Rolle "anon"), sieht nichts.
create policy "words_auth"     on words     for all to authenticated using (true) with check (true);
create policy "cards_auth"     on cards     for all to authenticated using (true) with check (true);
create policy "daily_log_auth" on daily_log for all to authenticated using (true) with check (true);
create policy "skills_auth"    on skills    for all to authenticated using (true) with check (true);
create policy "sessions_auth"  on sessions  for all to authenticated using (true) with check (true);

-- trainer_usage braucht KEINE Client-Regel: Nur die Edge Function
-- schreibt hinein (mit dem Service-Schlüssel, der an allen Regeln
-- vorbei darf). Ohne Regel = für die App unsichtbar. Genau richtig.

-- ---------- Kontrolle ----------
-- Sollte 5 Zeilen mit "..._auth" zeigen:
select tablename, policyname, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('words','cards','daily_log','skills','sessions','trainer_usage')
order by tablename;
