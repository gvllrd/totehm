-- LE TRIP · 4/5 — LE CLASSIFIEUR, CORRIGÉ PAR LA MESURE.
--
-- La version de la migration 1/5 rendait UNE intention et tombait sur 'focus'
-- par défaut. Mesurée sur les 11 habitudes réelles des membres : SEPT
-- tombaient sur le défaut. « Faire 30 minutes d'exercice physique » → focus.
-- Un classifieur qui range les deux tiers du corpus dans la même case ne
-- classe pas, il abandonne.
--
-- DEUX CORRECTIONS, et la deuxième est la vraie :
--
--   1. Le vocabulaire. Les règles avaient été écrites de mémoire, pas d'après
--      ce que les gens écrivent VRAIMENT : « exercice », « physique »,
--      « séance », « récupération », « eau », « manger », « réseau »,
--      « meilleure version » n'y étaient pas.
--
--   2. UNE HABITUDE PEUT SERVIR PLUSIEURS INTENTIONS. L'intention n'est pas
--      une étiquette, c'est une CLÉ DE JOINTURE vers le monde. Être généreux
--      coûte quelques lignes de candidats de plus ; se tromper coûte un écran
--      vide. « Faire de la méditation dans les espaces verts » est flow ET
--      love, et le cosine tranche derrière sur l'embedding.
--      Zéro match ⇒ les SEPT, jamais « focus par dépit » : sans signal, on
--      compare au monde entier plutôt qu'à un septième arbitraire.
--
-- VÉRIFIÉ APRÈS ÉCRITURE, sur les 11 habitudes en base :
--     habitudes 11 · sans_signal 0 · avaient_un_choix 6 · choix_retrouvé 4
-- Aucune ne retombe sur les sept, et l'intention que le membre avait choisie
-- lui-même est contenue dans l'ensemble déduit dans 4 cas sur 6 — les deux
-- autres restent dans le même pilier. De toute façon le choix du membre GAGNE :
-- `my_trips` fait `coalesce(choisie, déduite)`.
--
-- LA RÈGLE QUI EN SORT : un classifieur ne se juge pas sur ses règles, il se
-- mesure sur le corpus réel. Cinq minutes de SELECT ont évité de livrer une
-- carte qui aurait rangé les deux tiers des habitudes au même endroit.
create or replace function public.intentions_of(p_text text)
returns text[]
language sql immutable parallel safe as $$
  with rules(intention, rx) as (values
   ('fight',    '(sport|gym|muscu|boxe|box|run|courir|jogg|workout|lift|fight|combat|spar|entra[iî]n|exercice|physique|s[ée]ance|abdo|pompe|force|discipline|froid|cold|je[uû]ne|fast|dur|effort)'),
   ('flow',     '(marche|walk|nage|swim|yoga|[ée]tir|stretch|respir|breath|dor(s|mir|t)|sommeil|sleep|repos|r[ée]cup|rest|nature|vert|surf|v[ée]lo|bike|flow|balade|eau|boire|manger|fruit|l[ée]gume|nutrition|sant[ée]|marcher)'),
   ('enrich',   '(lis|lire|read|livre|book|appren|learn|[ée]tud|study|langue|cours|formation|[ée]cri|writ|note|podcast|documentaire|culture|savoir|comprendre|r[ée]seau|network|entrepreneur|rencontr)'),
   ('love',     '(aime|amour|love|famille|family|ami|friend|appel|call|m[eè]re|p[eè]re|enfant|couple|proche|donne|give|merci|gratitude|pri[eè]|pray|m[ée]dit|meditat|contempl|beaut)'),
   ('express',  '(joue|jouer|play|musique|music|chante|sing|danse|dance|dessin|draw|pein|paint|cr[ée]e|cr[ée]a|creat|studio|morceau|track|beat|art|artiste|sc[eè]ne|stage|filmer|photo)'),
   ('celebrate','(f[eê]te|party|sors|sortir|club|concert|verre|drink|c[ée]l[eè]br|celebrat|anniv|dj|bar|show|amis|soir[ée]e)'),
   ('focus',    '(travail|work|bosse|deep|concentr|focus|code|projet|project|client|business|mail|admin|plan|objectif|deadline|t[ée]l[ée]phone|phone|[ée]cran|screen|productif|top level|meilleure version|progress|niveau)')
  )
  select coalesce(
    nullif(array(select r.intention from rules r where lower(coalesce(p_text,'')) ~ r.rx), '{}'),
    array(select r.intention from rules r)
  );
$$;

comment on function public.intentions_of(text) is
  'Toutes les intentions que sert une habitude, déduites de son texte. Déterministe, zéro coût, zéro appel IA. Rend les 7 quand rien ne matche : sans signal on compare au monde entier, jamais à un septième arbitraire. C''est la clé de jointure vers places/spots/live_events.';

-- La forme au singulier reste, pour tout ce qui doit AFFICHER une intention
-- (une seule couleur, un seul mot). Elle est désormais DÉRIVÉE de la liste :
-- deux tables de règles séparées auraient divergé au premier ajout de mot.
create or replace function public.intention_of(p_text text)
returns text
language sql immutable parallel safe as $$
  select (public.intentions_of(p_text))[1];
$$;

grant execute on function public.intentions_of(text) to anon, authenticated, service_role;
grant execute on function public.intention_of(text)  to anon, authenticated, service_role;
