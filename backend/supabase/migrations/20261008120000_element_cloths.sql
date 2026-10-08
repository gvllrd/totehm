-- TOTEHM · 08/10/2026 (ter) — COM ↔ BOUTIQUE : LES CLOTHS DANS WISDOM ET VISION
--
-- why  : Wah, 08/10 — « ce qui est cool c'est qu'on ait lié SPACE à COM ; on
--        devrait faire la même chose avec higher.boutique : la fonction
--        totehmiser devrait aller se caler dans les deux vues ». Comme
--        `habit_spaces` montre dans une habitude les spaces qu'elle a vécus,
--        `element_cloths` montre dans une leçon (WISDOM) ou une vision (VISION)
--        les Totehm Cloths qui la portent.
-- how  : un Cloth garde la RÉFÉRENCE de son élément (`box_kind`, `box_ref`) ; la
--        fonction les regroupe par élément : le total et les trois plus récents
--        (nom, ligne, étape, test, date). Streetwear (pièce payée, pas annulée)
--        et Luxury (devis payé et nommé). Jamais un brouillon.
--        Mon Totehm : mes pièces, celles de test comprises (marquées `test`).
--        Le Totehm d'un autre : ses pièces réelles, SEULEMENT si je peux lire ce
--        Totehm (`_shared_with_me` : son abonné vivant) — sinon une liste vide :
--        les pièces d'un pseudo ne se listent pas en public (Decode ne dit le
--        propriétaire qu'au niveau membre).
-- what : additive, une fonction neuve, authenticated seulement. Aucune donnée
--        touchée. Retour arrière : `drop function public.element_cloths(text)`
--        (ménage, Claude Code).

create or replace function public.element_cloths(p_pseudo text default null)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare v_me uuid := auth.uid(); v_uid uuid; v_out jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;

  if p_pseudo is null or btrim(p_pseudo) = '' then
    v_uid := v_me;
  else
    select p.id into v_uid from public.profiles p where lower(p.pseudo) = lower(btrim(p_pseudo)) limit 1;
    if v_uid is null then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
    if v_uid <> v_me and not public._shared_with_me(v_uid) then
      return jsonb_build_object('ok', true, 'mine', false, 'elements', '[]'::jsonb);
    end if;
  end if;

  with c as (
    select 'streetwear'::text as line, tc.name, tc.box_kind as kind, tc.box_ref as ref, tc.paid_at,
           coalesce(tc.test, false) as test,
           case tc.status when 'shipped' then 'shipped' when 'production' then 'production' else 'making' end as stage
      from public.totehm_clothes tc
     where tc.user_id = v_uid and tc.paid_at is not null and tc.status <> 'cancelled'
       and tc.box_kind in ('wisdom', 'vision') and btrim(coalesce(tc.box_ref, '')) <> ''
       and (v_uid = v_me or not coalesce(tc.test, false))
    union all
    select 'luxury'::text, q.name, q.box_kind, q.box_ref, q.paid_at, coalesce(q.test, false), 'making'::text
      from public.luxury_quotes q
     where q.user_id = v_uid and q.status = 'paid' and q.paid_at is not null and q.name is not null
       and q.box_kind in ('wisdom', 'vision') and btrim(coalesce(q.box_ref, '')) <> ''
       and (v_uid = v_me or not coalesce(q.test, false))
  ), r as (
    select c.*, count(*) over (partition by c.kind, c.ref) as n,
           row_number() over (partition by c.kind, c.ref order by c.paid_at desc, c.name) as rn
      from c
  )
  select coalesce(jsonb_agg(jsonb_build_object('kind', g.kind, 'ref', g.ref, 'total', g.total, 'cloths', g.cloths)
                            order by g.kind, g.ref), '[]'::jsonb)
    into v_out
    from (select r.kind, r.ref, max(r.n) as total,
                 jsonb_agg(jsonb_build_object('name', r.name, 'line', r.line, 'stage', r.stage, 'test', r.test,
                                              'paid_at', r.paid_at::date) order by r.rn)
                   filter (where r.rn <= 3) as cloths
            from r group by r.kind, r.ref) g;

  return jsonb_build_object('ok', true, 'mine', v_uid = v_me, 'elements', v_out);
end $function$;

-- Les grants APRÈS le dernier `create` (CLAUDE.md).
revoke all on function public.element_cloths(text) from public, anon;
grant execute on function public.element_cloths(text) to authenticated;
