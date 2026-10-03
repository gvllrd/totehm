-- SPACE · 03/10/2026 (ter) — une PHOTO peut porter un space ; le WHY · TRIGGER
-- d'une Habit Box se montre sur un space SHARED, seulement si son auteur le choisit.
-- Additif : une colonne, trois `create or replace`, une fonction neuve, le seau
-- `moments` accepte image/jpeg. Aucun drop, aucune réécriture de données.
--
-- Photo : chemin Storage `<uid>/<uuid>.jpg` dans la même colonne `spot_plans.video`
-- (le média du space) — `spot_create` et `spot_video_attach` passent par
-- `_space_video_owned` → `_clip_ok`, qui accepte désormais `.jpg`. Jamais Bunny.
-- WHY · TRIGGER : les TEXTES des objectifs et répulsions figés dans le snapshot
-- du space, rendus par `_spot_view` sous `why` quand `show_why` et SHARED.
-- Rien d'autre du Totehm ne sort ; le contexte complet reste au propriétaire.

alter table public.spot_plans add column if not exists show_why boolean not null default false;

create or replace function public._clip_ok(p_user uuid, p_path text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select p_path is not null and p_user is not null
     and p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|mp4|mov|jpg)$'
     and split_part(p_path, '/', 1) = p_user::text
     and exists (select 1 from storage.objects o
                  where o.bucket_id = 'moments' and o.name = p_path
                    and (o.owner = p_user or o.owner_id = p_user::text));
$function$;

create or replace function public._spot_view(p spot_plans, p_viewer uuid)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'id', p.spot_id,
    'habit', p.habit,
    'intentions', to_jsonb(p.intentions),
    'freq', p.snapshot->>'freq',
    'visibility', p.visibility,
    'mode', case when p.visibility = 'shared' and p.shield='on' then p.mode end,
    'location', case when p.visibility = 'shared' then p.shield end,
    'city', p.city,
    'comment', p.comment,
    'starts_at', p.starts_at,
    'ends_at', p.starts_at + make_interval(mins => p.duration_min),
    'duration_min', p.duration_min,
    'state', case when p.starts_at > now() then 'will' when now() < p.starts_at + make_interval(mins => p.duration_min) then 'am' else 'was' end,
    'creator', (select pr.pseudo from public.profiles pr where pr.id = p.user_id),
    'mine', p.user_id = p_viewer,
    'video', p.video,
    'clip', case when p.video_id is not null then (select jsonb_build_object('id',v.id,'status',v.status) from public.videos v where v.id=p.video_id) end,
    'context', case when p.user_id = p_viewer then p.snapshot - 'at' end,
    'show_why', case when p.user_id = p_viewer then p.show_why end,
    'why', case when p.visibility = 'shared' and p.show_why then jsonb_build_object(
        'objectives', (select coalesce(jsonb_agg(jsonb_build_object('text', o->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'objectives', '[]'::jsonb)) o where btrim(coalesce(o->>'text','')) <> ''),
        'repulsions', (select coalesce(jsonb_agg(jsonb_build_object('text', r->>'text')), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(p.snapshot->'repulsions', '[]'::jsonb)) r where btrim(coalesce(r->>'text','')) <> '')) end,
    'exact', case when public._spot_exact(p.user_id, p_viewer, p.visibility, p.shield)
                  then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'place', p.place) end);
$function$;

-- Le propriétaire montre (ou cache) le WHY · TRIGGER de SON space, à tout moment.
create or replace function public.spot_why_set(p_spot uuid, p_show boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_snap jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  select snapshot into v_snap from public.spot_plans where spot_id = p_spot and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_mine'); end if;
  if coalesce(p_show, false) and jsonb_array_length(coalesce(v_snap->'objectives','[]'::jsonb)) = 0
     and jsonb_array_length(coalesce(v_snap->'repulsions','[]'::jsonb)) = 0 then
    return jsonb_build_object('ok', false, 'why', 'empty');
  end if;
  update public.spot_plans set show_why = coalesce(p_show, false) where spot_id = p_spot and user_id = v_uid;
  return jsonb_build_object('ok', true, 'show_why', coalesce(p_show, false));
end $function$;

update storage.buckets set allowed_mime_types = array['video/webm','video/mp4','video/quicktime','image/jpeg']
 where id = 'moments';

revoke all on function public._clip_ok(uuid, text) from public, anon, authenticated;
grant execute on function public._clip_ok(uuid, text) to service_role;
revoke all on function public._spot_view(spot_plans, uuid) from public, anon, authenticated;
grant execute on function public._spot_view(spot_plans, uuid) to service_role;
revoke all on function public.spot_why_set(uuid, boolean) from public, anon;
grant execute on function public.spot_why_set(uuid, boolean) to authenticated, service_role;
