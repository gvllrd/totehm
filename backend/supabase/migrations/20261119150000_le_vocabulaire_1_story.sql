-- ══ LE VOCABULAIRE · 1 — MY STORY ════════════════════════════════════════════════════════
-- Wah, 19/11 : « Il faut simplement que les mots que j'utilise (le frontend actuel) reflètent le backend…
-- le code et le backend. » La 5e box portait TROIS noms en base — `wisdom` (la table), `teaching_*` (les
-- fonctions), `story` (le journal) — et un quatrième sur les boutons (« teaching »). Elle s'appelle STORY.
--
--   · tables : `wisdom` → `stories` ; `repulsion_teachings` → `repulsion_stories` ; `teaching_objectives`
--     → `story_objectives` ; la colonne `wisdom_id` → `story_id`. Contraintes, index et politiques suivent —
--     sauf les clés vers auth.users, qu'on ne touche JAMAIS (backend/CLAUDE.md) ;
--   · fonctions : `story_create` · `story_rename` · `story_delete` · `repulsion_story_link` /
--     `repulsion_story_unlink` (p_rep, p_story) · `story_objective_link` / `story_objective_unlink`
--     (p_story, p_obj) · `add_story_admin` ; toutes les fonctions lisent désormais les nouveaux noms ;
--   · le type de box `story` est accepté partout où `wisdom` l'était (classements, boutique, médias) ;
--     `my_trips`, `totehm_read`, `totehm_of` rendent la clé `stories` ; les classements se rangent sous `story`.
--
-- PONTS — le temps que chaque lecteur passe aux nouveaux noms (connecteur ChatGPT, TotehmBot, boutique) :
-- les vues `wisdom`, `repulsion_teachings`, `teaching_objectives` (mêmes colonnes qu'avant), les anciennes
-- fonctions `teaching_*`, `repulsion_teaching_*`, `add_wisdom_admin` (elles appellent les nouvelles), la clé
-- `wisdom` à côté de `stories`. On les retire quand plus rien ne les lit.

-- ── 1 · Les tables, à leur nom ──────────────────────────────────────────────────────────
alter table public.wisdom rename to stories;
alter table public.stories rename constraint wisdom_pkey to stories_pkey;
alter table public.stories rename constraint wisdom_audience_check3 to stories_audience_check;
alter table public.stories rename constraint wisdom_i_chk to stories_i_chk;
alter table public.stories rename constraint wisdom_importance_check to stories_importance_check;
alter table public.stories rename constraint wisdom_is_sept to stories_is_sept;
alter table public.stories rename constraint wisdom_text_check to stories_text_check;
alter index public.wisdom_user_created_idx rename to stories_user_created_idx;
alter policy "wisdom members read" on public.stories rename to "stories members read";
alter policy wisdom_delete_own on public.stories rename to stories_delete_own;
alter policy wisdom_insert_own on public.stories rename to stories_insert_own;
alter policy wisdom_select_own on public.stories rename to stories_select_own;
alter policy wisdom_update_own on public.stories rename to stories_update_own;
comment on table public.stories is
  '[COM+BOUTIQUE] une box MY STORY : une erreur du passé à ne plus reproduire, reliée aux répulsions (Learned from).';

alter table public.repulsion_teachings rename to repulsion_stories;
alter table public.repulsion_stories rename column wisdom_id to story_id;
alter table public.repulsion_stories rename constraint repulsion_teachings_pkey to repulsion_stories_pkey;
alter table public.repulsion_stories rename constraint repulsion_teachings_repulsion_id_fkey to repulsion_stories_repulsion_id_fkey;
alter table public.repulsion_stories rename constraint repulsion_teachings_wisdom_id_fkey to repulsion_stories_story_id_fkey;
alter index public.rt_user_idx rename to repulsion_stories_user_idx;
alter policy "own repulsion_teachings" on public.repulsion_stories rename to "own repulsion_stories";
comment on table public.repulsion_stories is '[COM] lien répulsion ↔ MY STORY (Learned from).';

alter table public.teaching_objectives rename to story_objectives;
alter table public.story_objectives rename column wisdom_id to story_id;
alter table public.story_objectives rename constraint teaching_objectives_pkey to story_objectives_pkey;
alter table public.story_objectives rename constraint teaching_objectives_objective_id_fkey to story_objectives_objective_id_fkey;
alter table public.story_objectives rename constraint teaching_objectives_wisdom_id_fkey to story_objectives_story_id_fkey;
alter index public.to_user_idx rename to story_objectives_user_idx;
alter policy "own teaching_objectives" on public.story_objectives rename to "own story_objectives";
comment on table public.story_objectives is '[COM] lien MY STORY ↔ objectif.';

-- ── 2 · Les classements : la vue MY STORY se range sous `story` ─────────────────────────
alter table public.element_orders drop constraint element_orders_kind_check;
update public.element_orders set kind = 'story' where kind = 'wisdom';
alter table public.element_orders add constraint element_orders_kind_check
  check (kind = any (array['habit', 'objective', 'repulsion', 'vision', 'story']));

-- ── 3 · Les fonctions de la box STORY, à leur nom ───────────────────────────────────────
create or replace function public.story_create(p_text text default '')
 returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  insert into public.stories(user_id, text) values (v_uid, left(coalesce(p_text, ''), 300))
  returning id into v_id;
  return v_id;
end $function$;

create or replace function public.story_rename(p_id uuid, p_text text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.stories set text = left(coalesce(p_text, ''), 300)
   where id = p_id and user_id = auth.uid();
end $function$;

create or replace function public.story_delete(p_id uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.stories where id = p_id and user_id = auth.uid();
end $function$;

create or replace function public.repulsion_story_link(p_rep bigint, p_story uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.repulsions where id = p_rep and user_id = v_uid)
     or not exists (select 1 from public.stories where id = p_story and user_id = v_uid)
    then raise exception 'not yours'; end if;
  insert into public.repulsion_stories(user_id, repulsion_id, story_id)
  values (v_uid, p_rep, p_story) on conflict do nothing;
end $function$;

create or replace function public.repulsion_story_unlink(p_rep bigint, p_story uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.repulsion_stories
   where user_id = auth.uid() and repulsion_id = p_rep and story_id = p_story;
end $function$;

create or replace function public.story_objective_link(p_story uuid, p_obj uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.stories where id = p_story and user_id = v_uid)
     or not exists (select 1 from public.objectives where id = p_obj and user_id = v_uid)
    then raise exception 'not yours'; end if;
  insert into public.story_objectives(user_id, story_id, objective_id)
  values (v_uid, p_story, p_obj) on conflict do nothing;
end $function$;

create or replace function public.story_objective_unlink(p_story uuid, p_obj uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.story_objectives
   where user_id = auth.uid() and story_id = p_story and objective_id = p_obj;
end $function$;

-- TotehmBot (`/wisdom`, bientôt `/story`) : la leçon tient dans la limite de la table (400).
create or replace function public.add_story_admin(p_user uuid, p_text text, p_intention text default null)
 returns uuid language sql security definer set search_path to 'public' as $function$
  insert into public.stories(user_id, text, i)
  values (p_user, left(btrim(p_text), 400), nullif(btrim(coalesce(p_intention, '')), ''))
  returning id;
$function$;

-- ── 4 · PONTS : les anciens noms appellent les nouveaux ─────────────────────────────────
create or replace function public.teaching_create(p_text text default '')
 returns uuid language sql security definer set search_path to 'public' as $function$
  select public.story_create(p_text);
$function$;
create or replace function public.teaching_rename(p_id uuid, p_text text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin perform public.story_rename(p_id, p_text); end $function$;
create or replace function public.teaching_delete(p_id uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin perform public.story_delete(p_id); end $function$;
create or replace function public.repulsion_teaching_link(p_rep bigint, p_teaching uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin perform public.repulsion_story_link(p_rep, p_teaching); end $function$;
create or replace function public.repulsion_teaching_unlink(p_rep bigint, p_teaching uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin perform public.repulsion_story_unlink(p_rep, p_teaching); end $function$;
create or replace function public.teaching_objective_link(p_teaching uuid, p_obj uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin perform public.story_objective_link(p_teaching, p_obj); end $function$;
create or replace function public.teaching_objective_unlink(p_teaching uuid, p_obj uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin perform public.story_objective_unlink(p_teaching, p_obj); end $function$;
create or replace function public.add_wisdom_admin(p_user uuid, p_text text, p_intention text default null)
 returns uuid language sql security definer set search_path to 'public' as $function$
  select public.add_story_admin(p_user, p_text, p_intention);
$function$;

create view public.wisdom with (security_invoker = true) as
  select s.id, s.user_id, s.text, s.i, s.created_at, s.importance, s."is", s.audience from public.stories s;
alter view public.wisdom alter column id set default gen_random_uuid();
alter view public.wisdom alter column created_at set default now();
alter view public.wisdom alter column "is" set default '{}'::text[];
alter view public.wisdom alter column audience set default 'private';
comment on view public.wisdom is '[COM] PONT : l''ancien nom de `stories` (connecteur ChatGPT, TotehmBot). À retirer.';

create view public.repulsion_teachings with (security_invoker = true) as
  select rs.user_id, rs.repulsion_id, rs.story_id as wisdom_id, rs.created_at from public.repulsion_stories rs;
alter view public.repulsion_teachings alter column created_at set default now();
comment on view public.repulsion_teachings is '[COM] PONT : l''ancien nom de `repulsion_stories`. À retirer.';

create view public.teaching_objectives with (security_invoker = true) as
  select so.user_id, so.story_id as wisdom_id, so.objective_id, so.created_at from public.story_objectives so;
alter view public.teaching_objectives alter column created_at set default now();
comment on view public.teaching_objectives is '[COM] PONT : l''ancien nom de `story_objectives`. À retirer.';

-- ── 5 · Les corps des fonctions parlent STORY ───────────────────────────────────────────
-- (a) le STOCKAGE, partout : aucun nom de table n'est cité comme texte (vérifié), donc on renomme
--     ce qu'elles lisent sans changer ce qu'elles rendent ;
-- (b) les VALEURS : `story` accepté là où `wisdom` l'était, la clé `stories` à côté de `wisdom`.
--     Chaque correction (b) doit trouver son texte une fois, sinon tout s'annule.
do $mig$
declare f record; r record; d text; d0 text; n int;
begin
  for f in select p.oid from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
              and p.prosrc ~* '\mpublic\.wisdom\M|\mrepulsion_teachings\M|\mteaching_objectives\M|\mwisdom_id\M|(from|join|into|update)\s+wisdom\M'
              and p.proname not in ('teaching_create', 'teaching_rename', 'teaching_delete', 'repulsion_teaching_link',
                                    'repulsion_teaching_unlink', 'teaching_objective_link', 'teaching_objective_unlink',
                                    'add_wisdom_admin')
  loop
    d0 := pg_get_functiondef(f.oid);
    d := regexp_replace(d0, '\mpublic\.wisdom\M', 'public.stories', 'g');
    d := regexp_replace(d, '(from|join|into|update)(\s+)wisdom\M', '\1\2stories', 'gi');
    d := regexp_replace(d, '\mrepulsion_teachings\M', 'repulsion_stories', 'g');
    d := regexp_replace(d, '\mteaching_objectives\M', 'story_objectives', 'g');
    d := regexp_replace(d, '\mwisdom_id\M', 'story_id', 'g');
    if d <> d0 then execute d; end if;
  end loop;

  for r in select * from (values
    ('public.element_order_set(text, text[])',
     $o$  if p_kind is null or p_kind not in ('habit','objective','repulsion','vision','wisdom')$o$,
     $n$  if p_kind = 'wisdom' then p_kind := 'story'; end if;   -- pont : l'ancien nom de la box STORY
  if p_kind is null or p_kind not in ('habit','objective','repulsion','vision','story')$n$),
    ('public.element_orders_for(text)',
     $o$when 'vision' then 'visions' else 'wisdom' end$o$,
     $n$when 'vision' then 'visions' else 'stories' end$n$),
    ('public.element_orders_for(text)',
     $o$return jsonb_build_object('ok',true,'orders',v_orders);$o$,
     $n$return jsonb_build_object('ok',true,'orders',v_orders
    || case when v_orders ? 'story' then jsonb_build_object('wisdom', v_orders->'story') else '{}'::jsonb end);   -- pont$n$),
    ('public.intentions_set(text, text, text[])',
     $o$when 'w' then 'wisdom'$o$,
     $n$when 'w' then 'stories'$n$),
    ('public._box_matter(uuid, text, text)',
     $o$elsif p_kind = 'wisdom' then$o$,
     $n$elsif p_kind in ('wisdom', 'story') then$n$),
    ('public._box_shots(uuid, text, text)',
     $o$when 'wisdom' then 'w'$o$,
     $n$when 'wisdom' then 'w' when 'story' then 'w'$n$),
    ('public._box_shots(uuid, text, text)',
     $o$elsif p_kind = 'wisdom' then$o$,
     $n$elsif p_kind in ('wisdom', 'story') then$n$),
    ('public.element_cloths(text)',
     $o$tc.box_kind in ('wisdom', 'vision')$o$,
     $n$tc.box_kind in ('wisdom', 'story', 'vision')$n$),
    ('public.element_cloths(text)',
     $o$q.box_kind in ('wisdom', 'vision')$o$,
     $n$q.box_kind in ('wisdom', 'story', 'vision')$n$),
    ('public.my_trips()',
     $o$  ) into v_res;
  return v_res;
end$o$,
     $n$  ) into v_res;
  return v_res || jsonb_build_object('stories', v_res->'wisdom');
end$n$),
    ('public.totehm_read(text)',
     $o$  v_n     int;
begin$o$,
     $n$  v_n     int;
  v_out   jsonb;
begin$n$),
    ('public.totehm_read(text)',
     $o$return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo$o$,
     $n$v_out := jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo$n$),
    ('public.totehm_read(text)',
     $o$public._box_shared(v_uid, w.audience)), '[]'::jsonb)
  );
end$o$,
     $n$public._box_shared(v_uid, w.audience)), '[]'::jsonb)
  );
  return v_out || jsonb_build_object('stories', v_out->'wisdom');
end$n$),
    ('public.totehm_of(text)',
     $o$  v_n     int;
begin$o$,
     $n$  v_n     int;
  v_out   jsonb;
begin$n$),
    ('public.totehm_of(text)',
     $o$return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo$o$,
     $n$v_out := jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo$n$),
    ('public.totehm_of(text)',
     $o$public._box_shared(v_uid, w.audience)), '[]'::jsonb)
  );
end$o$,
     $n$public._box_shared(v_uid, w.audience)), '[]'::jsonb)
  );
  return v_out || jsonb_build_object('stories', v_out->'wisdom');
end$n$)
  ) t(fn, old, new) loop
    d := pg_get_functiondef(r.fn::regprocedure);
    n := (length(d) - length(replace(d, r.old, ''))) / length(r.old);
    if n <> 1 then raise exception 'vocabulaire % : % occurrence(s) du texte visé', r.fn, n; end if;
    execute replace(d, r.old, r.new);
  end loop;
end $mig$;

-- ── 6 · Les droits, après le dernier `create` ───────────────────────────────────────────
grant select, insert, update, delete on public.wisdom, public.repulsion_teachings, public.teaching_objectives
  to authenticated, service_role;
grant select on public.wisdom, public.repulsion_teachings, public.teaching_objectives to anon;
revoke all on function public.story_create(text), public.story_rename(uuid, text), public.story_delete(uuid),
  public.repulsion_story_link(bigint, uuid), public.repulsion_story_unlink(bigint, uuid),
  public.story_objective_link(uuid, uuid), public.story_objective_unlink(uuid, uuid) from public, anon;
grant execute on function public.story_create(text), public.story_rename(uuid, text), public.story_delete(uuid),
  public.repulsion_story_link(bigint, uuid), public.repulsion_story_unlink(bigint, uuid),
  public.story_objective_link(uuid, uuid), public.story_objective_unlink(uuid, uuid) to authenticated, service_role;
revoke all on function public.add_story_admin(uuid, text, text) from public, anon, authenticated;
grant execute on function public.add_story_admin(uuid, text, text) to service_role;
