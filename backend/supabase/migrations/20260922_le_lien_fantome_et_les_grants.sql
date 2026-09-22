-- ══ LE TRIGGER POSAIT UN LIEN VERS RIEN · 22/09/2026 ════════════════
-- DÉJÀ APPLIQUÉE EN PRODUCTION le 22/09. Ce fichier existe pour que le
-- repo dise la vérité. Ne pas relancer `db push`.
--
-- `repulsion_seed_link` insère un lien (repulsion_id, habit_text) à
-- CHAQUE insertion dans `repulsions`. Or `repulsion_create` écrit
-- `habit_text = ''` — les cinq objets naissent vides puis s'écrivent
-- dedans (création optimiste, 17/09). Le trigger posait donc, à chaque
-- création, un lien vers une habitude de TEXTE VIDE.
--
-- Mesuré en production le 22/09, sur un vrai compte :
--   my_trips() -> {"id":61, "hs":[""], "ws":[...], ...}
--
-- Le front filtre ce fantôme (`habsOfRep` fait `.filter(Boolean)`),
-- donc l'écran ne casse pas — mais c'est une ligne fausse dans une
-- table de liens, et elle se comptait comme un lien réel dans tout ce
-- qui ne pense pas à écarter la chaîne vide.
--
-- Le trigger garde sa raison d'être : poser le PREMIER lien quel que
-- soit l'écrivain, y compris le bot (voir CLAUDE.md, 06/09). Il cesse
-- juste de poser un lien quand il n'y a rien à lier.
create or replace function public.repulsion_seed_link()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- ⚠️ UN LIEN VIDE N'EST PAS UN LIEN.
  if new.habit_text is null or btrim(new.habit_text) = '' then
    return new;
  end if;
  insert into public.repulsion_habits(repulsion_id, user_id, habit_text)
  values (new.id, new.user_id, new.habit_text)
  on conflict do nothing;
  return new;
end $function$;

-- Et on efface les fantômes déjà posés : un lien dont la cible est la
-- chaîne vide ne désigne aucune habitude, ni maintenant ni jamais.
delete from public.repulsion_habits where btrim(habit_text) = '';

-- ══ ET LES GRANTS QUI ÉTAIENT REVENUS À PUBLIC ══════════════════════
-- Règle du projet : « `create or replace function` rétablit le GRANT à
-- PUBLIC. Tout `revoke` suit le dernier `create`, jamais l'inverse. »
--
-- Mesuré le 22/09 : `intention_sound_set` (qui ÉCRIT), `intention_sounds`
-- et `totehmbot_access` étaient exécutables par `anon`. Les trois
-- datent des lots des 20 et 21/09 : la règle a été oubliée trois fois
-- de suite, parce que rien ne la vérifie automatiquement.
--
-- Aucune des trois ne fuit de donnée — elles passent toutes par
-- `auth.uid()` — mais une fonction d'écriture ouverte à l'anonyme est
-- une surface offerte pour rien.
revoke execute on function public.intention_sound_set(text, text, text) from anon, public;
revoke execute on function public.intention_sounds() from anon, public;
revoke execute on function public.totehmbot_access() from anon, public;
grant  execute on function public.intention_sound_set(text, text, text) to authenticated;
grant  execute on function public.intention_sounds() to authenticated;
grant  execute on function public.totehmbot_access() to authenticated;
