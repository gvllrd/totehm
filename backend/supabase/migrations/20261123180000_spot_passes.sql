-- [COM]+[CLUB] 23/11/2026 (Wah) : « pour que le membre puisse cut off facilement, il faut créer à chaque fois un pass
-- invitation automatique au spot pour vérification, et qu'un membre puisse [Cut off] la personne ».
-- Un abonné qui regarde le spot d'un créateur reçoit SON pass (créé au premier regard, un par spot et par abonné) :
-- son nom TOTEHM et un code court à montrer sur place. Le créateur voit les passes de SON spot, vérifie un code,
-- et coupe d'un geste (`creator-cut-off` : l'abonnement s'arrête, le pass ne se vérifie plus). Aucun lien vers auth.users.

create table public.spot_passes (
  id bigint generated always as identity primary key,
  spot_id uuid not null references public.spot_plans(spot_id) on delete cascade,
  creator_id uuid not null,
  fan_id uuid not null,
  code text not null check (code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now(),
  unique (spot_id, fan_id),
  unique (spot_id, code)
);
comment on table public.spot_passes is '[COM]+[CLUB] le pass d''invitation d''un abonné à un spot de son créateur : vérification sur place, et [Cut off]';
alter table public.spot_passes enable row level security;
create index spot_passes_creator on public.spot_passes (creator_id, spot_id);

-- l'abonné : MON pass pour ce spot (créé au premier regard)
create or replace function public.spot_pass_mine(p_spot uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare u uuid := auth.uid(); s public.spot_plans%rowtype; c text; n int := 0;
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select * into s from public.spot_plans where spot_id = p_spot;
  if not found then return jsonb_build_object('ok', false, 'why', 'nobody'); end if;
  if s.user_id = u then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  if exists (select 1 from public.creator_bans b where b.creator_id = s.user_id and b.fan_id = u) then
    return jsonb_build_object('ok', false, 'why', 'banned'); end if;
  if not public._subscriber_of(s.user_id, u) then return jsonb_build_object('ok', false, 'why', 'not_subscriber'); end if;
  select code into c from public.spot_passes where spot_id = p_spot and fan_id = u;
  while c is null and n < 8 loop
    n := n + 1;
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    begin
      insert into public.spot_passes (spot_id, creator_id, fan_id, code) values (p_spot, s.user_id, u, c);
    exception when unique_violation then
      c := (select code from public.spot_passes where spot_id = p_spot and fan_id = u);
    end;
  end loop;
  return jsonb_build_object('ok', true, 'code', c,
    'pseudo', (select pseudo from public.profiles where id = u),
    'creator', (select pseudo from public.profiles where id = s.user_id),
    'habit', s.habit, 'starts_at', s.starts_at, 'duration_min', s.duration_min);
end $function$;

-- le créateur : les passes de MON spot (les abonnés coupés n'y sont plus)
create or replace function public.spot_passes_for(p_spot uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare u uuid := auth.uid();
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not exists (select 1 from public.spot_plans where spot_id = p_spot and user_id = u) then
    return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('pseudo', pr.pseudo, 'code', p.code, 'at', p.created_at) order by p.created_at)
      from public.spot_passes p join public.profiles pr on pr.id = p.fan_id
     where p.spot_id = p_spot and public._subscriber_of(u, p.fan_id)), '[]'::jsonb));
end $function$;

-- le créateur, sur place : ce code est-il valide pour MON spot ?
create or replace function public.spot_pass_check(p_spot uuid, p_code text)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare u uuid := auth.uid(); f uuid;
begin
  if u is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if not exists (select 1 from public.spot_plans where spot_id = p_spot and user_id = u) then
    return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  select fan_id into f from public.spot_passes where spot_id = p_spot and code = upper(btrim(coalesce(p_code, '')));
  if f is null then return jsonb_build_object('ok', false, 'why', 'unknown'); end if;
  if not public._subscriber_of(u, f) then return jsonb_build_object('ok', false, 'why', 'cut_off'); end if;
  return jsonb_build_object('ok', true, 'pseudo', (select pseudo from public.profiles where id = f));
end $function$;

revoke all on function public.spot_pass_mine(uuid) from public, anon;
revoke all on function public.spot_passes_for(uuid) from public, anon;
revoke all on function public.spot_pass_check(uuid, text) from public, anon;
grant execute on function public.spot_pass_mine(uuid) to authenticated;
grant execute on function public.spot_passes_for(uuid) to authenticated;
grant execute on function public.spot_pass_check(uuid, text) to authenticated;
revoke all on table public.spot_passes from anon, authenticated;
