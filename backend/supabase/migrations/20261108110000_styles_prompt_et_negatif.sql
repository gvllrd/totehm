-- ══ UN STYLE ARTISTIQUE DIT CE QU'IL EST · 08/11/2026 ════════════════════════════════════════════
-- Mesuré le 08/11 : les six styles n'ont qu'un NOM. B sélectionne `artistic_styles(*)` mais
-- n'injecte que `style.name` dans le prompt : « Ink Realism » ne pilote donc rien du tout.
-- `system_prompt_prefix` (déjà là, vide partout) devient CE QUE LE STYLE EST ;
-- `negative_prompt` devient CE QU'IL REFUSE. Les deux entrent dans le prompt de n8n B.
-- Additif : une colonne avec défaut, rien à réécrire, aucune politique touchée.
alter table public.artistic_styles
  add column if not exists negative_prompt text not null default '';

comment on column public.artistic_styles.system_prompt_prefix is
  'Ce que le style EST : matière, geste, lumière, composition, references historiques. Entre dans le prompt de n8n B, avant la box d''ancrage. Jamais une instruction au modele, jamais une marque, jamais un artiste vivant nomme.';
comment on column public.artistic_styles.negative_prompt is
  'Ce que le style REFUSE, en une liste courte. Entre dans le prompt de n8n B apres « Avoid: ».';

-- ── L'ANCIENNE `my_dashboard` s'en va : `my_board` l'a remplacée, aucun client ne l'appelle ───────
-- (vérifié le 08/11 sur tout le dépôt : zéro appel en front comme en Edge Function)
drop function if exists public.my_dashboard(text);
