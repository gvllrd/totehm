-- ══ LE GRAND MÉNAGE · 22/09/2026 ═══════════════════════════════════
-- DÉJÀ APPLIQUÉ EN PRODUCTION. Ne pas relancer `db push`.
-- Demandé par Wah. Cinq lots de tentatives ont laissé derrière eux des
-- lignes de test, des versions périmées et des sauts de ligne.
--
-- ⚠️ CE QUI N'A PAS ÉTÉ SUPPRIMÉ, ET POURQUOI : les répulsions
-- INACTIVES. Elles sont référencées par `pushes` (l'historique des
-- messages du bot) — une clé étrangère refuse la suppression, et elle a
-- raison : c'est une donnée métier. Elles ne s'affichent jamais
-- (`my_trips` filtre sur `active`), donc elles ne gênent rien.

-- ══ 1 · LES SAUTS DE LIGNE DANS LES TEXTES ══════════════════════════
-- Ils viennent de la touche Entrée, quand elle insérait un retour à la
-- ligne au lieu d'enregistrer (corrigé le 22/09).
--
-- ⚠️ ET CE N'EST PAS COSMÉTIQUE. Les liens pointent une habitude PAR
-- SON TEXTE : « Musique\n » et « Musique » sont deux clés différentes.
-- C'est exactement comme ça qu'un lien s'orpheline sans que personne
-- s'en aperçoive — et il y en avait dans cette base.
update public.repulsions set repulsion = btrim(regexp_replace(repulsion, '[\r\n]+', ' ', 'g'))
 where repulsion ~ '[\r\n]';
update public.repulsions set habit_text = btrim(regexp_replace(habit_text, '[\r\n]+', ' ', 'g'))
 where habit_text ~ '[\r\n]';
update public.repulsion_habits set habit_text = btrim(regexp_replace(habit_text, '[\r\n]+', ' ', 'g'))
 where habit_text ~ '[\r\n]';
update public.objective_habits set habit_text = btrim(regexp_replace(habit_text, '[\r\n]+', ' ', 'g'))
 where habit_text ~ '[\r\n]';
update public.objectives set text = btrim(regexp_replace(text, '[\r\n]+', ' ', 'g'))
 where text ~ '[\r\n]';
update public.wisdom  set text = btrim(regexp_replace(text, '[\r\n]+', ' ', 'g')) where text ~ '[\r\n]';
update public.visions set text = btrim(regexp_replace(text, '[\r\n]+', ' ', 'g')) where text ~ '[\r\n]';

-- Les habitudes vivent dans le `jsonb steps` : même traitement, sur `t`
-- ET `t0` — `t0` est le texte que le SERVEUR croit, c'est lui la clé.
update public.totehms t
   set steps = (
     select coalesce(jsonb_agg(
              case when (s->>'t') ~ '[\r\n]' or coalesce(s->>'t0','') ~ '[\r\n]'
                   then jsonb_set(jsonb_set(s,'{t}',
                          to_jsonb(btrim(regexp_replace(s->>'t','[\r\n]+',' ','g')))),
                          '{t0}', to_jsonb(btrim(regexp_replace(
                            coalesce(nullif(s->>'t0',''), s->>'t'),'[\r\n]+',' ','g'))))
                   else s end), '[]'::jsonb)
     from jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s)
 where exists (select 1 from jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
                where (s->>'t') ~ '[\r\n]' or coalesce(s->>'t0','') ~ '[\r\n]');

-- ══ 2 · LES OBSTACLES PARASITES ═════════════════════════════════════
-- `obstacle` sert au bot à reconnaître ce à quoi une répulsion répond.
-- Des restes de saisie (« yo », « Hey ») n'y ont rien à faire ;
-- `repulsion_create` pose « — », c'est la valeur neutre.
update public.repulsions set obstacle = '—'
 where active
   and (btrim(coalesce(obstacle,'')) in ('','yo','Yo','hey','Hey','test','Test')
        or obstacle ilike 'yo %');

-- ══ 3 · LA COLONNE HISTORIQUE NE DOIT PAS MENTIR ════════════════════
-- `repulsions.habit_text` porte le PREMIER lien. S'il désigne une
-- habitude qui n'existe plus, il ment — et depuis la correction de
-- l'index unique, le vider est sans conséquence.
update public.repulsions r set habit_text = ''
 where btrim(r.habit_text) <> ''
   and not exists (
     select 1 from public.totehms t, jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
      where t.user_id = r.user_id and s->>'t' = r.habit_text);

-- ══ 4 · LES BOÎTES RESTÉES VIDES ════════════════════════════════════
-- Un objet créé puis abandonné sans un mot n'est pas un objet : il
-- occupe une ligne dans la vue et ne compte pas pour le passeport
-- (`totehm_complete` ne compte que les textes non vides).
delete from public.repulsion_teachings
 where wisdom_id in (select id from public.wisdom where btrim(text)='');
delete from public.teaching_objectives
 where wisdom_id in (select id from public.wisdom where btrim(text)='');
delete from public.wisdom where btrim(text)='';

delete from public.objective_habits
 where objective_id in (select id from public.objectives where btrim(text)='');
delete from public.objective_visions
 where objective_id in (select id from public.objectives where btrim(text)='');
delete from public.teaching_objectives
 where objective_id in (select id from public.objectives where btrim(text)='');
delete from public.objectives where btrim(text)='';

-- ══ 5 · LES LIENS QUI NE MÈNENT NULLE PART ══════════════════════════
-- Un lien vers une habitude supprimée depuis ne s'affichera jamais — le
-- front le filtre — mais il se compte partout ailleurs.
delete from public.repulsion_habits rh
 where btrim(rh.habit_text) = ''
    or not exists (
      select 1 from public.totehms t, jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
       where t.user_id = rh.user_id and s->>'t' = rh.habit_text);
delete from public.objective_habits oh
 where btrim(oh.habit_text) = ''
    or not exists (
      select 1 from public.totehms t, jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
       where t.user_id = oh.user_id and s->>'t' = oh.habit_text);
