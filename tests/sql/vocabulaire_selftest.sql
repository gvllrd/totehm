-- LE VOCABULAIRE DE LA BASE — Wah, 19/11/2026 : « les mots que j'utilise reflètent le backend ».
-- UN MOT = UNE CHOSE : habit · objective · repulsion · vision · story. Ce test REFUSE qu'une table porte un
-- ancien nom d'une box déjà renommée, ou qu'une fonction lise son ancien stockage. Les PONTS (vues et
-- fonctions aux anciens noms, gardées le temps qu'un lecteur suive) sont comptés, pas refusés : ils se
-- retirent quand plus rien ne les lit (backend/CLAUDE.md).
-- Attendu : « VOCABULAIRE · … · FAIL={} ». N'écrit rien.
DO $t$
declare
  fails text[] := '{}';
  v_tables text; v_corps text; v_ponts_vues int; v_ponts_fonctions int;
begin
  -- 1 · STORY (19/11) : plus aucune TABLE à l'ancien nom — seulement des vues-ponts
  select string_agg(c.relname, ', ') into v_tables
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and c.relname in ('wisdom', 'repulsion_teachings', 'teaching_objectives');
  if v_tables is not null then fails := fails || ('table à l''ancien nom: ' || v_tables); end if;

  -- 2 · STORY : aucune fonction ne lit l'ancien stockage (les ponts appellent les fonctions `story_*`)
  select string_agg(p.proname, ', ' order by p.proname) into v_corps
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
     and p.prosrc ~* '\mpublic\.wisdom\M|\mrepulsion_teachings\M|\mteaching_objectives\M|\mwisdom_id\M|(from|join|into|update)\s+wisdom\M';
  if v_corps is not null then fails := fails || ('lit l''ancien stockage STORY: ' || v_corps); end if;

  -- 3 · les ponts encore là (à retirer quand le connecteur ChatGPT, TotehmBot et la boutique ont suivi)
  select count(*) into v_ponts_vues from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
     and c.relname in ('wisdom', 'repulsion_teachings', 'teaching_objectives');
  select count(*) into v_ponts_fonctions from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('teaching_create', 'teaching_rename', 'teaching_delete', 'repulsion_teaching_link',
                       'repulsion_teaching_unlink', 'teaching_objective_link', 'teaching_objective_unlink', 'add_wisdom_admin');

  raise exception 'VOCABULAIRE · ponts STORY : % vues, % fonctions · FAIL=%', v_ponts_vues, v_ponts_fonctions, fails;
end $t$;
