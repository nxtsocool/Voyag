# Migration 2026-09-30 – Anleitung

Diese Migration setzt die App-Fixes aus dem Testbericht vom 30.09.2026 um. Sie ist
idempotent (kann mehrfach ausgefuehrt werden) und loescht keine bestehenden Daten.

## Ausfuehren

1. Öffne im Supabase-Dashboard den **SQL-Editor** des Projekts.
2. Kopiere den **gesamten Inhalt** von `2026-09-30_testbericht.sql` in ein neues Query-Fenster.
3. Klicke **Run**. Die Ausgabe zeigt `NOTICE`-Zeilen für Sonderfälle (z. B. nicht
   parsebare Datumswerte oder `fuer`-Felder) – das sind Hinweise, keine Fehler.
   Nur ein rotes `ERROR` bricht die Migration ab.
4. Prüfe direkt danach die Checkliste unten.

Das ist der **einzige** Schritt – die Datei enthält alle 8 Teile in der richtigen
Reihenfolge (Trip-Währung, Datumsfelder, Teilnehmer-IDs, Cascade-Deletes,
eindeutiger Einladungscode, Nutzersuche + Profil-RLS, Konto löschen, Rechte).

Falls du die Migration in Zukunft erneut anpassen musst: einfach eine neue,
eigene Datei mit neuem Datum anlegen statt diese zu verändern, damit die
Historie nachvollziehbar bleibt.

## Wichtige Annahmen, die du prüfen solltest

- **`teilnehmer.id` ist `bigint`.** Falls deine Tabelle stattdessen `uuid`-IDs
  verwendet, schlagen die `alter table ... references public.teilnehmer(id)`-
  Anweisungen in Abschnitt 3 fehl. Sag in dem Fall Bescheid, dann passe ich den
  Typ an.
- **`trip_members` hatte bisher keine `created_at`-Spalte.** Die Migration legt
  sie mit Default `now()` an. Für bereits bestehende Mitgliedschaften ist die
  „älteste Mitgliedschaft"-Ermittlung in `delete_own_account()` dadurch nur ein
  Best-Effort (alle Bestandsmitglieder bekommen denselben Zeitstempel, die
  Auswahl des neuen Besitzers ist dann de facto beliebig). Das betrifft nur den
  seltenen Fall „Ersteller löscht Konto, Reise hat mehrere Mitglieder" – ab dem
  Zeitpunkt der Migration ist die Reihenfolge für neue Mitgliedschaften korrekt.
- **Bestehende RLS-Policies auf `profiles`, `trips` (UPDATE/DELETE) und
  `teilnehmer` (DELETE) werden ersetzt**, unabhängig davon wie sie bisher
  hießen. Policies auf anderen Tabellen (ausgaben, packliste, trip_orte, …)
  fasst die Migration **nicht** an – die sollen wie bisher für alle
  Trip-Mitglieder offen bleiben.

## Checkliste: Hat die Migration geklappt?

Führe diese Abfragen im SQL-Editor aus:

```sql
-- 1) Reisewährung: sollte 0 sein (alle Trips haben jetzt eine Währung)
select count(*) from public.trips where waehrung is null;

-- 2) Datumsfelder: Trips, bei denen der Backfill nicht geklappt hat
select id, name, datum, start_datum, end_datum
from public.trips
where datum is not null and (start_datum is null or end_datum is null);

-- 3) Teilnehmer-IDs: Ausgaben ohne bezahlt_von_id trotz vorhandenem Namen
select id, trip_id, bezahlt_von
from public.ausgaben
where bezahlt_von is not null and bezahlt_von_id is null;

-- 3b) Ausgaben, bei denen "fuer" gesetzt ist, aber fuer_ids nicht befüllt wurde
select id, trip_id, fuer
from public.ausgaben
where fuer is not null and fuer_ids is null;

-- 3c) Abrechnungen ohne von_id/an_id trotz vorhandenem Namen
select id, trip_id, von, an, von_id, an_id
from public.abrechnungen
where (von is not null and von_id is null) or (an is not null and an_id is null);

-- 4) Cascade-Deletes: alle 11 Tabellen sollten hier auftauchen
select conrelid::regclass as tabelle, conname
from pg_constraint
where contype = 'f' and confrelid = 'public.trips'::regclass
order by 1;

-- 5) Einladungscode eindeutig
select conname from pg_constraint where conname = 'trips_invite_code_key';
-- falls leer: Duplikate bereinigen, dann manuell erneut ausführen:
-- alter table public.trips add constraint trips_invite_code_key unique (invite_code);

-- 6) Nutzersuche + Profil-RLS
select proname from pg_proc where proname in ('find_user_by_email', 'sind_mitreisende');
select policyname from pg_policies where tablename = 'profiles';

-- 7) Konto löschen
select proname from pg_proc where proname = 'delete_own_account';

-- 8) Rechte
select tablename, policyname, cmd from pg_policies
where tablename in ('trips', 'teilnehmer') and cmd in ('UPDATE', 'DELETE')
order by 1, 3;
```

Wenn Zeile 3 oder 3b/3c Treffer liefert: meist bedeutet das, dass Name in
`teilnehmer` und der gespeicherte Name in `ausgaben`/`abrechnungen`
unterschiedlich geschrieben sind (Tippfehler, Groß-/Kleinschreibung mit
Sonderzeichen, o. Ä.). Diese Einträge müssen einmalig manuell per UPDATE
korrigiert werden – die App selbst verhindert das Problem ab jetzt durch die
Dublettenprüfung beim Anlegen neuer Teilnehmer.
