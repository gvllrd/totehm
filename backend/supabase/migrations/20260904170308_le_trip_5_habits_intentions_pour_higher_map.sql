-- LE TRIP · 5/5 — LE PONT ENTRE UNE HABITUDE SANS INTENTION ET LA CARTE.
--
-- `higher-map` faisait, ligne 140 :
--     .filter((h) => h.intention && h.text)
-- Une habitude sans `i` était JETÉE. Tant que l'interface forçait le choix,
-- personne ne le voyait. À partir du Trip, plus aucune nouvelle habitude ne
-- porte d'intention : sans ce pont, `mine` serait vide, la fonction renverrait
-- `no_intention`, et la carte serait NOIRE pour tout nouveau membre — sans
-- erreur, sans log, sans rien à quoi se raccrocher.
--
-- Un seul aller-retour pour toutes les habitudes du membre : un appel par
-- habitude, c'est vingt appels réseau pour ouvrir un écran.
create or replace function public.habits_intentions(p_texts text[])
returns jsonb
language sql immutable parallel safe as $$
  select coalesce(jsonb_object_agg(t, to_jsonb(public.intentions_of(t))), '{}'::jsonb)
  from unnest(coalesce(p_texts, '{}'::text[])) as t
  where btrim(coalesce(t,'')) <> '';
$$;

comment on function public.habits_intentions(text[]) is
  'texte d''habitude -> tableau de ses intentions, pour tout un Totehm en un appel. Utilisée par higher-map pour que les habitudes sans intention choisie restent visibles sur la carte.';

grant execute on function public.habits_intentions(text[]) to authenticated, service_role;
