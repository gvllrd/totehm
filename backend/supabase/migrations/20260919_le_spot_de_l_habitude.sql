-- TOTEHM · UNE HABITUDE A UN LIEU · 19/09/2026
-- ════════════════════════════════════════════════════════════════════
-- Wah : « Dans habits, il faut pouvoir attacher un lieu physique à
-- l'habitude, avec la même pureté que les autres champs. »
-- Le lieu est le PREMIER déclencheur d'une habitude : « le parc en bas »
-- dit quand et comment mieux qu'une heure. C'est aussi ce sur quoi le
-- Radar s'appuiera — mais le Radar n'existe pas encore, et cette table
-- est écrite pour tenir sans lui.
--
-- ⚠️ TABLE À PART, PAS UNE COLONNE DANS `totehms`. Les habitudes vivent
-- dans un `jsonb steps` : y glisser un lieu obligerait à réécrire tout
-- le tableau pour changer un mot, et rendrait toute recherche par lieu
-- impossible. Une ligne par (membre, habitude) se lit, s'indexe et se
-- joint.
--
-- ⚠️ LA CLÉ EST LE TEXTE DE L'HABITUDE, comme partout ailleurs dans ce
-- schéma (`repulsion_habits`, `objective_habits`). C'est ce qui oblige
-- `habit_rename_links` à déplacer le spot quand l'habitude est renommée.
--
-- ⚠️ `lat`/`lng` SONT NULLABLES ET RESTENT VIDES AUJOURD'HUI. Le picker
-- ne pose qu'un nom : « la salle du 5e » n'a pas de coordonnées et n'en
-- a pas besoin pour servir de déclencheur. Les deux colonnes attendent
-- le Radar ; les remplir maintenant coûterait un appel de géocodage par
-- habitude — voir la DOCTRINE DE COÛT.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.habit_spots (
  user_id    uuid not null references auth.users(id) on delete cascade,
  habit_text text not null,
  place      text not null,
  lat        double precision,
  lng        double precision,
  updated_at timestamptz not null default now(),
  primary key (user_id, habit_text)
);

alter table public.habit_spots enable row level security;

drop policy if exists "spot mine read"  on public.habit_spots;
drop policy if exists "spot mine write" on public.habit_spots;
create policy "spot mine read"  on public.habit_spots
  for select using (user_id = auth.uid());
create policy "spot mine write" on public.habit_spots
  for all    using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Poser, changer, ou détacher.
create or replace function public.habit_spot_set(p_habit text, p_place text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if btrim(coalesce(p_habit,'')) = '' then raise exception 'no habit'; end if;
  -- Un lieu vide EFFACE le spot : c'est le seul moyen de se detacher
  -- d'un endroit sans supprimer l'habitude.
  if btrim(coalesce(p_place,'')) = '' then
    delete from public.habit_spots where user_id = v_uid and habit_text = p_habit;
    return;
  end if;
  insert into public.habit_spots(user_id, habit_text, place, updated_at)
  values (v_uid, p_habit, left(btrim(p_place),120), now())
  on conflict (user_id, habit_text) do update
    set place = excluded.place, updated_at = now();
end $function$;

-- ── Renommer une habitude déplace TOUT ce qui pend après elle.
-- ⚠️ `returns boolean` EST IMPOSÉ : `create or replace function` ne peut
-- PAS changer un type de retour. Pour le passer à `void` il faudrait un
-- `drop` d'abord — donc une fenêtre où le front appelle une fonction
-- absente. Le booléen reste.
create or replace function public.habit_rename_links(p_old text, p_new text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_old is null or p_new is null or p_old = p_new then return false; end if;
  update public.repulsions       set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  update public.repulsion_habits set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  update public.objective_habits set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  -- le spot suit son habitude ; on libere d'abord la place, sinon la
  -- cle primaire (user_id, habit_text) refuse le deplacement.
  delete from public.habit_spots where user_id = v_uid and habit_text = p_new;
  update public.habit_spots      set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  return true;
end $function$;

-- ⚠️ LES REVOKE SUIVENT LES CREATE. Voir `20260919_le_passeport.sql`.
revoke all on function public.habit_spot_set(text, text) from public;
revoke all on function public.habit_rename_links(text, text) from public;
grant execute on function public.habit_spot_set(text, text) to authenticated, service_role;
grant execute on function public.habit_rename_links(text, text) to authenticated, service_role;
