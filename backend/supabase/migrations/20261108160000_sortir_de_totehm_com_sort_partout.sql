-- ══ SORTIR DE TOTEHM.COM SORT DE PARTOUT · 08/11/2026 ═══════════════════════════════════════════
-- Wah, 08/11 : « je ne peux pas me déconnecter d'un compte sur un domaine quand je me déconnecte
-- de totehm.com. C'est problématique. » Mesuré dans le code : `com/totehm.html` sortait en
-- `scope:'global'` (les jetons de rafraîchissement sont révoqués, mais le satellite garde un jeton
-- d'ACCÈS valide jusqu'à une heure), et quatre autres pages de com sortaient en `scope:'local'`,
-- qui ne révoque RIEN — le satellite restait connecté indéfiniment.
--
-- La console centrale pose désormais un NUMÉRO DE SORTIE. Chaque satellite retient celui qu'il
-- avait en entrant, le relit au démarrage et à chaque retour d'onglet : plus grand = la console a
-- fermé, il sort. Une lecture SQL, zéro centime, et la décision vit sur le SERVEUR.
-- ⚠️ AUCUNE clé étrangère vers `auth.users` : on ne pose pas de verrou sur une base en service.
create table if not exists public.auth_epochs (
  user_id   uuid primary key,
  epoch     integer not null default 1,
  bumped_at timestamptz not null default now()
);
alter table public.auth_epochs enable row level security;
comment on table public.auth_epochs is
  '[COM+CLUB+BOUTIQUE+SPACE] le numéro de sortie d''un membre : totehm.com l''incrémente en se déconnectant, les satellites le relisent et sortent. Lue et écrite par fonction seulement.';

-- Le numéro courant. 0 = pas de session : le satellite ne fait rien.
create or replace function public.sso_epoch()
returns integer language sql stable security definer set search_path to '' as $f$
  select case when auth.uid() is null then 0
              else coalesce((select e.epoch from public.auth_epochs e where e.user_id = auth.uid()), 1) end;
$f$;

-- SORTIR DE PARTOUT : appelée par totehm.com AVANT `signOut({scope:'global'})`.
create or replace function public.sso_revoke_everywhere()
returns integer language plpgsql security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_n integer;
begin
  if v_uid is null then return 0; end if;
  insert into public.auth_epochs(user_id, epoch, bumped_at) values (v_uid, 2, now())
  on conflict (user_id) do update
    set epoch = public.auth_epochs.epoch + 1, bumped_at = now()
  returning epoch into v_n;
  return v_n;
end $f$;

revoke all on function public.sso_epoch() from public, anon;
revoke all on function public.sso_revoke_everywhere() from public, anon;
grant execute on function public.sso_epoch() to authenticated;
grant execute on function public.sso_revoke_everywhere() to authenticated;
