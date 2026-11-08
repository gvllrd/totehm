-- ══ LES SIX TABLES À TRANCHER, TRANCHÉES PAR WAH · 08/11/2026 ═══════════════════════════════════
-- Wah, 08/11 : « Morts : crew_attributions · crew_codes ; collabs plutôt BOUTIQUE ;
-- intention_music c'est COM, c'est dans le TOTEHM ; concept_slides c'est boutique. »
comment on table public.collabs is
  '[BOUTIQUE] une collaboration artistique sur une pièce';
comment on table public.concept_slides is
  '[BOUTIQUE] les planches d''un concept';
comment on table public.intention_music is
  '[COM] la musique attachée à une intention du TOTEHM';

-- ── LE « CREW » EST MORT : 2 tables à 0 ligne, 2 fonctions, 2 politiques, 3 clés étrangères ──────
-- Vérifié le 08/11 avant de retirer : 0 ligne de chaque côté, aucun appel dans tout le dépôt
-- (front, Edge Functions, flux n8n, auto-tests), aucune vue, aucun déclencheur.
-- ⚠️ `attribute_crew` prend `(uuid, text)` : un `drop ... if exists` avec la mauvaise signature
-- réussit SANS RIEN RETIRER, en silence. Toujours relire `oid::regprocedure` avant un drop.
drop function if exists public.attribute_crew(uuid, text);
drop function if exists public.my_crew_dashboard();
drop table if exists public.crew_attributions;
drop table if exists public.crew_codes;
