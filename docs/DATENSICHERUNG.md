# Datensicherung — das idiotensichere Konzept

> Ziel: Lernfortschritt und Vokabeln können durch KEINEN einzelnen
> Zwischenfall verloren gehen — nicht durch Fehltipps, nicht durch
> App-Bugs, nicht durch den Verlust des Supabase-Projekts.
> Hintergrund: Der Supabase-Gratis-Tarif macht KEINE automatischen
> Backups; ohne dieses Konzept gäbe es die Daten nur ein einziges Mal.

## Die Schutzschichten

| # | Schicht | Schützt vor | Status |
|---|---------|-------------|--------|
| 1 | **Tägliche Off-Site-Sicherung** — jede Nacht (02:30 UTC) exportiert eine GitHub-Action alle Tabellen als JSON ins **private** Repo `Korean-App-Backup`. Jede Sicherung = ein Git-Commit → jeder Tagesstand der Vergangenheit bleibt abrufbar (Zeitmaschine). | Totalverlust des Supabase-Projekts, schleichende Datenfehler, versehentliches Massen-Löschen | aktiv, sobald Franz das private Repo + Token angelegt hat |
| 2 | **Schrumpf-Wächter** — schrumpft eine Kern-Tabelle (words, cards, daily_log, skills, inventory_status) gegenüber der Vortags-Sicherung um mehr als ~20 %, wird trotzdem gesichert (die Historie bewahrt den alten Stand), aber der Lauf schlägt rot an und **GitHub mailt Franz automatisch**. Ebenso bei komplett leerer words-Tabelle (Zugriffs-Verdacht). | unbemerkte Löschungen/Bugs | im Backup-Skript eingebaut |
| 3 | **Lösch-Bremsen in der App** — Rückfragen vor jedem Löschen (Wörter: vorhanden; Skills: seit heute). Geplant für später: Papierkorb (Soft-Delete mit 30 Tagen Frist) statt endgültigem Löschen. | Fehltipps | Rückfragen aktiv; Papierkorb im Ideen-Speicher |
| 4 | **Cloud als einzige Wahrheit** — das Handy hält nur Puffer/Caches; App oder Icon löschen kostet nie Daten, nur den Login. | Geräteverlust, Cache-Probleme | seit jeher so gebaut |
| 5 | **Manueller CSV-Export** in der Bibliothek — für das gute Gefühl, jederzeit selbst eine Kopie ziehen zu können. | alles, als Handauszug | vorhanden |
| 6 | **Wach-Halter** — der nächtliche Sicherungs-Zugriff verhindert nebenbei, dass Supabase das Gratis-Projekt wegen Inaktivität pausiert (z. B. im Urlaub). | Projekt-Pausierung | Nebeneffekt von Schicht 1 |
| 7 | **Code & Inventare** liegen im GitHub-Repo (öffentlich) — Vokabellisten, Grammatik-Kanons, Migrationen sind damit ohnehin doppelt vorhanden. | — | vorhanden |

Künftige Partner-**Audioaufnahmen** (nicht regenerierbar!) werden in die
nächtliche Sicherung aufgenommen, sobald das Feature existiert (Storage-
Bucket mit ins Backup-Repo spiegeln). Der TTS-Cache wird bewusst NICHT
gesichert — er ist jederzeit für Centbeträge neu erzeugbar.

## Wiederherstellung (der Ernstfall, Schritt für Schritt)

**Fall A — einzelne Daten versehentlich gelöscht** (z. B. ein Wort, ein
Skill): Im privaten Backup-Repo die betreffende JSON-Datei öffnen
(GitHub-Weboberfläche reicht), über die Datei-Historie den Stand von
gestern ansehen, Eintrag herauskopieren — Claude spielt ihn gezielt
zurück.

**Fall B — größerer Schaden, Projekt existiert noch**: Stand aus der
Git-Historie des Backup-Repos auschecken, dann
`scripts/wiederherstellen.mjs` gegen das bestehende Projekt laufen lassen
(Upsert — überschreibt nichts Neueres unnötig, löscht nie).

**Fall C — Totalverlust des Supabase-Projekts**:
1. Neues Supabase-Projekt anlegen (Gratis-Tarif reicht).
2. Migrationen 001–009 der Reihe nach im SQL-Editor ausführen.
3. Nutzerkonten neu anlegen (Authentication → Add user, wie gehabt),
   Signups wieder abschalten.
4. Letzte Sicherung auschecken und `scripts/wiederherstellen.mjs`
   mit den Zugangsdaten des NEUEN Projekts laufen lassen.
5. In `src/core/supabaseClient.js` URL + publishable Key des neuen
   Projekts eintragen, Edge Functions (trainer, speech) neu deployen,
   Secrets setzen, GitHub-Secrets (SUPABASE_SERVICE_KEY) erneuern.
6. In der App prüfen: Wortanzahl, Kalender, Skills, Kalibrierung.

Das Skript ist absichtlich sperrig aufrufbar
(`RESTORE_BESTAETIGUNG=JA` + explizite Ziel-Zugangsdaten), damit es
niemals aus Versehen läuft.

## Wartung & Wachsamkeit

- **Rote Workflow-Läufe = Mail an Franz.** Eine Mail von GitHub über
  einen fehlgeschlagenen „Datensicherung"-Lauf niemals ignorieren —
  entweder ist der Token abgelaufen (harmlos, erneuern) oder der
  Schrumpf-Wächter hat angeschlagen (nachsehen!).
- **Der BACKUP_TOKEN läuft ab** (fine-grained Tokens: max. 1 Jahr).
  Ablauf ⇒ rote Läufe ⇒ Mail ⇒ neuen Token erzeugen und das Secret
  aktualisieren. Zwei Minuten Arbeit.
- Gelegentlich (alle paar Monate) einen Blick ins Backup-Repo werfen:
  `daten/STAND.txt` zeigt Datum und Zeilenzahlen der letzten Sicherung.
