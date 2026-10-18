-- ══ LES LECTEURS DE LA CONFIDENTIALITÉ PAR BOX · 18/10/2026 (lot G) ══════════════════════════════
-- ⚠️ POUR CLAUDE CODE (terminal de Wah). Ces trois choses ne passent PAS depuis la session cloud :
-- un `create or replace` sur une fonction QUI EXISTE DÉJÀ y expire à l'approbation, comme un `drop`.
-- La part additive est déjà appliquée (`20261018090000_audience_par_box.sql`, quatre morceaux :
-- `audience_par_box`, `audience_par_box_regle`, `audience_par_box_ecrivain`, `audience_par_box_put`).
--
-- CE QUE CE FICHIER ALLUME : la lecture du Totehm d'un autre BOX PAR BOX, les politiques resserrées,
-- et le niveau qui suit une habitude renommée. **Tant qu'il n'est pas passé**, la page écrit par
-- `box_audience_put` et la lecture d'un tiers reste ce qu'elle était — jamais plus ouverte.
--
-- APRÈS son passage : basculer la page sur `box_audience_set` (le plafond `totehms.audience` se
-- recalcule alors tout seul, et c'est lui que lit l'offre créateur `_offer_open`).
--
-- ⚠️ Mesuré le 18/10 : AUCUN client ne lit `totehms`, `objectives`, `visions` ou `wisdom` d'un AUTRE
-- membre en REST (les seuls accès sont `eq('user_id', me.id)` ou service_role). Les politiques
-- ci-dessous RESSERRENT donc sans rien casser. `steps` est un seul jsonb : il ne peut pas se filtrer
-- ligne à ligne, d'où la fermeture des deux politiques de `totehms` sur l'auteur.

-- ── 5 · `habit_rename_links` : l'audience suit l'habitude renommée ────────────────────────────────
create or replace function public.habit_rename_links(p_old text, p_new text)
returns boolean language plpgsql security definer set search_path to '' as $f$
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
  -- 18/10 : son NIVEAU la suit aussi, sinon une habitude renommée redevient privée en silence.
  delete from public.habit_audience where user_id = v_uid and habit_text = p_new;
  update public.habit_audience   set habit_text = p_new where user_id = v_uid and habit_text = p_old;
  return true;
end $f$;

-- ── 6 · LIRE LE TOTEHM D'UN AUTRE : box par box, jamais « tout ou rien » ──────────────────────────
-- La porte n'est plus le réglage global : c'est « reste-t-il au moins une box que je peux lire ».
create or replace function public.totehm_of(p_pseudo text)
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare
  v_me    uuid := auth.uid();
  v_uid   uuid;
  v_steps jsonb;
  v_vus   jsonb;
  v_n     int;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  select p.id into v_uid from public.profiles p
   where lower(p.pseudo) = lower(btrim(p_pseudo)) limit 1;
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;

  -- Les habitudes lisibles, DANS LEUR ORDRE, filtrées par le niveau de chacune.
  select coalesce(t.steps,'[]'::jsonb) into v_steps
    from public.totehms t where t.user_id = v_uid limit 1;
  v_steps := coalesce(v_steps, '[]'::jsonb);
  select coalesce(jsonb_agg(s order by o), '[]'::jsonb) into v_vus
    from jsonb_array_elements(v_steps) with ordinality as e(s, o)
   where public._box_shared(v_uid, public._box_audience(v_uid, 'h', e.s->>'t'));

  select jsonb_array_length(v_vus)
       + (select count(*) from public.objectives o where o.user_id = v_uid
            and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
            and public._box_shared(v_uid, o.audience))
       + (select count(*) from public.repulsions r where r.user_id = v_uid and r.active
            and public._box_shared(v_uid, r.audience))
       + (select count(*) from public.visions vi where vi.user_id = v_uid
            and public._box_shared(v_uid, vi.audience))
       + (select count(*) from public.wisdom w where w.user_id = v_uid
            and public._box_shared(v_uid, w.audience))
    into v_n;

  if coalesce(v_n,0) = 0 then
    if public._offer_open(v_uid) then
      return jsonb_build_object('ok', false, 'why', 'subscribe',
                                'pseudo', (select pseudo from public.profiles where id = v_uid));
    end if;
    return jsonb_build_object('ok', false, 'why', 'private');
  end if;

  return jsonb_build_object(
    'ok', true,
    'pseudo', (select pseudo from public.profiles where id = v_uid),
    'steps', v_vus,
    'objs', coalesce((
      select jsonb_object_agg(k.h, k.ids) from (
        select u.h as h, jsonb_agg(distinct u.oid) as ids from (
          select oh.habit_text as h, oh.objective_id::text as oid
          from public.objective_habits oh where oh.user_id = v_uid
          union
          select s->>'t', s->>'o'
          from jsonb_array_elements(v_vus) s
          where nullif(s->>'o','') is not null
        ) u where nullif(u.h,'') is not null group by u.h) k), '{}'::jsonb),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'text', o.text, 'target_at', o.target_at,
               'status', o.status, 'created_at', o.created_at, 'is', to_jsonb(o."is"),
               'days_left', case when o.target_at is null then null
                                 else (o.target_at::date - (now() at time zone 'UTC')::date) end,
               'visions', coalesce((select jsonb_agg(ov.vision_id)
                 from public.objective_visions ov
                 where ov.user_id = v_uid and ov.objective_id = o.id), '[]'::jsonb))
             order by o.target_at nulls last, o.created_at)
      from public.objectives o
      where o.user_id = v_uid
        and coalesce(o.status,'active') not in ('achieved','abandoned','converted')
        and public._box_shared(v_uid, o.audience)), '[]'::jsonb),
    'reps', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'text', r.repulsion, 'obstacle', r.obstacle, 'is', to_jsonb(r."is"),
               'hs', coalesce((select jsonb_agg(distinct u.h) from (
                   select r.habit_text as h where nullif(r.habit_text,'') is not null
                   union
                   select rh.habit_text from public.repulsion_habits rh
                   where rh.user_id = v_uid and rh.repulsion_id = r.id) u), '[]'::jsonb),
               'ws', coalesce((select jsonb_agg(rt.wisdom_id)
                 from public.repulsion_teachings rt
                 where rt.user_id = v_uid and rt.repulsion_id = r.id), '[]'::jsonb))
             order by r.created_at)
      from public.repulsions r where r.user_id = v_uid and r.active
        and public._box_shared(v_uid, r.audience)), '[]'::jsonb),
    'visions', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'text', v.text,
               'is', to_jsonb(v."is"), 'rang', v.importance,
               'os', coalesce((select jsonb_agg(ov.objective_id)
                 from public.objective_visions ov
                 where ov.user_id = v_uid and ov.vision_id = v.id), '[]'::jsonb))
             order by v.importance nulls last, v.created_at)
      from public.visions v where v.user_id = v_uid
        and public._box_shared(v_uid, v.audience)), '[]'::jsonb),
    'wisdom', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'text', w.text,
               'is', to_jsonb(w."is"), 'rang', w.importance,
               'os', coalesce((select jsonb_agg(tob.objective_id)
                 from public.teaching_objectives tob
                 where tob.user_id = v_uid and tob.wisdom_id = w.id), '[]'::jsonb))
             order by w.importance nulls last, w.created_at)
      from public.wisdom w where w.user_id = v_uid
        and public._box_shared(v_uid, w.audience)), '[]'::jsonb)
  );
end $f$;

-- ── 7 · LES POLITIQUES RESSERRENT (aucun `drop` : `alter policy` suffit) ──────────────────────────
-- ⚠️ Mesuré le 18/10 : AUCUN client ne lit `totehms`, `objectives`, `visions` ou `wisdom` d'un AUTRE
-- membre en REST (les seuls accès sont `eq('user_id', me.id)` ou service_role). Le seul chemin vers
-- le Totehm d'autrui est `totehm_of`, qui filtre box par box. Les politiques « members read »
-- deviennent donc le FILET de la nouvelle règle, et celles de `totehms` se referment sur l'auteur :
-- `steps` est un seul jsonb, il ne peut pas se filtrer ligne à ligne.
alter policy "objectives members read" on public.objectives using (public._box_shared(user_id, audience));
alter policy "visions members read"    on public.visions    using (public._box_shared(user_id, audience));
alter policy "wisdom members read"     on public.wisdom     using (public._box_shared(user_id, audience));
alter policy "totehms members read"              on public.totehms using (auth.uid() = user_id);
alter policy "subscribers read the creator totehm" on public.totehms using (auth.uid() = user_id);

-- ── 8 · LES DROITS, APRÈS LE DERNIER `create` (un `create or replace` rend le GRANT à PUBLIC) ─────
revoke all on function public._box_shared(uuid, text) from public, anon, authenticated;
revoke all on function public._box_audience(uuid, text, text) from public, anon, authenticated;
revoke all on function public._totehm_audience_recalc(uuid) from public, anon, authenticated;
revoke all on function public.box_audience_set(text, text, text) from public, anon;
revoke all on function public.my_box_audiences() from public, anon;
revoke all on function public.totehm_of(text) from public, anon;
revoke all on function public.habit_rename_links(text, text) from public, anon;
grant execute on function public.box_audience_set(text, text, text) to authenticated;
grant execute on function public.my_box_audiences() to authenticated;
grant execute on function public.totehm_of(text) to authenticated;
grant execute on function public.habit_rename_links(text, text) to authenticated;
