-- ══════════════════════════════════════════════════════════════════════════
-- 20260821_wisdom.sql — My Wisdom
--
-- book.html n'écrit plus des chapitres : il écrit des LEÇONS. Une leçon n'est
-- pas un chapitre (pas de titre, pas de corps, pas de date d'ouverture), et la
-- ranger dans book_chapters aurait pollué la table que lit l'autobiographiste.
--
-- ⚠️ DÉJÀ APPLIQUÉE EN PRODUCTION le 21/08/2026 via le MCP Supabase.
--    Ce fichier existe pour que le repo dise la vérité et que la migration
--    soit rejouable sur une branche. Il est idempotent : le relancer ne
--    casse rien.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.wisdom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 400),
  i text,                       -- id d'intention, optionnel : une leçon peut n'en porter aucune
  created_at timestamptz not null default now()
);

create index if not exists wisdom_user_created_idx on public.wisdom (user_id, created_at desc);

alter table public.wisdom enable row level security;

-- Une leçon n'appartient qu'à celui qui l'a écrite. Aucune lecture croisée,
-- même entre membres : My Wisdom n'est pas un mur public.
drop policy if exists wisdom_select_own on public.wisdom;
create policy wisdom_select_own on public.wisdom
  for select using (auth.uid() = user_id);

drop policy if exists wisdom_insert_own on public.wisdom;
create policy wisdom_insert_own on public.wisdom
  for insert with check (auth.uid() = user_id);

drop policy if exists wisdom_update_own on public.wisdom;
create policy wisdom_update_own on public.wisdom
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists wisdom_delete_own on public.wisdom;
create policy wisdom_delete_own on public.wisdom
  for delete using (auth.uid() = user_id);

-- « Delete my Totehm » doit effacer les leçons aussi. Sans cette ligne, une
-- table nouvelle survit à la suppression du compte — c'est exactement le
-- genre d'oubli qui rend la promesse d'effacement fausse.
CREATE OR REPLACE FUNCTION public.delete_my_totehm()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  n_book int; n_ev int; n_bot int; n_pref int;
  n_grind int; n_ment int; n_vibe int; n_tot int; n_spot int; n_wis int;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from book_chapters    where user_id = uid;  get diagnostics n_book  = row_count;
  delete from wisdom           where user_id = uid;  get diagnostics n_wis   = row_count;
  delete from totehm_events    where user_id = uid;  get diagnostics n_ev    = row_count;
  delete from bot_memory       where user_id = uid;  get diagnostics n_bot   = row_count;
  delete from higherself_prefs where user_id = uid;  get diagnostics n_pref  = row_count;
  delete from member_grind     where user_id = uid;  get diagnostics n_grind = row_count;
  delete from member_mentors   where user_id = uid;  get diagnostics n_ment  = row_count;
  delete from member_vibes     where user_id = uid;  get diagnostics n_vibe  = row_count;

  update spots set user_id = null where user_id = uid;  get diagnostics n_spot = row_count;

  -- totehms.user_id -> profiles(id) ON DELETE CASCADE : effacer le profil
  -- efface les habitudes. On compte avant, on ne supprime pas deux fois.
  select count(*) into n_tot from totehms where user_id = uid;
  delete from profiles where id = uid;

  return jsonb_build_object(
    'chapters', n_book, 'wisdom', n_wis, 'events', n_ev, 'bot_memory', n_bot,
    'prefs', n_pref, 'grind', n_grind, 'mentors', n_ment, 'vibes', n_vibe,
    'habits', n_tot, 'spots_unlinked', n_spot
  );
end $function$;
