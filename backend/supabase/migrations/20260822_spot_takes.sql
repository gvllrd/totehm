-- ══════════════════════════════════════════════════════════════════════════
-- 20260822_spot_takes.sql — « TAKE ME THERE », le compteur qui n'existait pas
--
-- La carte doit afficher combien de membres sont allés à un endroit.
-- `spots.member_count` ne le dit PAS : c'est une colonne figée, remplie à la
-- main sur 20 lignes sur 125 (max 50). Elle ne compte rien et n'est plus
-- affichée nulle part.
--
-- La clé est `ref` (texte), pas un uuid : `places_near` renvoie `ref`, qui
-- vaut l'uuid d'un spot OU le place_id Google d'un lieu. Une seule table
-- couvre les deux sources, aujourd'hui et quand PLACES_ENABLED repassera true.
--
-- ⚠️ DÉJÀ APPLIQUÉE EN PRODUCTION le 22/08/2026 via le MCP Supabase.
--    Ce fichier existe pour que le repo dise la vérité. Il est idempotent.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.spot_takes (
  ref        text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ref, user_id)
);

create index if not exists spot_takes_ref_idx on public.spot_takes (ref);

-- RLS activée SANS policy : aucun accès direct, ni lecture ni écriture.
-- Tout passe par les deux fonctions SECURITY DEFINER ci-dessous, qui prennent
-- leur identité dans auth.uid() et jamais dans un paramètre.
alter table public.spot_takes enable row level security;

-- Enregistre le geste et renvoie le total. La clé primaire (ref,user_id) rend
-- l'appel idempotent : appuyer dix fois compte pour un membre.
create or replace function public.take_me_there(p_ref text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_ref is null or length(p_ref) = 0 then
    raise exception 'ref required' using errcode = '22023';
  end if;
  insert into spot_takes(ref, user_id) values (p_ref, auth.uid())
    on conflict (ref, user_id) do nothing;
  select count(*) into n from spot_takes where ref = p_ref;
  return n;
end $function$;

-- Les totaux d'une liste, en UN appel. Le front en fait un par écran de spots,
-- jamais un par carte.
create or replace function public.spot_takes_count(p_refs text[])
returns table(ref text, takes bigint)
language sql
security definer
set search_path to 'public'
as $function$
  select s.ref, count(*)::bigint
  from spot_takes s
  where s.ref = any(p_refs)
  group by s.ref
$function$;

revoke all on function public.take_me_there(text) from public;
revoke all on function public.spot_takes_count(text[]) from public;
grant execute on function public.take_me_there(text) to authenticated;
grant execute on function public.spot_takes_count(text[]) to authenticated;
