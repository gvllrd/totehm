-- 06/11/2026 (Wah) — LA PAGE D'UN CLOTH DÉCODÉ, et le DOPE.
-- `reveal_cloth` reste en place : on ne la remplace pas (le cloud ne passe pas un
-- `create or replace`), on l'ENVELOPPE. `cloth_page` rend ce qu'elle rend, plus ce que
-- la nouvelle page demande : le rang dans le STYLE (et non plus seulement dans le
-- vêtement), l'identifiant du totehmisateur pour aller à sa page, la fiche du vêtement
-- pour le tiroir, et le compte de dopes.

-- QUI A DOPÉ. Une ligne par membre et par pièce ; on ne dope pas deux fois.
create table if not exists public.cloth_dopes (
  cloth_id   uuid not null references public.totehm_clothes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cloth_id, user_id)
);
create index if not exists cloth_dopes_cloth_idx on public.cloth_dopes(cloth_id, created_at desc);
alter table public.cloth_dopes enable row level security;
-- Table neuve : RLS sans politique, lue et écrite par fonction seulement.

-- Le nom d'une pièce vers son identifiant : la même tolérance que `reveal_cloth`
-- (avec ou sans le `0.`), pour que la page n'ait jamais à connaître l'epoch.
create function public._cloth_by_name(p_name text)
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
  select tc.id from public.totehm_clothes tc
   where tc.paid_at is not null
     and (lower(btrim(tc.name)) = lower(btrim(coalesce(p_name,'')))
          or (lower(btrim(coalesce(p_name,''))) !~ '^\d+\.'
              and lower(regexp_replace(btrim(tc.name), '^\d+\.', '')) = lower(btrim(coalesce(p_name,'')))))
   order by (lower(btrim(tc.name)) = lower(btrim(coalesce(p_name,'')))) desc, tc.paid_at desc
   limit 1;
$$;

-- DOPER, ou retirer son dope. Le compte revient toujours : la page n'a rien à calculer.
create function public.cloth_dope(p_name text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare v_me uuid := auth.uid(); v_id uuid; v_doped boolean;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'reason', 'signed_out'); end if;
  v_id := public._cloth_by_name(p_name);
  if v_id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if exists (select 1 from public.cloth_dopes d where d.cloth_id = v_id and d.user_id = v_me) then
    delete from public.cloth_dopes where cloth_id = v_id and user_id = v_me;
    v_doped := false;
  else
    insert into public.cloth_dopes(cloth_id, user_id) values (v_id, v_me)
      on conflict do nothing;
    v_doped := true;
  end if;
  return jsonb_build_object('ok', true, 'doped', v_doped,
    'count', (select count(*) from public.cloth_dopes d where d.cloth_id = v_id));
end $$;

-- QUI a dopé : un pseudo et un identifiant, pour aller s'abonner à ce membre. Un membre
-- sans pseudo n'est pas nommé — on ne montre jamais un identifiant seul.
create function public.cloth_dopers(p_name text, p_limit integer default 60)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare v_id uuid;
begin
  v_id := public._cloth_by_name(p_name);
  if v_id is null then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'dopers', coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'pseudo', p.pseudo) order by d.created_at desc)
      from public.cloth_dopes d
      join public.profiles p on p.id = d.user_id
     where d.cloth_id = v_id and nullif(btrim(coalesce(p.pseudo,'')),'') is not null
     limit greatest(1, least(p_limit, 200))
  ), '[]'::jsonb));
end $$;

-- LA PAGE. `reveal_cloth` dit déjà le gros ; on ajoute ce qui lui manque.
-- Le nom `decode_cloth` est PRIS par un décodeur figher.club sans rapport : d'où `cloth_page`.
create function public.cloth_page(p_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare v_me uuid := auth.uid(); v_base jsonb; v_id uuid;
        v_user uuid; v_style uuid; v_garment uuid; v_paid timestamptz; v_test boolean;
        v_rang integer; v_total integer; v_details text; v_owner_id uuid; v_shared boolean;
begin
  v_base := public.reveal_cloth(p_name);
  if coalesce((v_base->>'found')::boolean, false) is not true then return v_base; end if;
  v_id := public._cloth_by_name(p_name);
  if v_id is null then return v_base; end if;   -- une pièce de luxe : rien à ajouter

  select tc.user_id, tc.style_id, tc.garment_id, tc.paid_at, coalesce(tc.test,false)
    into v_user, v_style, v_garment, v_paid, v_test
    from public.totehm_clothes tc where tc.id = v_id;

  -- Le rang DANS LE STYLE : c'est la série qui compte, pas le vêtement.
  if v_style is not null and not v_test then
    select count(*) into v_rang from public.totehm_clothes c
     where c.style_id = v_style and c.paid_at is not null and not c.test
       and (c.paid_at < v_paid or (c.paid_at = v_paid and c.id <= v_id));
    select count(*) into v_total from public.totehm_clothes c
     where c.style_id = v_style and c.paid_at is not null and not c.test;
  end if;

  select s.details into v_details from public.totehm_cloth_support s where s.id = v_garment;

  -- Le totehmisateur n'est nommé que s'il se montre — la même règle que `reveal_cloth`.
  select exists (select 1 from public.totehms t where t.user_id = v_user
                  and t.totehm_visibility in ('subscribers','members')) into v_shared;
  if v_shared or v_user = v_me then v_owner_id := v_user; end if;

  return v_base
    || jsonb_build_object(
         'style_no', v_rang, 'style_of', v_total,
         'owner_id', v_owner_id,
         'garment_details', v_details,
         'dopes', (select count(*) from public.cloth_dopes d where d.cloth_id = v_id),
         'i_doped', v_me is not null and exists (
            select 1 from public.cloth_dopes d where d.cloth_id = v_id and d.user_id = v_me));
end $$;

revoke all on function public._cloth_by_name(text) from public, anon, authenticated;
revoke all on function public.cloth_dope(text) from public, anon;
revoke all on function public.cloth_dopers(text, integer) from public;
revoke all on function public.cloth_page(text) from public;
grant execute on function public.cloth_dope(text) to authenticated;
grant execute on function public.cloth_dopers(text, integer) to anon, authenticated;
grant execute on function public.cloth_page(text) to anon, authenticated;
