-- ══ TOTEHMISER DEMANDE UNE BOX, PAS LES CINQ VUES · 08/11/2026 ══════════════════════════════════
-- Wah, 08/11 : « il est nécessaire d'avoir un Totehm (être inscrit sur totehm.com) mais il n'est
-- pas obligatoire d'avoir au moins une box dans chaque vue. Une seule box dans une vue suffit. »
--
-- ⚠️ `complete` NE CHANGE PAS : il est lu par `_figher()` (le Club), le cockpit de SPACE, la galerie
-- du Club, la porte de TotehmBot, le Higher Self en freemium et le grand livre. Changer sa valeur
-- déplacerait six règles d'un coup. On AJOUTE donc `any` — au moins une box non vide, n'importe
-- où —, et la boutique (page + `create-checkout`) passe de `complete` à `any`. Additif.
--
-- Le corps est celui du 19/09, inchangé sauf la clé `any` : une boîte VIDE ne compte toujours pas
-- (les cinq objets naissent sans texte puis s'écrivent dedans).
create or replace function public.totehm_complete(p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid   uuid := coalesce(p_user, auth.uid());
  v_steps jsonb;
  v_h boolean; v_o boolean; v_r boolean; v_w boolean; v_v boolean;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;

  select coalesce(steps,'[]'::jsonb) into v_steps
    from public.totehms where user_id = v_uid limit 1;
  v_steps := coalesce(v_steps,'[]'::jsonb);

  v_h := exists (select 1 from jsonb_array_elements(v_steps) s
                  where btrim(coalesce(s->>'t','')) <> '');
  v_o := exists (select 1 from public.objectives o
                  where o.user_id = v_uid and btrim(coalesce(o.text,'')) <> ''
                    and coalesce(o.status,'active') not in ('achieved','abandoned','converted'));
  v_r := exists (select 1 from public.repulsions r
                  where r.user_id = v_uid and r.active
                    and btrim(coalesce(r.repulsion,'')) <> '');
  v_w := exists (select 1 from public.wisdom w
                  where w.user_id = v_uid and btrim(coalesce(w.text,'')) <> '');
  v_v := exists (select 1 from public.visions v
                  where v.user_id = v_uid and btrim(coalesce(v.text,'')) <> '');

  return jsonb_build_object(
    'signed_in', true,
    'habits', v_h, 'objectives', v_o, 'repulsions', v_r,
    'wisdom', v_w, 'visions', v_v,
    'complete', (v_h and v_o and v_r and v_w and v_v),
    'any', (v_h or v_o or v_r or v_w or v_v),
    'remplies', (v_h::int + v_o::int + v_r::int + v_w::int + v_v::int));
end $function$;

revoke all on function public.totehm_complete(uuid) from public, anon;
grant execute on function public.totehm_complete(uuid) to authenticated, service_role;
