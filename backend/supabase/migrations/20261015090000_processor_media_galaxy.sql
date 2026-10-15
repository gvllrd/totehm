-- 15/10/2026 — LOT « PROCESSEUR » (Wah : le TOTEHM est le processeur personnel ; la galaxie des autres ; la capture
-- et l'import DANS le Totehm, depuis l'élément). Additif et non destructif (une instruction destructive demande une
-- approbation que le cloud ne peut pas donner : le retrait d'un fichier est un MARQUAGE, jamais un effacement de ligne).
--
-- 1. `element-media` : un seau PRIVÉ, un dossier par membre (`<uid>/m-<uuid>.<ext>`), 50 Mo au plus, images · vidéos ·
--    PDF · audio · texte. UNE politique « for all » : lire, écrire, retirer dans SON dossier seulement (rien n'est publié).
-- 2. `element_media` : ce qui est rattaché à un élément de MON Totehm (kind h · o · r · w · v ; ref = le TEXTE d'une
--    Habit — la clé de `habit_rename_links` —, l'id sinon). RLS sans politique : lu et écrit par fonction. Détacher =
--    `removed_at` (la ligne reste, le fichier part) : la page retire le fichier avec le chemin rendu.
-- 3. `totehm_galaxy` : les Totehms présentables (la règle de `totehm_search` : nommés, non privés), sans moi — des
--    NOMS et l'offre, jamais un contenu.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('element-media', 'element-media', false, 52428800,
        array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime',
              'application/pdf','audio/mpeg','audio/mp4','audio/webm','audio/ogg','text/plain'])
on conflict (id) do nothing;

create policy "element-media own folder" on storage.objects for all to authenticated
  using (bucket_id = 'element-media' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'element-media' and (storage.foldername(name))[1] = (auth.uid())::text);

create table if not exists public.element_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('h','o','r','w','v')),
  ref text not null check (length(btrim(ref)) between 1 and 400),
  path text not null unique check (path ~ '^[0-9a-f-]{36}/m-[0-9a-f-]{36}\.[a-z0-9]{2,5}$'),
  mime text not null check (length(mime) between 3 and 100),
  bytes bigint not null check (bytes > 0 and bytes <= 52428800),
  name text check (name is null or length(name) <= 160),
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
alter table public.element_media enable row level security;
create index if not exists element_media_owner on public.element_media (user_id, kind, ref, created_at desc) where removed_at is null;

-- L'élément est-il À MOI ? (service_role seul : appelé par les écrivains ci-dessous.)
create or replace function public._element_ok(p_user uuid, p_kind text, p_ref text)
returns boolean language sql stable security definer set search_path to '' as $f$
  select case p_kind
    when 'h' then exists (select 1 from public.totehms t,
                            jsonb_array_elements(case when jsonb_typeof(t.steps) = 'array' then t.steps else '[]'::jsonb end) s
                           where t.user_id = p_user and btrim(coalesce(s->>'t', '')) = btrim(coalesce(p_ref, '')) and btrim(coalesce(p_ref, '')) <> '')
    when 'o' then exists (select 1 from public.objectives x where x.user_id = p_user and x.id::text = p_ref)
    when 'r' then exists (select 1 from public.repulsions x where x.user_id = p_user and x.id::text = p_ref)
    when 'w' then exists (select 1 from public.wisdom x where x.user_id = p_user and x.id::text = p_ref)
    when 'v' then exists (select 1 from public.visions x where x.user_id = p_user and x.id::text = p_ref)
    else false end;
$f$;

-- Rattacher un fichier DÉJÀ déposé dans MON dossier à un de MES éléments. La taille et le type viennent du stockage.
create or replace function public.element_media_add(p_kind text, p_ref text, p_path text, p_mime text default null,
                                                    p_bytes bigint default null, p_name text default null)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_obj record; v_mime text; v_bytes bigint; v_id uuid; v_n int;
        v_ok text[] := array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime',
                             'application/pdf','audio/mpeg','audio/mp4','audio/webm','audio/ogg','text/plain'];
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_kind is null or p_kind not in ('h','o','r','w','v') then return jsonb_build_object('ok', false, 'why', 'kind'); end if;
  if p_path is null or split_part(p_path, '/', 1) <> v_me::text or p_path !~ '^[0-9a-f-]{36}/m-[0-9a-f-]{36}\.[a-z0-9]{2,5}$' then
    return jsonb_build_object('ok', false, 'why', 'path');
  end if;
  if not public._element_ok(v_me, p_kind, p_ref) then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  select o.metadata, o.owner, o.owner_id into v_obj from storage.objects o where o.bucket_id = 'element-media' and o.name = p_path;
  if not found or coalesce(v_obj.owner_id, v_obj.owner::text, '') <> v_me::text then return jsonb_build_object('ok', false, 'why', 'file'); end if;
  v_mime := lower(coalesce(nullif(v_obj.metadata->>'mimetype', ''), p_mime, ''));
  v_bytes := coalesce(nullif(v_obj.metadata->>'size', '')::bigint, p_bytes, 0);
  if not (v_mime = any(v_ok)) then return jsonb_build_object('ok', false, 'why', 'type'); end if;
  if v_bytes <= 0 or v_bytes > 52428800 then return jsonb_build_object('ok', false, 'why', 'size'); end if;
  select count(*) into v_n from public.element_media m where m.user_id = v_me and m.removed_at is null;
  if v_n >= 2000 then return jsonb_build_object('ok', false, 'why', 'full'); end if;
  insert into public.element_media (user_id, kind, ref, path, mime, bytes, name)
  values (v_me, p_kind, btrim(p_ref), p_path, v_mime, v_bytes, nullif(left(btrim(coalesce(p_name, '')), 160), ''))
  on conflict (path) do nothing
  returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'why', 'exists'); end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'mime', v_mime, 'bytes', v_bytes);
end $f$;

-- Mes fichiers, pour un élément ou pour tout mon Totehm (la vue shorts, les fichiers d'une boîte).
create or replace function public.element_media_list(p_kind text default null, p_ref text default null)
returns jsonb language sql stable security definer set search_path to '' as $f$
  select case when auth.uid() is null then jsonb_build_object('ok', false, 'why', 'signin') else
    jsonb_build_object('ok', true, 'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'ref', m.ref, 'path', m.path, 'mime', m.mime,
                                          'bytes', m.bytes, 'name', m.name, 'created_at', m.created_at)
                       order by m.created_at desc)
        from (select * from public.element_media x
               where x.user_id = auth.uid() and x.removed_at is null
                 and (p_kind is null or x.kind = p_kind)
                 and (p_ref is null or x.ref = btrim(p_ref))
               order by x.created_at desc limit 600) m), '[]'::jsonb)) end;
$f$;

-- Détacher : la ligne est marquée, le chemin rendu (la page retire le fichier de SON dossier).
create or replace function public.element_media_remove(p_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_path text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  update public.element_media m set removed_at = now()
   where m.id = p_id and m.user_id = v_me and m.removed_at is null
   returning m.path into v_path;
  if v_path is null then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  return jsonb_build_object('ok', true, 'path', v_path);
end $f$;

-- Une Habit renommée garde ses fichiers : la page l'appelle avec `habit_rename_links` (même clé, son texte).
create or replace function public.element_media_rekey(p_old text, p_new text)
returns integer language plpgsql security definer set search_path to '' as $f$
declare v_me uuid := auth.uid(); v_n integer := 0;
begin
  if v_me is null or p_old is null or p_new is null or btrim(p_new) = '' or btrim(p_old) = btrim(p_new) then return 0; end if;
  update public.element_media m set ref = btrim(p_new)
   where m.user_id = v_me and m.kind = 'h' and m.ref = btrim(p_old) and m.removed_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $f$;

-- La galaxie : les Totehms qu'on peut me présenter (règle de `totehm_search`), sans moi, les plus vivants d'abord.
create or replace function public.totehm_galaxy(p_limit integer default 160)
returns jsonb language sql stable security definer set search_path to '' as $f$
  select jsonb_build_object('ok', true, 'totehms', coalesce(jsonb_agg(g.item order by g.u desc nulls last, g.pseudo), '[]'::jsonb))
    from (select p.pseudo, t.updated_at as u,
                 jsonb_build_object('pseudo', p.pseudo, 'offer', public._offer_open(p.id),
                                    'price_cents', case when public._offer_open(p.id) then cp.custom_sub_price end,
                                    'currency', coalesce(cp.currency, 'eur'),
                                    'subscribed', coalesce(public._subscriber_of(p.id, auth.uid()), false)) as item
            from public.profiles p
            join public.totehms t on t.user_id = p.id
            left join public.creator_profiles cp on cp.user_id = p.id
           where t.totehm_visibility in ('subscribers','members') and p.pseudo is not null
             and p.id is distinct from auth.uid()
           order by t.updated_at desc nulls last
           limit greatest(1, least(coalesce(p_limit, 160), 400))) g;
$f$;

revoke all on function public._element_ok(uuid, text, text) from public, anon, authenticated;
grant execute on function public._element_ok(uuid, text, text) to service_role;
revoke all on function public.element_media_add(text, text, text, text, bigint, text) from public, anon;
grant execute on function public.element_media_add(text, text, text, text, bigint, text) to authenticated, service_role;
revoke all on function public.element_media_list(text, text) from public, anon;
grant execute on function public.element_media_list(text, text) to authenticated, service_role;
revoke all on function public.element_media_remove(uuid) from public, anon;
grant execute on function public.element_media_remove(uuid) to authenticated, service_role;
revoke all on function public.element_media_rekey(text, text) from public, anon;
grant execute on function public.element_media_rekey(text, text) to authenticated, service_role;
revoke all on function public.totehm_galaxy(integer) from public;
grant execute on function public.totehm_galaxy(integer) to anon, authenticated, service_role;
