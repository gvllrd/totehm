-- TOTEHM · 08/10/2026 — STREETWEAR IMMERSIF : le nom repris, Decode complet
--
-- why  : Wah, 08/10 — « la page streetwear en mode plus immersif… choisir le nom
--        du totehm qui commence avec un 0. avec un système de vérification de
--        disponibilité… c'est ce nom que l'on peut accéder au design généré
--        automatiquement : la page de résultat de recherche doit afficher tous les
--        détails du totehm cloth généré, avec la box (élément du totehm) en
--        position proéminente ». Et il va « faire pas mal d'essais ».
-- how  : 1. Un paiement abandonné laissait un BROUILLON qui gardait le nom :
--           `name_available` répondait « already taken » à son propre auteur
--           pendant deux heures (le ménage `cleanup-drafts`). `_cloth_name_free`
--           dit libre un nom tenu par MON brouillon ; `name_available` la lit.
--        2. `_cloth_draft_put` pose le brouillon de façon atomique (verrou sur le
--           nom) : il REPREND mon brouillon du même nom (même pièce, choix
--           remplacés, ancienne session Stripe rendue pour être fermée) au lieu
--           d'en créer un second. `create-checkout` v39 l'appelle.
--        3. `reveal_cloth` rend tout le Cloth : le vêtement, sa photo, la taille
--           (pas à l'invité), l'étape publique (making · production · shipped),
--           le numéro d'exemplaire (n / édition), `test`, et `art` = l'œuvre est
--           visible (pièce EXPÉDIÉE : la surprise tient jusqu'au déballage). Un
--           nom tapé sans « 0. » se retrouve aussi.
--        4. `_cloth_art_path` (service_role) : le chemin durable de l'œuvre d'une
--           pièce expédiée ; l'Edge Function `cloth-art` le signe pour 1 h.
-- what : additive ; aucune donnée touchée. Retour arrière : réappliquer les
--        définitions précédentes de `name_available` et `reveal_cloth`
--        (20261006120000_luxury_style_name.sql).

create or replace function public._cloth_name_free(p_name text, p_user uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select length(btrim(coalesce(p_name, ''))) >= 2
     and not exists (select 1 from public.totehm_clothes c
                      where lower(c.name) = lower(btrim(p_name))
                        and not (c.status = 'draft' and p_user is not null and c.user_id = p_user))
     and not exists (select 1 from public.luxury_quotes q
                      where q.name is not null and q.status in ('requested', 'quoted', 'paid')
                        and lower(btrim(q.name)) = lower(btrim(p_name)));
$function$;

create or replace function public.name_available(candidate text)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select public._cloth_name_free(candidate, auth.uid());
$function$;

create or replace function public._cloth_draft_put(
  p_user uuid, p_email text, p_name text, p_garment uuid, p_size text, p_style uuid,
  p_price numeric, p_test boolean, p_kind text, p_ref text, p_snap jsonb)
 returns jsonb language plpgsql volatile security definer set search_path to ''
as $function$
declare v_id uuid; v_old text; v_old_test boolean; v_name text := btrim(coalesce(p_name, ''));
        v_pal text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_snap->'palette', '[]'::jsonb))), '{}');
begin
  if p_user is null or length(v_name) < 2 then return jsonb_build_object('ok', false, 'error', 'name'); end if;
  -- Deux onglets, deux clics : un seul brouillon par nom.
  perform pg_advisory_xact_lock(hashtext('totehm-cloth-name:' || lower(v_name)));
  if not public._cloth_name_free(v_name, p_user) then
    return jsonb_build_object('ok', false, 'error', 'name taken');
  end if;
  select c.id, c.stripe_session_id, c.test into v_id, v_old, v_old_test
    from public.totehm_clothes c
   where c.user_id = p_user and c.status = 'draft' and lower(c.name) = lower(v_name)
   limit 1 for update;
  if v_id is null then
    insert into public.totehm_clothes(garment_id, name, size, style_id, price, status, test, user_id, email,
                                      message, box_kind, box_ref, box_snapshot, palette)
    values (p_garment, v_name, p_size, p_style, p_price, 'draft', coalesce(p_test, false), p_user, p_email,
            coalesce(p_snap->>'text', ''), p_kind, p_ref, p_snap, v_pal)
    returning id into v_id;
  else
    -- La même pièce, reprise : le ménage (`cleanup-drafts`, 2 h) repart de maintenant.
    update public.totehm_clothes
       set garment_id = p_garment, name = v_name, size = p_size, style_id = p_style, price = p_price,
           test = coalesce(p_test, false), email = p_email, message = coalesce(p_snap->>'text', ''),
           box_kind = p_kind, box_ref = p_ref, box_snapshot = p_snap, palette = v_pal,
           stripe_session_id = null, created_at = now()
     where id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'old_session', v_old, 'old_test', coalesce(v_old_test, false));
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'name taken');
end $function$;

create or replace function public.reveal_cloth(p_name text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_level text; v_snap jsonb; v_owner_pseudo text; v_shared boolean;
        v_id uuid; v_user uuid; v_cname text; v_kind text; v_msg text; v_at timestamptz;
        v_style uuid; v_style_name text; v_line text := 'streetwear';
        v_garment uuid; v_size text; v_status text; v_test boolean := false; v_paid timestamptz;
        v_art boolean := false; v_title text; v_image text; v_of integer; v_no integer; v_stage text;
        v_q text := lower(btrim(coalesce(p_name, '')));
        v_bare boolean;
begin
  if length(v_q) < 2 then return jsonb_build_object('found', false); end if;
  v_bare := v_q !~ '^\d+\.';
  select tc.id, tc.user_id, tc.name, tc.box_kind, tc.box_snapshot, tc.message, tc.created_at, tc.style_id,
         tc.garment_id, tc.size, tc.status, tc.test, tc.paid_at,
         (tc.status = 'shipped' and tc.artwork_storage_path is not null and not tc.test)
    into v_id, v_user, v_cname, v_kind, v_snap, v_msg, v_at, v_style,
         v_garment, v_size, v_status, v_test, v_paid, v_art
    from public.totehm_clothes tc
   where tc.paid_at is not null
     and (lower(btrim(tc.name)) = v_q
          or (v_bare and lower(regexp_replace(btrim(tc.name), '^\d+\.', '')) = v_q))
   order by (lower(btrim(tc.name)) = v_q) desc, tc.paid_at desc
   limit 1;
  if v_id is not null then
    select s.title, s.image_url, s.max_pieces into v_title, v_image, v_of
      from public.totehm_cloth_support s where s.id = v_garment;
    if not v_test then
      select count(*) into v_no from public.totehm_clothes c
       where c.garment_id = v_garment and c.paid_at is not null and not c.test
         and (c.paid_at < v_paid or (c.paid_at = v_paid and c.id <= v_id));
    end if;
    v_stage := case v_status when 'shipped' then 'shipped' when 'production' then 'production'
                             when 'cancelled' then 'cancelled' else 'making' end;
  else
    select q.id, q.user_id, q.name, q.box_kind, q.box_snapshot, null::text, q.paid_at, q.style_id,
           coalesce(q.test, false), q.paid_at, nullif(btrim(coalesce(q.brand, '') || ' ' || coalesce(q.piece, '')), '')
      into v_id, v_user, v_cname, v_kind, v_snap, v_msg, v_at, v_style, v_test, v_paid, v_title
      from public.luxury_quotes q
     where q.name is not null and q.status = 'paid' and q.paid_at is not null
       and (lower(btrim(q.name)) = v_q
            or (v_bare and lower(regexp_replace(btrim(q.name), '^\d+\.', '')) = v_q))
     order by (lower(btrim(q.name)) = v_q) desc, q.paid_at desc
     limit 1;
    v_line := 'luxury'; v_stage := 'making'; v_art := false;
  end if;
  if v_id is null then return jsonb_build_object('found', false); end if;

  if v_kind is null then
    return jsonb_build_object('found', true, 'name', v_cname, 'legacy', true,
      'level', 'full', 'message', v_msg, 'created_at', v_at::date, 'line', v_line,
      'garment', v_title, 'garment_image', v_image, 'stage', v_stage,
      'edition', v_no, 'edition_of', v_of, 'test', v_test, 'art', v_art);
  end if;

  select s.name into v_style_name from public.artistic_styles s where s.id = v_style;
  v_snap := coalesce(v_snap, '{}'::jsonb);
  if v_me is not null and (v_user = v_me or public.is_subscribed_to(v_user)) then
    v_level := 'full';
  elsif v_me is not null and public._is_figher(v_me) then
    v_level := 'member';
  else
    v_level := 'locked';
  end if;

  select exists (select 1 from public.totehms t where t.user_id = v_user
                  and t.totehm_visibility in ('subscribers','members')) into v_shared;
  if v_shared or v_user = v_me then
    select pseudo into v_owner_pseudo from public.profiles where id = v_user;
  end if;

  return jsonb_build_object(
    'found', true, 'name', v_cname, 'legacy', false, 'level', v_level, 'line', v_line,
    'style', v_style_name, 'view', v_snap->>'view', 'created_at', v_at::date,
    'garment', v_title, 'garment_image', v_image, 'stage', v_stage,
    'edition', v_no, 'edition_of', v_of, 'test', v_test, 'art', v_art,
    'mine', v_me is not null and v_user = v_me,
    'size',    case when v_level = 'locked' then null else v_size end,
    'palette', case when v_level = 'locked' then null else v_snap->'palette' end,
    'text',    case when v_level = 'locked' then null else v_snap->>'text' end,
    'is',      case when v_level = 'locked' then null else v_snap->'is' end,
    'owner',   case when v_level = 'locked' then null else v_owner_pseudo end,
    'matter',  case when v_level = 'full'   then v_snap->'matter' else null end);
end $function$;

create or replace function public._cloth_art_path(p_name text)
 returns text language sql stable security definer set search_path to ''
as $function$
  select tc.artwork_storage_path from public.totehm_clothes tc
   where tc.paid_at is not null and tc.status = 'shipped' and not tc.test
     and tc.artwork_storage_path like tc.id::text || '/%'
     and lower(btrim(tc.name)) = lower(btrim(coalesce(p_name, '')))
   limit 1;
$function$;

-- Les grants APRÈS le dernier `create` (CLAUDE.md).
revoke all on function public._cloth_name_free(text, uuid) from public, anon, authenticated;
grant execute on function public._cloth_name_free(text, uuid) to service_role;
revoke all on function public._cloth_draft_put(uuid, text, text, uuid, text, uuid, numeric, boolean, text, text, jsonb) from public, anon, authenticated;
grant execute on function public._cloth_draft_put(uuid, text, text, uuid, text, uuid, numeric, boolean, text, text, jsonb) to service_role;
revoke all on function public._cloth_art_path(text) from public, anon, authenticated;
grant execute on function public._cloth_art_path(text) to service_role;
revoke all on function public.name_available(text) from public;
grant execute on function public.name_available(text) to anon, authenticated, service_role;
revoke all on function public.reveal_cloth(text) from public;
grant execute on function public.reveal_cloth(text) to anon, authenticated, service_role;
