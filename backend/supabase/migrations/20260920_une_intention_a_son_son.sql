-- TOTEHM · UNE INTENTION A SON SON · 20/09/2026
-- ═══════════════════════════════════════════════════════════════════
-- Wah : « Je veux que l'utilisateur puisse configurer les intentions
-- avec un type de musique par intention, sous la forme d'un texte
-- ouvert et d'un lien URL. »
--
-- ⚠️ LA TABLE EXISTAIT DÉJÀ — `intention_music`, un actif par
-- intention, historique conservé. On n'en crée pas une deuxième : le
-- TYPE de musique va dans `title` (le champ libre), le lien dans `url`.
--
-- ⚠️ `set_music` NE SUFFISAIT PAS : elle EXIGE une URL (`bad_url` si
-- l'entrée ne commence pas par http). Or « hard techno, 140 bpm » est
-- une réponse complète : le type de musique se décrit très bien sans
-- lien, et refuser cette saisie ferait perdre la moitié des réponses.
-- Le lien devient donc facultatif, et c'est le TYPE qui devient
-- obligatoire — l'inverse de l'ancienne fonction.
-- `set_music` reste en place, intacte, pour ce qui l'appelle déjà.
--
-- ⚠️ LE SON APPARTIENT À L'INTENTION, PAS À L'HABITUDE. Deux habitudes
-- en `focus` entendent la même chose : c'est le propre d'une intention,
-- et c'est pourquoi la clé est `(user_id, intention)` et non
-- `(user_id, habit_text)`. L'écran le DIT, sinon on croit régler la
-- musique d'une habitude et on change celle de toutes les autres.
-- ═══════════════════════════════════════════════════════════════════

alter table public.intention_music alter column url drop not null;

create or replace function public.intention_sound_set(
  p_intention text, p_kind text, p_url text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_kind text := nullif(btrim(coalesce(p_kind,'')), '');
  v_url  text := nullif(btrim(coalesce(p_url,'')), '');
  v_plat text;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if btrim(coalesce(p_intention,'')) = '' then raise exception 'no intention'; end if;

  -- Tout vide : on RETIRE le son de cette intention. C'est le seul moyen
  -- de se détacher d'une musique sans toucher à l'intention elle-même.
  if v_kind is null and v_url is null then
    update public.intention_music
       set active = false, retired_at = now()
     where user_id = v_uid and intention = p_intention and active;
    return;
  end if;

  -- ⚠️ UNE URL QUI N'EN EST PAS UNE EST REFUSÉE, PAS RANGÉE QUAND MÊME.
  -- Un lien mort stocké se rappelle à nous le jour où quelqu'un clique.
  if v_url is not null and v_url !~* '^https?://' then
    raise exception 'bad_url';
  end if;

  -- Plateforme dérivée du domaine : déterministe, aucun appel réseau.
  -- (Même table de correspondance que `set_music` — si l'une change,
  --  l'autre doit changer.)
  v_plat := case
    when v_url is null                then null
    when v_url ~* 'spotify\.com'      then 'spotify'
    when v_url ~* 'youtu\.?be'        then 'youtube'
    when v_url ~* 'music\.apple\.com' then 'apple'
    when v_url ~* 'soundcloud\.com'   then 'soundcloud'
    when v_url ~* 'bandcamp\.com'     then 'bandcamp'
    when v_url ~* 'deezer\.com'       then 'deezer'
    else 'link' end;

  -- Un seul actif par intention : l'ancien se retire, il ne s'efface pas.
  update public.intention_music
     set active = false, retired_at = now()
   where user_id = v_uid and intention = p_intention and active;

  insert into public.intention_music(user_id, intention, url, platform, title)
  values (v_uid, p_intention, v_url, v_plat, left(v_kind, 80));
end $function$;

-- Le son actif de chaque intention, en un appel.
create or replace function public.intention_sounds()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_object_agg(intention,
           jsonb_build_object('kind', title, 'url', url, 'platform', platform)), '{}'::jsonb)
    from public.intention_music
   where user_id = auth.uid() and active;
$function$;

-- ⚠️ LES REVOKE SUIVENT LES CREATE : `create or replace function`
-- rétablit le GRANT à PUBLIC.
revoke all on function public.intention_sound_set(text, text, text) from public;
revoke all on function public.intention_sounds() from public;
grant execute on function public.intention_sound_set(text, text, text) to authenticated;
grant execute on function public.intention_sounds() to authenticated;
