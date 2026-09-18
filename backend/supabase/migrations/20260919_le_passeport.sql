-- TOTEHM · LE TOTEHM EST LE PASSEPORT · 19/09/2026
-- ════════════════════════════════════════════════════════════════════
-- Wah : « Un Totehm complet, c'est AU MOINS UNE BOÎTE REMPLIE DANS
-- CHACUNE DES CINQ VUES. » Rien d'autre n'ouvre TotehmBot, la
-- monétisation, la visibilité du profil, les candidatures Spot, ni le
-- visuel textile de la boutique.
--
-- ⚠️ LA RÈGLE VIT ICI, PAS DANS LE NAVIGATEUR. Une page peut mentir sur
-- ce qu'elle a affiché ; la base, non. Les quatre produits interrogent
-- la MÊME fonction, donc ils disent tous la même chose — et le jour où
-- la règle change, elle change une fois.
--
-- ⚠️ `p_user` EST EN PARAMÈTRE POUR QUE LE SERVEUR PUISSE DEMANDER POUR
-- QUELQU'UN D'AUTRE (le webhook, `creator_cercle`). En `security
-- definer` sans RLS derrière, ce paramètre lit le Totehm de n'importe
-- qui : la fonction ne renvoie donc QUE des booléens, jamais un
-- contenu. C'est volontaire, et ça ne doit pas changer.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.totehm_complete(p_user uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_uid   uuid := coalesce(p_user, auth.uid());
  v_steps jsonb;
  v_h boolean; v_o boolean; v_r boolean; v_w boolean; v_v boolean;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;

  select coalesce(steps,'[]'::jsonb) into v_steps
    from public.totehms where user_id = v_uid limit 1;
  v_steps := coalesce(v_steps,'[]'::jsonb);

  -- ⚠️ UNE BOITE VIDE NE COMPTE PAS. Les cinq objets naissent sans texte
  -- puis s'ecrivent dedans : compter les LIGNES laisserait passer un
  -- Totehm de cinq boites vides, ce qui serait le contraire du passeport.
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
    -- Combien de vues sont remplies : c'est ce que la barre de progression
    -- montre, et la calculer ici evite cinq additions cote client.
    'remplies', (v_h::int + v_o::int + v_r::int + v_w::int + v_v::int));
end $function$;

-- ⚠️ LE `REVOKE` SUIT TOUJOURS LE DERNIER `CREATE`, JAMAIS L'INVERSE.
-- `create or replace function` rétablit le GRANT à PUBLIC : un revoke
-- écrit plus haut dans le fichier serait effacé par le create.
revoke all on function public.totehm_complete(uuid) from public;
grant execute on function public.totehm_complete(uuid) to authenticated, service_role;
