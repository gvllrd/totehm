-- ═══════════════════════════════════════════════════════════════════════
-- TOTEHM · 16/09/2026 · LE TOTEHM ENTIER EN UN APPEL
--
-- POURQUOI CETTE MIGRATION EXISTE
-- Le front appelait quatre fonctions qui N'EXISTAIENT PLUS : `trip_create`,
-- `trip_rename`, `trip_set_target`, `trip_close`. Elles ont été renommées
-- `objective_*` et personne n'a repointé la page. Résultat mesuré :
--   · créer un objectif ne créait rien ;
--   · le supprimer ne supprimait rien — il revenait au rechargement ;
--   · la date et le renommage ne partaient jamais.
-- C'était ça, « les suppressions ne fonctionnent pas ». Ce n'était pas une
-- course : c'était un appel dans le vide, silencieux, depuis des jours.
-- On ne recrée PAS les vieux noms : le front est repointé dans le même lot.
--
-- CE QUE CETTE MIGRATION AJOUTE
--   1. `is text[]` sur les quatre objets serveur — les 7 intentions se
--      rattachent aux CINQ objets, pas seulement aux habitudes.
--   2. les verbes manquants pour VISION et TEACHING, calqués sur ceux de
--      l'objectif : même forme, même sécurité, aucune invention.
--   3. les trois liens croisés (objectif↔vision, répulsion↔teaching,
--      teaching↔objectif) : les tables existaient, les verbes non.
--   4. `my_trips()` rend maintenant l'arbre ENTIER — cinq objets, tous les
--      liens — en un appel. Mêmes clés qu'avant, plus de nouvelles : rien
--      de ce qui lisait l'ancienne forme ne casse.
--
-- ⚠️ `create or replace function` RÉTABLIT LE GRANT À PUBLIC. Tout `revoke`
--    suit le DERNIER `create`, jamais l'inverse. Les revoke sont groupés à
--    la fin du fichier pour cette raison.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · LES INTENTIONS SUR LES CINQ OBJETS ────────────────────────────
-- `i` reste la PREMIÈRE intention — c'est elle que le bot et la carte
-- lisent déjà. `is` porte la liste. Deux colonnes, une vérité : `i` est
-- toujours `is[1]`, posé par les fonctions ci-dessous et jamais à la main.
alter table public.objectives add column if not exists "is" text[] not null default '{}';
alter table public.repulsions add column if not exists "is" text[] not null default '{}';
alter table public.visions    add column if not exists "is" text[] not null default '{}';
alter table public.wisdom     add column if not exists "is" text[] not null default '{}';

-- La taxonomie est FERMÉE. Sept intentions, pas huit : une huitième
-- inventée côté client passerait sans bruit et personne ne la verrait
-- avant qu'un filtre revienne vide.
do $$
declare t text;
begin
  foreach t in array array['objectives','repulsions','visions','wisdom'] loop
    execute format(
      'alter table public.%I drop constraint if exists %I', t, t||'_is_sept');
    execute format(
      'alter table public.%I add constraint %I check ("is" <@ array[
         ''fight'',''flow'',''enrich'',''love'',''express'',''focus'',''celebrate'']::text[])',
      t, t||'_is_sept');
  end loop;
end $$;

-- Reprise de l'existant : ce qui avait une intention simple garde la
-- sienne dans la liste. Sans ça, ouvrir une boîte la montrerait vide.
update public.objectives set "is" = array[i] where nullif(i,'') is not null and "is" = '{}';
update public.repulsions set "is" = array[i] where nullif(i,'') is not null and "is" = '{}';
update public.visions    set "is" = array[i] where nullif(i,'') is not null and "is" = '{}';
update public.wisdom     set "is" = array[i] where nullif(i,'') is not null and "is" = '{}';

-- ── 2 · POSER LES INTENTIONS · UN SEUL VERBE POUR QUATRE TABLES ───────
-- ⚠️ LE NOM DE TABLE NE VIENT JAMAIS DU CLIENT TEL QUEL. Il est traduit
--    par un `case` fermé : un `format(%I)` sur une chaîne reçue laisserait
--    écrire dans n'importe quelle table de la base.
create or replace function public.intentions_set(p_kind text, p_id text, p_is text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_tab text;
  v_liste text[] := coalesce(p_is, '{}');
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not (v_liste <@ array['fight','flow','enrich','love','express','focus','celebrate']::text[])
    then raise exception 'intention inconnue'; end if;

  v_tab := case p_kind
    when 't' then 'objectives' when 'r' then 'repulsions'
    when 'v' then 'visions'    when 'w' then 'wisdom'
    else null end;
  if v_tab is null then raise exception 'objet inconnu'; end if;

  if v_tab = 'repulsions' then
    execute 'update public.repulsions set "is" = $1, i = $2 where id = $3::bigint and user_id = $4'
      using v_liste, nullif(v_liste[1],''), p_id, v_uid;
  else
    execute format(
      'update public.%I set "is" = $1, i = $2 where id = $3::uuid and user_id = $4', v_tab)
      using v_liste, nullif(v_liste[1],''), p_id, v_uid;
  end if;
end $$;

-- ── 3 · VISION ET TEACHING · LES VERBES QUI MANQUAIENT ────────────────
-- Calqués sur `objective_create` / `objective_rename` : une vision et une
-- leçon sont des OBJETS comme les autres. Rien de neuf à apprendre.
create or replace function public.vision_create(p_text text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  insert into public.visions(user_id, text) values (v_uid, left(coalesce(p_text,''),300))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.vision_rename(p_id uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.visions set text = left(coalesce(p_text,''),300)
   where id = p_id and user_id = auth.uid();
end $$;

create or replace function public.vision_delete(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.visions where id = p_id and user_id = auth.uid();
end $$;

create or replace function public.teaching_create(p_text text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  insert into public.wisdom(user_id, text) values (v_uid, left(coalesce(p_text,''),300))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.teaching_rename(p_id uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.wisdom set text = left(coalesce(p_text,''),300)
   where id = p_id and user_id = auth.uid();
end $$;

create or replace function public.teaching_delete(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.wisdom where id = p_id and user_id = auth.uid();
end $$;

-- ── 4 · LES TROIS LIENS CROISÉS ───────────────────────────────────────
-- Les tables existaient depuis le 15 ; personne ne pouvait les remplir.
-- `on conflict do nothing` : reposer un lien déjà posé n'est pas une
-- erreur, c'est un double-clic.
create or replace function public.objective_vision_link(p_obj uuid, p_vision uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.objectives where id = p_obj and user_id = v_uid)
     or not exists (select 1 from public.visions where id = p_vision and user_id = v_uid)
    then raise exception 'not yours'; end if;
  insert into public.objective_visions(user_id, objective_id, vision_id)
  values (v_uid, p_obj, p_vision) on conflict do nothing;
end $$;

create or replace function public.objective_vision_unlink(p_obj uuid, p_vision uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.objective_visions
   where user_id = auth.uid() and objective_id = p_obj and vision_id = p_vision;
end $$;

create or replace function public.repulsion_teaching_link(p_rep bigint, p_teaching uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.repulsions where id = p_rep and user_id = v_uid)
     or not exists (select 1 from public.wisdom where id = p_teaching and user_id = v_uid)
    then raise exception 'not yours'; end if;
  insert into public.repulsion_teachings(user_id, repulsion_id, wisdom_id)
  values (v_uid, p_rep, p_teaching) on conflict do nothing;
end $$;

create or replace function public.repulsion_teaching_unlink(p_rep bigint, p_teaching uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.repulsion_teachings
   where user_id = auth.uid() and repulsion_id = p_rep and wisdom_id = p_teaching;
end $$;

create or replace function public.teaching_objective_link(p_teaching uuid, p_obj uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.wisdom where id = p_teaching and user_id = v_uid)
     or not exists (select 1 from public.objectives where id = p_obj and user_id = v_uid)
    then raise exception 'not yours'; end if;
  insert into public.teaching_objectives(user_id, wisdom_id, objective_id)
  values (v_uid, p_teaching, p_obj) on conflict do nothing;
end $$;

create or replace function public.teaching_objective_unlink(p_teaching uuid, p_obj uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.teaching_objectives
   where user_id = auth.uid() and wisdom_id = p_teaching and objective_id = p_obj;
end $$;

-- ── 5 · L'ARBRE ENTIER EN UN APPEL ────────────────────────────────────
-- `my_trips()` garde son nom et ses clés (`trips`, `loose`, `done`) : rien
-- de ce qui la lisait ne casse. Elle rend EN PLUS `reps`, `visions` et
-- `wisdom`, chacun avec ses liens.
--
-- ⚠️ UNE RÉPULSION EST RENDUE À PLAT, AVEC TOUTES SES HABITUDES. Avant,
--    elle n'arrivait que NICHÉE sous l'habitude de sa colonne `habit_text`
--    — donc un lien posé par `repulsion_link` dans `repulsion_habits`
--    était écrit en base et INVISIBLE à l'écran. Ici les deux sources sont
--    réunies : la colonne historique ET la table de liens.
--
-- ⚠️ MÊME OUBLI CÔTÉ OBJECTIFS. Le front lisait `h.objectives` sur chaque
--    habitude ; la fonction ne l'a JAMAIS rendue. `OBJ` restait vide et une
--    habitude ne montrait que l'objectif porté par `steps.o` — un seul,
--    alors que `objective_habits` en portait plusieurs. La clé `objs`
--    répare ça : texte d'habitude → liste d'identifiants.
create or replace function public.my_trips()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_steps jsonb;
  v_res   jsonb;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;

  select coalesce(steps, '[]'::jsonb) into v_steps
  from public.totehms where user_id = v_uid limit 1;
  v_steps := coalesce(v_steps, '[]'::jsonb);

  select jsonb_build_object(
    'signed_in', true,

    'trips', coalesce((
      select jsonb_agg(x order by x->>'target_at' nulls last, x->>'created_at')
      from (
        select jsonb_build_object(
          'id', o.id, 'text', o.text, 'target_at', o.target_at,
          'status', o.status, 'created_at', o.created_at,
          'is', to_jsonb(o."is"),
          'days_left', case when o.target_at is null then null
                            else (o.target_at::date - (now() at time zone 'UTC')::date) end,
          -- les visions que cet objectif sert
          'visions', coalesce((
            select jsonb_agg(ov.vision_id)
            from public.objective_visions ov
            where ov.user_id = v_uid and ov.objective_id = o.id), '[]'::jsonb),
          'habits', coalesce((
            select jsonb_agg(jsonb_build_object(
                     't', s->>'t', 'f', s->>'f',
                     'i', coalesce(nullif(s->>'i',''), public.intention_of(s->>'t')),
                     'ready', (nullif(s->>'f','') is not null),
                     'stats', public.habit_stats(v_uid, s->>'t')))
            from jsonb_array_elements(v_steps) s
            where nullif(s->>'o','') = o.id::text), '[]'::jsonb)
        ) as x
        from public.objectives o
        where o.user_id = v_uid
          and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
      ) q), '[]'::jsonb),

    'objs', coalesce((
      select jsonb_object_agg(k.h, k.ids) from (
        select u.h as h, jsonb_agg(distinct u.oid) as ids from (
          select oh.habit_text as h, oh.objective_id::text as oid
          from public.objective_habits oh where oh.user_id = v_uid
          union
          select s->>'t', s->>'o'
          from jsonb_array_elements(v_steps) s
          where nullif(s->>'o','') is not null
        ) u
        where nullif(u.h,'') is not null
        group by u.h) k), '{}'::jsonb),

    'loose', coalesce((
      select jsonb_agg(jsonb_build_object(
               't', s->>'t', 'f', s->>'f',
               'i', coalesce(nullif(s->>'i',''), public.intention_of(s->>'t')),
               'ready', (nullif(s->>'f','') is not null),
               'stats', public.habit_stats(v_uid, s->>'t')))
      from jsonb_array_elements(v_steps) s
      where nullif(s->>'o','') is null), '[]'::jsonb),

    'done', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text,
               'status', o.status, 'outcome', o.outcome, 'at', o.outcome_at))
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') in ('achieved','abandoned','converted')), '[]'::jsonb),

    -- ══ LES RÉPULSIONS, À PLAT ══════════════════════════════════════
    'reps', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'text', r.repulsion, 'obstacle', r.obstacle,
               'is', to_jsonb(r."is"),
               -- l'union des deux sources, sans doublon
               'hs', coalesce((
                 select jsonb_agg(distinct u.h) from (
                   select r.habit_text as h where nullif(r.habit_text,'') is not null
                   union
                   select rh.habit_text from public.repulsion_habits rh
                   where rh.user_id = v_uid and rh.repulsion_id = r.id) u), '[]'::jsonb),
               'ws', coalesce((
                 select jsonb_agg(rt.wisdom_id) from public.repulsion_teachings rt
                 where rt.user_id = v_uid and rt.repulsion_id = r.id), '[]'::jsonb))
             order by r.created_at)
      from public.repulsions r
      where r.user_id = v_uid and r.active), '[]'::jsonb),

    'visions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'text', v.text, 'is', to_jsonb(v."is"),
               'rang', v.importance,
               'os', coalesce((
                 select jsonb_agg(ov.objective_id) from public.objective_visions ov
                 where ov.user_id = v_uid and ov.vision_id = v.id), '[]'::jsonb))
             order by v.importance nulls last, v.created_at)
      from public.visions v where v.user_id = v_uid), '[]'::jsonb),

    'wisdom', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', w.id, 'text', w.text, 'is', to_jsonb(w."is"),
               'rang', w.importance,
               'os', coalesce((
                 select jsonb_agg(tob.objective_id) from public.teaching_objectives tob
                 where tob.user_id = v_uid and tob.wisdom_id = w.id), '[]'::jsonb))
             order by w.importance nulls last, w.created_at)
      from public.wisdom w where w.user_id = v_uid), '[]'::jsonb)

  ) into v_res;
  return v_res;
end $$;

-- ── 6 · LES DROITS · TOUJOURS APRÈS LE DERNIER `create` ───────────────
-- ⚠️ `create or replace function` RÉTABLIT LE GRANT À PUBLIC. Ces lignes
--    sont les dernières du fichier pour cette seule raison. Les déplacer
--    plus haut rouvrirait chaque fonction à `anon` sans que rien ne le
--    signale.
do $$
declare f text;
begin
  foreach f in array array[
    'public.intentions_set(text,text,text[])',
    'public.vision_create(text)', 'public.vision_rename(uuid,text)', 'public.vision_delete(uuid)',
    'public.teaching_create(text)', 'public.teaching_rename(uuid,text)', 'public.teaching_delete(uuid)',
    'public.objective_vision_link(uuid,uuid)', 'public.objective_vision_unlink(uuid,uuid)',
    'public.repulsion_teaching_link(bigint,uuid)', 'public.repulsion_teaching_unlink(bigint,uuid)',
    'public.teaching_objective_link(uuid,uuid)', 'public.teaching_objective_unlink(uuid,uuid)',
    'public.my_trips()'
  ] loop
    execute 'revoke all on function ' || f || ' from public, anon';
    execute 'grant execute on function ' || f || ' to authenticated';
  end loop;
end $$;

-- ── 7 · CRÉER ET RENOMMER UNE RÉPULSION ───────────────────────────────
-- ⚠️ POURQUOI `repulsion_set` NE POUVAIT PAS SERVIR À CRÉER.
--    Elle refuse un texte vide — or on crée la boîte AVANT d'écrire
--    dedans, comme pour les quatre autres objets. Mesuré : le brouillon
--    partait avec `text:''`, `repulsion_set` levait, la console affichait
--    l'erreur et la répulsion n'existait jamais. C'était ça, « on ne peut
--    pas ajouter correctement des répulsions ».
--    Elle RETIRE aussi l'ancienne répulsion du même obstacle — utile pour
--    le bot, fatal pour une création : la deuxième répulsion vide
--    désactiverait la première. D'où un verbe dédié, qui ne fait
--    qu'insérer. `repulsion_set` garde sa sémantique pour le bot.
create or replace function public.repulsion_create(p_text text default '')
returns bigint language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id bigint;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  insert into public.repulsions(user_id, habit_text, obstacle, repulsion, origin)
  values (v_uid, '', '—', left(coalesce(p_text,''),300), 'user')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.repulsion_rename(p_id bigint, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.repulsions set repulsion = left(coalesce(p_text,''),300)
   where id = p_id and user_id = auth.uid();
end $$;

revoke all on function public.repulsion_create(text) from public, anon;
grant execute on function public.repulsion_create(text) to authenticated;
revoke all on function public.repulsion_rename(bigint,text) from public, anon;
grant execute on function public.repulsion_rename(bigint,text) to authenticated;
