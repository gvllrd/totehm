-- ══ LA CONFIDENTIALITÉ EST PAR BOX · 18/10/2026 (lot G) ═══════════════════════════════════════════
-- Wah : « il n'est pas question ici de confidentialité du totehm puisque la confidentialité s'effectue
-- pour chaque box de chaque vue pour un contrôle totale sur son Totehm. Et 3 choix possible de
-- confidentialité : private (only me) · Subscribers · Club ».
--
-- Donc : l'audience quitte le Totehm pour la BOÎTE. Les quatre tables la portent en colonne ; les
-- habitudes vivent dans `totehms.steps` (un jsonb réécrit en entier à chaque sauvegarde), alors elles
-- la portent dans une TABLE À PART — la même leçon que `habit_spots` : une visibilité qui voyage avec
-- le snapshot d'habitudes se fait écraser en silence (voir backend/CLAUDE.md, 01/10).
--
-- ADDITIVE : aucun `drop`, aucun `update` sans `where`, aucun prix. L'héritage initial = l'audience
-- actuelle du Totehm : personne ne gagne ni ne perd un lecteur le jour de la migration.
--
-- ⚠️ CE FICHIER EST LA PART QUI PASSE DEPUIS LE CLOUD. Mesuré le 18/10 : un `create or replace` sur une
-- fonction QUI EXISTE DÉJÀ expire à l'approbation (comme un `drop`), alors qu'une création pure passe.
-- Les remplacements (`habit_rename_links`, `totehm_of`) et les `alter policy` sont donc dans
-- `20261018091000_audience_par_box_lecteurs.sql`, pour Claude Code (terminal).
--
-- ⚠️ TANT QUE CE SECOND FICHIER N'EST PAS PASSÉ, LA PAGE ÉCRIT PAR `box_audience_put` — qui NE TOUCHE
-- PAS `totehms.audience`. Conséquence voulue : la lecture d'un tiers reste exactement ce qu'elle était,
-- jamais plus ouverte. `box_audience_set` (qui, elle, recalcule le plafond) attend les lecteurs filtrés.
-- (pas de transaction explicite : `apply_migration` enveloppe déjà le fichier)

-- ── 1 · les quatre tables portent leur audience ───────────────────────────────────────────────────
alter table public.objectives add column if not exists audience text;
alter table public.repulsions add column if not exists audience text;
alter table public.visions    add column if not exists audience text;
alter table public.wisdom     add column if not exists audience text;

update public.objectives o set audience =
  coalesce((select t.audience from public.totehms t where t.user_id = o.user_id), 'private')
  where o.audience is null;
update public.repulsions r set audience =
  coalesce((select t.audience from public.totehms t where t.user_id = r.user_id), 'private')
  where r.audience is null;
update public.visions v set audience =
  coalesce((select t.audience from public.totehms t where t.user_id = v.user_id), 'private')
  where v.audience is null;
update public.wisdom w set audience =
  coalesce((select t.audience from public.totehms t where t.user_id = w.user_id), 'private')
  where w.audience is null;

-- ⚠️ `public` reste une valeur héritée possible (la contrainte de `totehms` l'accepte encore, faute de
-- `drop` depuis le cloud) : on la NORMALISE ici, et plus rien ne la produira.
update public.objectives set audience = 'figher' where audience not in ('private','figher','subscribers');
update public.repulsions set audience = 'figher' where audience not in ('private','figher','subscribers');
update public.visions    set audience = 'figher' where audience not in ('private','figher','subscribers');
update public.wisdom     set audience = 'figher' where audience not in ('private','figher','subscribers');

alter table public.objectives alter column audience set default 'private';
alter table public.repulsions alter column audience set default 'private';
alter table public.visions    alter column audience set default 'private';
alter table public.wisdom     alter column audience set default 'private';
alter table public.objectives alter column audience set not null;
alter table public.repulsions alter column audience set not null;
alter table public.visions    alter column audience set not null;
alter table public.wisdom     alter column audience set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'objectives_audience_check3') then
    alter table public.objectives add constraint objectives_audience_check3
      check (audience in ('private','figher','subscribers'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'repulsions_audience_check3') then
    alter table public.repulsions add constraint repulsions_audience_check3
      check (audience in ('private','figher','subscribers'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'visions_audience_check3') then
    alter table public.visions add constraint visions_audience_check3
      check (audience in ('private','figher','subscribers'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wisdom_audience_check3') then
    alter table public.wisdom add constraint wisdom_audience_check3
      check (audience in ('private','figher','subscribers'));
  end if;
end $$;

-- ── 2 · les habitudes : une table, jamais une colonne dans `steps` ────────────────────────────────
create table if not exists public.habit_audience (
  user_id    uuid not null references auth.users(id) on delete cascade,
  habit_text text not null,
  audience   text not null default 'private'
             check (audience in ('private','figher','subscribers')),
  updated_at timestamptz not null default now(),
  primary key (user_id, habit_text)
);
alter table public.habit_audience enable row level security;   -- RLS sans politique : par fonction seulement

insert into public.habit_audience (user_id, habit_text, audience)
select t.user_id, btrim(s->>'t'),
       case when t.audience in ('private','figher','subscribers') then t.audience else 'figher' end
  from public.totehms t, lateral jsonb_array_elements(coalesce(t.steps,'[]'::jsonb)) s
 where nullif(btrim(s->>'t'),'') is not null
on conflict (user_id, habit_text) do nothing;



-- ── 3 · LA RÈGLE : une box se lit par son audience, jamais par celle du Totehm ────────────────────
create or replace function public._box_shared(p_owner uuid, p_audience text)
returns boolean language sql stable security definer set search_path to '' as $f$
  select public._audience_ok(p_owner, p_audience, auth.uid(),
           case when p_audience = 'figher' then public._is_figher(auth.uid()) else false end);
$f$;

-- Le niveau d'UNE box, quel que soit son genre (h · t · r · w · v). service_role seul.
create or replace function public._box_audience(p_owner uuid, p_kind text, p_ref text)
returns text language plpgsql stable security definer set search_path to '' as $f$
declare v text;
begin
  if p_owner is null or p_ref is null then return 'private'; end if;
  if p_kind = 'h' then
    select ha.audience into v from public.habit_audience ha
      where ha.user_id = p_owner and ha.habit_text = btrim(p_ref);
  elsif p_kind = 't' then
    select o.audience into v from public.objectives o where o.user_id = p_owner and o.id = p_ref::uuid;
  elsif p_kind = 'r' then
    select r.audience into v from public.repulsions r where r.user_id = p_owner and r.id = p_ref::bigint;
  elsif p_kind = 'w' then
    select w.audience into v from public.wisdom w where w.user_id = p_owner and w.id = p_ref::uuid;
  elsif p_kind = 'v' then
    select vi.audience into v from public.visions vi where vi.user_id = p_owner and vi.id = p_ref::uuid;
  end if;
  return coalesce(v, 'private');
exception when others then return 'private';
end $f$;

-- ── 4 · L'ÉCRIVAIN : le propriétaire seul, et il rend la VRAIE audience ───────────────────────────
-- ⚠️ `totehms.audience` devient une CONSÉQUENCE, pas un réglage : c'est le niveau le plus ouvert
-- parmi mes box. L'offre créateur (`_offer_open`) continue de le lire ; le verso ne le règle plus.
create or replace function public._totehm_audience_recalc(p_user uuid)
returns text language plpgsql security definer set search_path to '' as $f$
declare v text;
begin
  select case
           when bool_or(a = 'figher')      then 'figher'
           when bool_or(a = 'subscribers') then 'subscribers'
           else 'private' end
    into v
    from (
      select audience a from public.objectives where user_id = p_user
      union all select audience from public.repulsions where user_id = p_user
      union all select audience from public.visions    where user_id = p_user
      union all select audience from public.wisdom     where user_id = p_user
      union all select audience from public.habit_audience where user_id = p_user
    ) z;
  v := coalesce(v, 'private');
  update public.totehms set audience = v where user_id = p_user and audience is distinct from v;
  return v;
end $f$;

create or replace function public.box_audience_set(p_kind text, p_id text, p_audience text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_a text; v_n int := 0;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  v_a := lower(btrim(coalesce(p_audience,'')));
  if v_a = 'public' then v_a := 'figher'; end if;          -- plus de niveau PUBLIC, jamais
  if v_a not in ('private','figher','subscribers') then
    return jsonb_build_object('ok', false, 'why', 'audience');
  end if;
  if p_kind = 'h' then
    insert into public.habit_audience (user_id, habit_text, audience)
      values (v_uid, btrim(p_id), v_a)
      on conflict (user_id, habit_text) do update set audience = excluded.audience, updated_at = now();
    get diagnostics v_n = row_count;
  elsif p_kind = 't' then
    update public.objectives set audience = v_a where user_id = v_uid and id = p_id::uuid;
    get diagnostics v_n = row_count;
  elsif p_kind = 'r' then
    update public.repulsions set audience = v_a where user_id = v_uid and id = p_id::bigint;
    get diagnostics v_n = row_count;
  elsif p_kind = 'w' then
    update public.wisdom set audience = v_a where user_id = v_uid and id = p_id::uuid;
    get diagnostics v_n = row_count;
  elsif p_kind = 'v' then
    update public.visions set audience = v_a where user_id = v_uid and id = p_id::uuid;
    get diagnostics v_n = row_count;
  else
    return jsonb_build_object('ok', false, 'why', 'kind');
  end if;
  if v_n = 0 then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  return jsonb_build_object('ok', true, 'kind', p_kind, 'audience', v_a,
                            'totehm', public._totehm_audience_recalc(v_uid));
exception when invalid_text_representation then
  return jsonb_build_object('ok', false, 'why', 'not_mine');
end $f$;

-- Mes niveaux, en UNE lecture : la page peint la pastille sans recomposer la règle.
create or replace function public.my_box_audiences()
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  return jsonb_build_object('ok', true,
    'h', coalesce((select jsonb_object_agg(habit_text, audience) from public.habit_audience where user_id = v_uid), '{}'::jsonb),
    't', coalesce((select jsonb_object_agg(id::text, audience) from public.objectives where user_id = v_uid), '{}'::jsonb),
    'r', coalesce((select jsonb_object_agg(id::text, audience) from public.repulsions where user_id = v_uid), '{}'::jsonb),
    'w', coalesce((select jsonb_object_agg(id::text, audience) from public.wisdom     where user_id = v_uid), '{}'::jsonb),
    'v', coalesce((select jsonb_object_agg(id::text, audience) from public.visions    where user_id = v_uid), '{}'::jsonb));
end $f$;


-- ── 4 bis · L'ÉCRIVAIN QUE LA PAGE APPELLE AUJOURD'HUI ────────────────────────────────────────────
-- Identique à `box_audience_set`, SANS le recalcul du plafond `totehms.audience`. C'est ce qui garantit
-- qu'un niveau posé sur UNE box n'ouvre pas le Totehm entier tant que `totehm_of` n'est pas filtré.
create function public.box_audience_put(p_kind text, p_id text, p_audience text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_a text; v_n int := 0;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  v_a := lower(btrim(coalesce(p_audience,'')));
  if v_a = 'public' then v_a := 'figher'; end if;
  if v_a not in ('private','figher','subscribers') then
    return jsonb_build_object('ok', false, 'why', 'audience');
  end if;
  if p_kind = 'h' then
    insert into public.habit_audience (user_id, habit_text, audience)
      values (v_uid, btrim(p_id), v_a)
      on conflict (user_id, habit_text) do update set audience = excluded.audience, updated_at = now();
    get diagnostics v_n = row_count;
  elsif p_kind = 't' then
    update public.objectives set audience = v_a where user_id = v_uid and id = p_id::uuid;
    get diagnostics v_n = row_count;
  elsif p_kind = 'r' then
    update public.repulsions set audience = v_a where user_id = v_uid and id = p_id::bigint;
    get diagnostics v_n = row_count;
  elsif p_kind = 'w' then
    update public.wisdom set audience = v_a where user_id = v_uid and id = p_id::uuid;
    get diagnostics v_n = row_count;
  elsif p_kind = 'v' then
    update public.visions set audience = v_a where user_id = v_uid and id = p_id::uuid;
    get diagnostics v_n = row_count;
  else
    return jsonb_build_object('ok', false, 'why', 'kind');
  end if;
  if v_n = 0 then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  return jsonb_build_object('ok', true, 'kind', p_kind, 'audience', v_a);
exception when invalid_text_representation then
  return jsonb_build_object('ok', false, 'why', 'not_mine');
end $f$;

revoke all on function public.box_audience_put(text, text, text) from public, anon;
grant execute on function public.box_audience_put(text, text, text) to authenticated;
