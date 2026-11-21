-- ══ LE VOCABULAIRE · 5 — L'ARGENT DIT `story` ════════════════════════════════════════
-- `create-checkout` et `luxury-quote` écrivent désormais `story` pour une box MY STORY (Wah, 19/11 : « les mots que
-- j'utilise reflètent le backend »). Les deux contraintes ne connaissaient que `wisdom` : sans ce lot, le premier
-- paiement d'une pièce MY STORY aurait échoué à l'écriture du brouillon. Mesuré le 21/11 : 0 ligne `wisdom` dans les
-- deux tables. `wisdom` reste admis le temps du PONT (une page en cache), à retirer avec les autres ponts.
-- Les lecteurs (`_box_matter`, `_box_shots`, `element_cloths`) admettent déjà les deux mots.

alter table public.totehm_clothes drop constraint totehm_clothes_box_kind_chk;
alter table public.totehm_clothes add constraint totehm_clothes_box_kind_chk
  check (box_kind is null or box_kind = any (array['habit','objective','repulsion','story','vision','wisdom']));

alter table public.luxury_quotes drop constraint luxury_quotes_box_kind_check;
alter table public.luxury_quotes add constraint luxury_quotes_box_kind_check
  check (box_kind = any (array['habit','objective','repulsion','story','vision','wisdom']));
