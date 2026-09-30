-- ============================================================================
-- Voyag – Migration zum Testbericht vom 30.09.2026
-- ============================================================================
-- Diese Migration ist idempotent: sie kann beliebig oft im Supabase SQL-Editor
-- ausgefuehrt werden, ohne bestehende Daten zu verlieren oder Fehler zu werfen,
-- wenn Teile bereits angewendet wurden. Sie loescht nichts, sondern ergaenzt
-- Spalten/Constraints/Funktionen und fuellt neue Spalten per Backfill aus den
-- bestehenden Daten.
--
-- Reihenfolge und Anleitung: siehe README.md im selben Ordner.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Reisewaehrung
-- ----------------------------------------------------------------------------
alter table public.trips
  add column if not exists waehrung text not null default 'EUR';


-- ----------------------------------------------------------------------------
-- 2) Echte Datumsfelder (start_datum/end_datum), Backfill aus dem Textfeld
--    "datum" (Format "DD.MM.YYYY - DD.MM.YYYY"). Das alte Textfeld bleibt
--    bestehen (deprecated), damit alte Clients nicht brechen.
-- ----------------------------------------------------------------------------
alter table public.trips
  add column if not exists start_datum date,
  add column if not exists end_datum date;

do $$
declare
  r record;
  teile text[];
  start_teil text;
  end_teil text;
begin
  for r in
    select id, datum from public.trips
    where datum is not null and (start_datum is null or end_datum is null)
  loop
    teile := regexp_split_to_array(r.datum, '\s*-\s*');
    if array_length(teile, 1) = 2 then
      start_teil := trim(teile[1]);
      end_teil := trim(teile[2]);
      begin
        update public.trips
          set start_datum = coalesce(start_datum, to_date(start_teil, 'DD.MM.YYYY')),
              end_datum = coalesce(end_datum, to_date(end_teil, 'DD.MM.YYYY'))
          where id = r.id;
      exception when others then
        raise notice 'Konnte Datum fuer trip % nicht parsen: "%" (%)', r.id, r.datum, sqlerrm;
      end;
    else
      raise notice 'Unerwartetes Datumsformat bei trip %: "%"', r.id, r.datum;
    end if;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 3) Teilnehmer per ID statt Name
--    Alte Namensspalten (bezahlt_von, fuer, von, an) bleiben erhalten,
--    werden vom Client aber nicht mehr gelesen.
-- ----------------------------------------------------------------------------
alter table public.ausgaben
  add column if not exists bezahlt_von_id bigint references public.teilnehmer(id),
  add column if not exists fuer_ids bigint[];

alter table public.abrechnungen
  add column if not exists von_id bigint references public.teilnehmer(id),
  add column if not exists an_id bigint references public.teilnehmer(id);

-- Backfill bezahlt_von_id ueber (trip_id, name) – case-insensitive, getrimmt
update public.ausgaben a
set bezahlt_von_id = t.id
from public.teilnehmer t
where a.bezahlt_von_id is null
  and a.bezahlt_von is not null
  and t.trip_id = a.trip_id
  and lower(trim(t.name)) = lower(trim(a.bezahlt_von));

-- Backfill fuer_ids – "fuer" kann ein natives jsonb-Array, ein JSON-String
-- oder (selten) ein Postgres-Array-Literal sein. Zeilen, die sich keinem
-- der Formate zuordnen lassen, werden uebersprungen (RAISE NOTICE) und
-- sollten danach manuell geprueft werden (siehe README-Checkliste).
do $$
declare
  r record;
  namen text[];
  ids bigint[];
  n text;
  tid bigint;
begin
  for r in
    select id, trip_id, fuer from public.ausgaben
    where fuer_ids is null and fuer is not null
  loop
    namen := null;

    begin
      select array_agg(wert) into namen
      from jsonb_array_elements_text(r.fuer::jsonb) as wert;
    exception when others then
      namen := null;
    end;

    if namen is null then
      begin
        namen := r.fuer::text[];
      exception when others then
        namen := null;
      end;
    end if;

    if namen is null then
      raise notice 'Konnte "fuer" bei ausgabe % nicht parsen: %', r.id, r.fuer;
      continue;
    end if;

    ids := array[]::bigint[];
    foreach n in array namen loop
      select id into tid from public.teilnehmer
        where trip_id = r.trip_id and lower(trim(name)) = lower(trim(n))
        limit 1;
      if tid is not null then
        ids := array_append(ids, tid);
      end if;
    end loop;

    if array_length(ids, 1) > 0 then
      update public.ausgaben set fuer_ids = ids where id = r.id;
    end if;
  end loop;
end $$;

-- Backfill von_id / an_id bei Abrechnungen
update public.abrechnungen ab
set von_id = t.id
from public.teilnehmer t
where ab.von_id is null
  and ab.von is not null
  and t.trip_id = ab.trip_id
  and lower(trim(t.name)) = lower(trim(ab.von));

update public.abrechnungen ab
set an_id = t.id
from public.teilnehmer t
where ab.an_id is null
  and ab.an is not null
  and t.trip_id = ab.trip_id
  and lower(trim(t.name)) = lower(trim(ab.an));


-- ----------------------------------------------------------------------------
-- 4) ON DELETE CASCADE auf allen trip_id-Fremdschluesseln
--    Constraint-Namen werden dynamisch ermittelt (egal wie sie aktuell
--    heissen), der alte Constraint wird gedroppt und durch einen neuen mit
--    ON DELETE CASCADE ersetzt. Fehlt trip_id auf einer Tabelle ganz, greift
--    einfach der Fallback und legt den Constraint frisch an.
-- ----------------------------------------------------------------------------
do $$
declare
  tbl text;
  tabellen text[] := array[
    'teilnehmer', 'ausgaben', 'abrechnungen', 'packliste', 'trip_links',
    'trip_fluege', 'trip_unterkuenfte', 'trip_orte', 'trip_photos',
    'trip_members', 'visited_countries'
  ];
  constraint_name text;
begin
  foreach tbl in array tabellen loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl and column_name = 'trip_id'
    ) then
      raise notice 'Tabelle % hat keine Spalte trip_id – uebersprungen', tbl;
      continue;
    end if;

    select con.conname into constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = tbl
      and con.contype = 'f'
      and con.confrelid = 'public.trips'::regclass
      and con.conkey = array[
        (select attnum from pg_attribute where attrelid = con.conrelid and attname = 'trip_id')
      ];

    if constraint_name is not null then
      execute format('alter table public.%I drop constraint %I', tbl, constraint_name);
    end if;

    begin
      execute format(
        'alter table public.%I add constraint %I foreign key (trip_id) references public.trips(id) on delete cascade',
        tbl, tbl || '_trip_id_fkey'
      );
    exception when others then
      raise notice 'Konnte CASCADE-FK fuer % nicht anlegen (evtl. verwaiste trip_id-Werte): %', tbl, sqlerrm;
    end;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 5) Einladungscode eindeutig
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_invite_code_key') then
    if exists (
      select invite_code from public.trips
      where invite_code is not null
      group by invite_code having count(*) > 1
    ) then
      raise notice 'Doppelte invite_code-Werte gefunden – UNIQUE-Constraint wird NICHT angelegt. Bitte manuell bereinigen (siehe README).';
    else
      alter table public.trips add constraint trips_invite_code_key unique (invite_code);
    end if;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 6) Nutzersuche ohne Datenleck (K5)
-- ----------------------------------------------------------------------------
create or replace function public.find_user_by_email(p_email text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.id, p.name
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(trim(u.email)) = lower(trim(p_email))
    limit 1;
end;
$$;

revoke all on function public.find_user_by_email(text) from public;
grant execute on function public.find_user_by_email(text) to authenticated;

-- profiles-RLS: nur eigenes Profil + Profile von Mitreisenden lesbar
create or replace function public.sind_mitreisende(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where (t.user_id = a or exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id = a))
      and (t.user_id = b or exists (select 1 from public.trip_members m2 where m2.trip_id = t.id and m2.user_id = b))
  );
$$;

revoke all on function public.sind_mitreisende(uuid, uuid) from public;
grant execute on function public.sind_mitreisende(uuid, uuid) to authenticated;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy "profiles_select_self_and_co_travelers"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.sind_mitreisende(auth.uid(), id));


-- ----------------------------------------------------------------------------
-- 7) Konto loeschen (W14) – delete_own_account() ueberarbeitet
-- ----------------------------------------------------------------------------
-- created_at wird benoetigt, um das "aelteste" Mitglied zu ermitteln.
-- Fehlt die Spalte bisher, wird sie ergaenzt (Default now() fuer Bestandsdaten
-- ist ein Best-Effort – die urspruengliche Beitrittsreihenfolge bleibt
-- unbekannt, siehe README).
alter table public.trip_members
  add column if not exists created_at timestamptz not null default now();

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  eigene_id uuid := auth.uid();
  reise record;
  neuer_besitzer uuid;
begin
  if eigene_id is null then
    raise exception 'Nicht angemeldet';
  end if;

  -- Eigene Reisen durchgehen: ohne weitere Mitglieder loeschen (CASCADE erledigt
  -- den Rest dank Punkt 4), mit Mitgliedern an das aelteste Mitglied uebertragen
  for reise in select id from public.trips where user_id = eigene_id loop
    select tm.user_id into neuer_besitzer
      from public.trip_members tm
      where tm.trip_id = reise.id
      order by tm.created_at asc
      limit 1;

    if neuer_besitzer is null then
      delete from public.trips where id = reise.id;
    else
      update public.trips set user_id = neuer_besitzer where id = reise.id;
      delete from public.trip_members where trip_id = reise.id and user_id = neuer_besitzer;
    end if;
  end loop;

  -- Eigene Mitgliedschaften und manuell erfasste Laender entfernen
  delete from public.trip_members where user_id = eigene_id;
  delete from public.visited_countries where user_id = eigene_id;

  -- Teilnehmer-Verknuepfung loesen statt Teilnehmer zu loeschen, damit
  -- Ausgaben/Abrechnungen bei den verbleibenden Mitreisenden erhalten bleiben
  update public.teilnehmer set user_id = null where user_id = eigene_id;

  -- Profil und Auth-User loeschen
  delete from public.profiles where id = eigene_id;
  delete from auth.users where id = eigene_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;


-- ----------------------------------------------------------------------------
-- 8) Rechte (W19): Teilnehmer loeschen und Reise bearbeiten/loeschen nur
--    durch den Ersteller. Ausgaben/Packliste/Orte/Fluege usw. bleiben fuer
--    alle Mitglieder les-/schreibbar (bestehende Policies dort unveraendert).
-- ----------------------------------------------------------------------------
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'trips' and cmd in ('UPDATE', 'DELETE')
  loop
    execute format('drop policy %I on public.trips', pol.policyname);
  end loop;
end $$;

create policy "trips_update_owner_only"
  on public.trips for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "trips_delete_owner_only"
  on public.trips for delete
  to authenticated
  using (user_id = auth.uid());

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'teilnehmer' and cmd = 'DELETE'
  loop
    execute format('drop policy %I on public.teilnehmer', pol.policyname);
  end loop;
end $$;

create policy "teilnehmer_delete_trip_owner_only"
  on public.teilnehmer for delete
  to authenticated
  using (
    exists (select 1 from public.trips t where t.id = teilnehmer.trip_id and t.user_id = auth.uid())
  );

-- Ende der Migration
