-- Higher my ChatGPT: additive consent and authorized ecosystem readers.
-- No existing policy, subscription, price or application RPC is replaced.
-- Only the connector's service client can execute these functions.
create table public.chatgpt_ecosystem_consents (
  grant_id uuid primary key references public.chatgpt_grants(id) on delete cascade,
  version integer not null check (version = 1),
  consented_at timestamptz not null default now()
);
alter table public.chatgpt_ecosystem_consents enable row level security;

-- Atomic extension of existing OAuth consent. Old grants retain owner-only access.
create function public.chatgpt_authorize_ecosystem(p_request uuid, p_user uuid, p_code_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare v_result jsonb;
begin
  v_result := public.chatgpt_authorize_request(p_request, p_user, p_code_hash);
  if coalesce((v_result->>'ok')::boolean,false) then
    insert into public.chatgpt_ecosystem_consents(grant_id, version)
      select c.grant_id, 1 from public.chatgpt_codes c
        join public.chatgpt_grants g on g.id = c.grant_id
       where c.code_hash = p_code_hash and c.request_id = p_request and g.user_id = p_user;
    if not found then raise exception 'Consent issuance failed'; end if;
  end if;
  return v_result;
end $f$;

create function public.chatgpt_read_ecosystem(
  p_grant uuid, p_action text, p_pseudo text default null,
  p_period text default 'now', p_filters jsonb default '{}'::jsonb,
  p_limit integer default 20, p_offset integer default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare
  v_uid uuid; v_owner uuid; v_result jsonb;
  v_sub text := current_setting('request.jwt.claim.sub',true);
  v_claims text := current_setting('request.jwt.claims',true);
  v_lim integer := greatest(1,least(coalesce(p_limit,20),40));
  v_off integer := greatest(0,least(coalesce(p_offset,0),10000));
begin
  select g.user_id into v_uid from public.chatgpt_grants g
    join public.chatgpt_ecosystem_consents c on c.grant_id = g.id and c.version = 1
   where g.id = p_grant and g.revoked_at is null;
  if v_uid is null then return jsonb_build_object('ok',false,'why','consent_required'); end if;
  if p_action is null or p_action not in ('members','member','media','spots')
     or length(coalesce(p_pseudo,'')) > 80
     or p_period is null or p_period not in ('now','past','future')
     or jsonb_typeof(coalesce(p_filters,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'why','invalid_request');
  end if;

  -- Reuse the exact application audience predicates with the consented identity.
  -- Session claims are transaction-local and explicitly restored before return.
  perform set_config('request.jwt.claim.sub',v_uid::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated')::text,true);
  if p_pseudo is not null then
    select id into v_owner from public.profiles
     where lower(pseudo) = lower(btrim(p_pseudo)) limit 1;
  end if;

  if p_action = 'members' then
    select jsonb_build_object('ok',true,'items',coalesce(jsonb_agg(x.item order by x.pseudo),'[]'::jsonb),
      'has_more', (select count(distinct cs.creator_id) > v_off + v_lim
        from public.creator_subscriptions cs join public.profiles p on p.id = cs.creator_id
        where cs.fan_id = v_uid and cs.status in ('active','trialing') and p.pseudo is not null),
      'next_offset',v_off + count(*))
      into v_result from (
        select p.pseudo, jsonb_build_object('pseudo',p.pseudo,
          'url','https://www.totehm.com/@' || p.pseudo) item
        from public.profiles p where p.pseudo is not null
          and public._subscriber_of(p.id,v_uid)
        order by p.pseudo limit v_lim offset v_off
      ) x;
  elsif p_action in ('member','media') then
    -- Knowing a name or a box reference never substitutes for an active subscription.
    if v_owner is null or not public._subscriber_of(v_owner,v_uid) then
      v_result := jsonb_build_object('ok',false,'why','unavailable');
    elsif p_action = 'member' then
      v_result := public.totehm_read(p_pseudo);
    else
      select jsonb_build_object('ok',true,'items',coalesce(jsonb_agg(jsonb_build_object(
        'id',m->'id','kind',m->'kind','ref',m->'ref','mime',m->'mime','created_at',m->'created_at')),'[]'::jsonb))
        into v_result from jsonb_array_elements(coalesce(public.member_media(p_pseudo)->'items','[]'::jsonb)) m;
    end if;
  else
    -- Same authorized discovery as the right-hand view: all members, not only subscriptions.
    -- Its own predicate excludes private/unentitled spots; this is not a global table scan.
    if p_pseudo is not null and v_owner is null then
      v_result := jsonb_build_object('ok',false,'why','unavailable');
    elsif p_pseudo is not null then
      v_result := public.club_spots_of(p_pseudo,p_period,p_filters,null,null,v_lim,v_off,null);
    else
      v_result := public.club_spots(p_period,p_filters,null,null,v_lim,v_off,null);
    end if;
  end if;
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return v_result;
end $f$;

revoke all on public.chatgpt_ecosystem_consents from public, anon, authenticated;
grant select, insert on public.chatgpt_ecosystem_consents to service_role;
revoke all on function public.chatgpt_authorize_ecosystem(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.chatgpt_read_ecosystem(uuid,text,text,text,jsonb,integer,integer) from public, anon, authenticated;
grant execute on function public.chatgpt_authorize_ecosystem(uuid,uuid,text) to service_role;
grant execute on function public.chatgpt_read_ecosystem(uuid,text,text,text,jsonb,integer,integer) to service_role;
