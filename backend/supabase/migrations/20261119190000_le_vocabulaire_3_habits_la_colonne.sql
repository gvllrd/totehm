-- ══ LE VOCABULAIRE · 3a — HABITS, LA COLONNE ═══════════════════════════════════════════
-- Wah, 19/11 : « les mots que j'utilise reflètent le backend ». Les Habits d'un membre vivaient dans
-- `totehms.steps` — un mot qu'il ne dit jamais. Elles vivent désormais dans `totehms.habits`.
--
-- La page écrit cette colonne DIRECTEMENT (un upsert), et six fonctions serveur la lisent (le bot, la carte,
-- les paiements, le connecteur) : on ne peut pas la renommer d'un coup. Donc :
--   · `habits` naît, recopiée de `steps` ;
--   · PONT : `totehms_habits_sync` garde les deux colonnes IDENTIQUES, dans les deux sens — un onglet resté
--     ouvert, TotehmBot ou un paiement écrivent `steps`, la page écrit `habits`, et chacun lit la même chose ;
--   · le journal des Habits (`_journal_habits`, ex-`_journal_steps`) suit les deux colonnes : la page qui
--     n'écrit que `habits` reste journalisée.
-- `steps` part quand plus rien ne l'écrit ni ne le lit (lot du connecteur, du bot, de la boutique).

alter table public.totehms add column if not exists habits jsonb not null default '[]'::jsonb;
update public.totehms set habits = steps where habits is distinct from steps;
comment on column public.totehms.habits is
  'Les Habits du membre, dans leur ordre (le mot de Wah). PONT : `steps` en est la copie exacte (totehms_habits_sync), à retirer.';
comment on column public.totehms.steps is
  'PONT : l''ancien nom de `habits`, tenu identique par totehms_habits_sync. À retirer quand plus rien ne le lit.';

-- Les deux colonnes restent la même chose. Une écriture des deux à la fois : `habits` l'emporte.
create or replace function public._totehm_habits_sync()
 returns trigger language plpgsql as $function$
begin
  if tg_op = 'INSERT' then
    if new.habits is distinct from new.steps then
      if new.habits = '[]'::jsonb then new.habits := new.steps;   -- un ancien écrivain (steps seul)
      else new.steps := new.habits; end if;                        -- la page (habits seul) ou les deux
    end if;
  elsif new.habits is distinct from old.habits then
    new.steps := new.habits;
  elsif new.steps is distinct from old.steps then
    new.habits := new.steps;
  end if;
  return new;
end $function$;
comment on function public._totehm_habits_sync() is
  '[COM] PONT : garde totehms.steps et totehms.habits identiques, le temps que tout lecteur lise `habits`.';
drop trigger if exists totehms_habits_sync on public.totehms;
create trigger totehms_habits_sync before insert or update of steps, habits on public.totehms
  for each row execute function public._totehm_habits_sync();

-- Le journal des Habits suit les deux colonnes.
alter function public._journal_steps() rename to _journal_habits;
drop trigger if exists totehm_journal_steps on public.totehms;
create trigger totehm_journal_habits after insert or update of steps, habits on public.totehms
  for each row execute function public._journal_habits();
