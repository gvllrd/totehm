-- ══ UNE SEULE BOX POUR LE WHY · 1/2 — LA TABLE ═══════════════════════════════════════════
-- Wah, 19/11 : « Un objectif sans deadline est automatiquement déplacé dans la vue vision. Une vision
-- avec deadline est automatiquement déplacée dans la vue objectif. » Objectif et vision sont donc UNE
-- box (`objectives`) ; la date décide de la vue. Le lien objectif → vision (« the big why ») disparaît :
-- une Habit sert directement son why, daté ou non.
--
--   · `objectives` reçoit `image` et `importance` (ce que seule la vision portait) ;
--   · les visions y entrent avec LEUR identifiant : médias (`element_media` 'v'), confidentialité,
--     ordre et vêtements suivent sans rien réécrire ;
--   · `visions` devient une VUE sur les objectifs actifs sans date (`security_invoker` : la RLS
--     d'`objectives` s'applique). Les fonctions qui lisent ou écrivent `visions` continuent de marcher ;
--   · `objective_visions` est vidée (la table reste jusqu'au lot du connecteur ChatGPT) ;
--   · une box qui gagne ou perd sa date déplace ses médias d'une lettre à l'autre (`o` ↔ `v`).
-- L'ancienne table reste en `visions_legacy` (lecture seule, aucune politique) le temps de vérifier.

alter table public.objectives add column if not exists image text;
alter table public.objectives add column if not exists importance smallint;
alter table public.objectives drop constraint if exists objectives_image_path_check;
alter table public.objectives add constraint objectives_image_path_check
  check (image is null or image ~ '^[0-9a-f-]{36}/vision-[0-9a-f-]{36}\.(jpg|png|webp)$');

-- La copie ne doit rien journaliser : ces visions existent déjà dans le journal.
alter table public.objectives disable trigger totehm_journal_objective;
alter table public.objectives disable trigger trg_objective_event;
insert into public.objectives (id, user_id, text, i, importance, created_at, "is", image, audience, status, target_at)
select v.id, v.user_id, coalesce(v.text, ''), v.i, v.importance, v.created_at, coalesce(v."is", '{}'::text[]),
       v.image, coalesce(v.audience, 'private'), 'active', null
  from public.visions v
on conflict (id) do nothing;
alter table public.objectives enable trigger totehm_journal_objective;
alter table public.objectives enable trigger trg_objective_event;

-- Les médias d'un objectif sans date suivent sa vue : la lettre `v`.
update public.element_media m set kind = 'v'
  from public.objectives o
 where m.kind = 'o' and m.ref = o.id::text and o.target_at is null;

delete from public.objective_visions;
alter table public.objective_visions drop constraint if exists objective_visions_vision_id_fkey;

drop trigger if exists totehm_journal_vision on public.visions;
alter table public.visions rename to visions_legacy;
drop policy if exists "own visions" on public.visions_legacy;
drop policy if exists "visions members read" on public.visions_legacy;
revoke all on public.visions_legacy from anon, authenticated;
comment on table public.visions_legacy is
  '[COM] Ancienne table des visions, copiée dans objectives le 19/11/2026 (même id). Lecture de contrôle seulement ; à supprimer après le lot du connecteur.';

create view public.visions with (security_invoker = true) as
  select o.id, o.user_id, o.text, o.i, o.importance, o.created_at, o."is", o.image, o.audience
    from public.objectives o
   where o.target_at is null and coalesce(o.status, 'active') = 'active';
alter view public.visions alter column id set default gen_random_uuid();
alter view public.visions alter column created_at set default now();
alter view public.visions alter column "is" set default '{}'::text[];
alter view public.visions alter column audience set default 'private';
grant select, insert, update, delete on public.visions to authenticated, service_role;
grant select on public.visions to anon;
comment on view public.visions is
  '[COM]+[CLUB]+[BOUTIQUE] Les visions = les objectifs actifs SANS deadline (une seule box, la date décide de la vue).';

-- Le journal dit la vue où la box naît et d'où elle part.
create or replace function public._journal_objective()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if tg_op = 'INSERT' then
    if new.target_at is null then
      perform public._journal(new.user_id, 'vision', 'vision_added', new.text, new.i, new.id::text || ':a', '{}'::jsonb, new.created_at);
    else
      perform public._journal(new.user_id, 'objective', 'objective_added', new.text, new.i, new.id::text || ':a',
                              jsonb_build_object('by', new.target_at), new.created_at);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.status in ('achieved', 'abandoned', 'converted') then
      perform public._journal(new.user_id, 'objective', 'objective_' || new.status, new.text, new.i, new.id::text || ':' || new.status);
    elsif new.text is distinct from old.text or new.target_at is distinct from old.target_at then
      perform public._journal(new.user_id, case when new.target_at is null then 'vision' else 'objective' end,
                              case when new.target_at is null then 'vision_edited' else 'objective_edited' end,
                              new.text, new.i, null, jsonb_build_object('by', new.target_at));
    end if;
  elsif tg_op = 'DELETE' then
    if old.target_at is null then
      perform public._journal(old.user_id, 'vision', 'vision_removed', old.text, old.i, old.id::text || ':d');
    else
      perform public._journal(old.user_id, 'objective', 'objective_removed', old.text, old.i, old.id::text || ':d');
    end if;
  end if;
  return null;
exception when others then return null;
end $function$;

-- Une box qui gagne ou perd sa date change de vue : ses médias la suivent.
create or replace function public._objective_moves_view()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if (old.target_at is null) is distinct from (new.target_at is null) then
    update public.element_media set kind = case when new.target_at is null then 'v' else 'o' end
     where user_id = new.user_id and ref = new.id::text and kind in ('o', 'v');
  end if;
  return null;
end $function$;
drop trigger if exists objective_moves_view on public.objectives;
create trigger objective_moves_view after update of target_at on public.objectives
  for each row execute function public._objective_moves_view();

-- Le lien objectif → vision n'existe plus : un ancien onglet qui l'appelle ne casse rien.
create or replace function public.objective_vision_link(p_obj uuid, p_vision uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
end $function$;

revoke all on function public._objective_moves_view() from public, anon, authenticated;
