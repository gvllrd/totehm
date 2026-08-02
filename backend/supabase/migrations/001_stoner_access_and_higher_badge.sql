-- ═══════════════════════════════════════════════════════════════════════
--  TOTEHM · SETUP SQL COMPLET
--  Projet : abujjbkbbiumxrokozph
--
--  APPLIQUÉ EN BASE le 31/07/2026 (migration stoner_access_and_higher_badge).
--  Ce fichier est la copie de référence pour ton repo.
--  Tout est idempotent : tu peux le relancer sans rien casser.
--
--  Ce que ça crée :
--    1. stoner_access   la liste de tes membres        <- le coeur
--    2. stoner_runs     le journal des runs Low/High
--    3. le bucket privé des vidéos
--    4. figher_count()  le compteur de places
--    5. my_badge()      le badge Higher + le numéro
--    6. set_entry_mode()
--    7. des vues de pilotage
-- ═══════════════════════════════════════════════════════════════════════


-- ═══ 1 · LA LISTE DES MEMBRES ═════════════════════════════════════════
--
-- La clé est l'EMAIL, pas un user_id. Pourquoi : le paiement arrive
-- avant le compte. Quelqu'un peut payer et créer sa session 3 jours
-- plus tard. Avec un user_id, on perdrait l'acheteur.
--
-- Trois sources possibles, une seule porte :
--   stripe = il a payé les 17 €
--   nft    = il détient le NFT (plus tard, rien à changer ici)
--   grant  = tu lui as donné l'accès à la main (galeries, marques, DJ)

create table if not exists public.stoner_access (
  email              text primary key,
  source             text not null check (source in ('stripe','nft','grant')),
  granted_at         timestamptz not null default now(),
  stripe_session_id  text unique,
  wallet_address     text,
  city               text,          -- null = international, 'lisbon' = cohorte physique
  note               text
);

alter table public.stoner_access enable row level security;
-- AUCUNE policy, volontairement. Seul le service_role (les Edge
-- Functions) touche cette table. Le navigateur ne la lit jamais.

create index if not exists stoner_access_source_idx on public.stoner_access (source);
create index if not exists stoner_access_granted_idx on public.stoner_access (granted_at);


-- ═══ 2 · LE JOURNAL DES RUNS ══════════════════════════════════════════
--
-- Low/High est un état INSTANTANÉ, redéclaré à chaque run.
-- Ce n'est donc pas une colonne figée sur le membre, c'est un journal.
--
-- C'est aussi la fondation de la couche communautaire :
-- "combien de Fighers sont venus ici, et dans quelle intention".

create table if not exists public.stoner_runs (
  id            bigserial primary key,
  email         text,
  mode          text not null check (mode in ('low','high')),
  started_at    timestamptz not null default now(),
  reached_step  int not null default 0,
  completed     boolean not null default false
);

alter table public.stoner_runs enable row level security;

create index if not exists stoner_runs_email_idx on public.stoner_runs (email, started_at desc);
create index if not exists stoner_runs_mode_idx  on public.stoner_runs (mode, started_at desc);


-- ═══ 3 · LE BUCKET PRIVÉ ══════════════════════════════════════════════
--
-- Si tu l'as déjà créé à la main dans l'interface, cette ligne ne fait
-- rien. Le "false" est le point important : le bucket n'est PAS public.

insert into storage.buckets (id, name, public)
values ('stoner-deep', 'stoner-deep', false)
on conflict (id) do nothing;

-- Aucune policy storage non plus. Seul le service_role signe les URLs,
-- pour 15 minutes, et uniquement pour quelqu'un qui a payé.


-- ═══ 4 · LE COMPTEUR DE PLACES ════════════════════════════════════════
--
-- Pourquoi une fonction et pas une lecture de table : stoner_access
-- contient les emails de tes clients. Ouvrir la table en lecture
-- publique exposerait la liste entière. La fonction ne renvoie
-- QU'UN NOMBRE. Rien d'autre ne peut sortir.

create or replace function public.figher_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from public.stoner_access;
$$;

revoke all on function public.figher_count() from public;
grant execute on function public.figher_count() to anon, authenticated;
-- "anon" = les visiteurs non connectés. Il faut bien que le mur
-- affiche le compteur AVANT que la personne ait un compte.


-- ═══ 5 · LE NUMÉRO DE PLACE ═══════════════════════════════════════════
--
-- Figher #001 -> #777, dans l'ordre d'arrivée.
-- Ça ne coûte rien à produire et c'est le vrai objet de statut :
-- ça dit "j'étais là avant", et personne ne peut l'acheter plus tard.

create or replace function public.my_figher_number()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select rank::int from (
    select email, row_number() over (order by granted_at) as rank
    from public.stoner_access
  ) t
  where t.email = lower(auth.jwt() ->> 'email');
$$;

revoke all on function public.my_figher_number() from public;
grant execute on function public.my_figher_number() to authenticated;


-- ═══ 6 · LE BADGE HIGHER ══════════════════════════════════════════════
--
-- Higher n'est pas un 4e abonnement. C'est un PRÉFIXE devant celui
-- que la personne a déjà :   Seed -> Higher Seed
--                            Plant -> Higher Plant
--                            Tree -> Higher Tree
--
-- Le tier vient de public.subscriptions (clé = user_id -> auth.users.id).
-- Il n'y a PAS de table public.users dans ce projet : c'est la
-- correction faite après inspection du schéma réel.
-- On ne compte que les abonnements actifs ou en essai.

create or replace function public.my_badge()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid    := auth.uid();
  v_email  text    := lower(auth.jwt() ->> 'email');
  v_tier   text    := 'seed';
  v_higher boolean := false;
  v_num    int;
begin
  if v_email is null then
    return jsonb_build_object('higher', false, 'tier', 'seed', 'label', 'Seed', 'number', null);
  end if;

  select exists(select 1 from public.stoner_access where email = v_email)
    into v_higher;

  select s.tier into v_tier
  from public.subscriptions s
  where s.user_id = v_uid
    and coalesce(s.status, 'active') in ('active','trialing')
  limit 1;

  v_tier := coalesce(v_tier, 'seed');

  if v_higher then
    select rank::int into v_num from (
      select email, row_number() over (order by granted_at) as rank
      from public.stoner_access
    ) t where t.email = v_email;
  end if;

  return jsonb_build_object(
    'higher', v_higher,
    'tier',   v_tier,
    'number', v_num,
    'label',  case when v_higher then 'Higher ' else '' end || initcap(v_tier)
  );
end;
$$;

revoke all on function public.my_badge() from public;
grant execute on function public.my_badge() to authenticated;


-- ═══ 7 · ENREGISTRER LE MODE D'ENTRÉE ═════════════════════════════════
--
-- Pourquoi une fonction et pas une policy INSERT : une policy RLS ne
-- sait pas restreindre les COLONNES. Ouvrir la table au client le
-- laisserait aussi écrire reached_step et completed.
-- La fonction lit l'email dans le JWT, jamais dans ce que le client
-- envoie. Il ne peut donc pas écrire de ligne au nom de quelqu'un d'autre.

create or replace function public.set_entry_mode(p_mode text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_id    bigint;
begin
  if v_email is null then
    raise exception 'no session';
  end if;
  if p_mode not in ('low','high') then
    raise exception 'mode invalide: %', p_mode;
  end if;

  insert into public.stoner_runs (email, mode)
  values (v_email, p_mode)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.set_entry_mode(text) from public;
grant execute on function public.set_entry_mode(text) to authenticated;

-- Supabase accorde par défaut l'exécution à "anon" sur toute nouvelle
-- fonction. Ces trois-là ne doivent PAS être appelables sans session.
revoke execute on function public.my_badge()           from anon;
revoke execute on function public.set_entry_mode(text) from anon;
revoke execute on function public.my_figher_number()   from anon;


-- ═══ 8 · TES TABLEAUX DE BORD ═════════════════════════════════════════
--
-- Les deux seules vues dont tu as besoin en phase 1.

-- Où en est la cohorte des 777 ?
create or replace view public.figher_cohort as
select
  count(*)                                      as members,
  777 - count(*)                                as places_left,
  count(*) filter (where source = 'stripe')     as paid,
  count(*) filter (where source = 'grant')      as gifted,
  count(*) filter (where source = 'nft')        as nft,
  count(*) filter (where city = 'lisbon')       as lisbon,
  min(granted_at)                               as first_member,
  max(granted_at)                               as last_member
from public.stoner_access;

-- Qui arrive Low, qui arrive High ?
create or replace view public.runs_by_mode as
select
  mode,
  count(*)                                   as runs,
  count(distinct email)                      as people,
  round(avg(reached_step), 1)                as avg_step,
  count(*) filter (where completed)          as completed
from public.stoner_runs
group by mode;


-- ═══════════════════════════════════════════════════════════════════════
--  VÉRIFICATION — lance ces 4 lignes après le Run ci-dessus
-- ═══════════════════════════════════════════════════════════════════════
--
-- select * from public.figher_cohort;        -- doit afficher 0 / 777
-- select public.figher_count();              -- doit afficher 0
-- select * from storage.buckets where id = 'stoner-deep';   -- public = false
-- select routine_name from information_schema.routines
--   where routine_schema = 'public'
--     and routine_name in ('figher_count','my_badge','set_entry_mode','my_figher_number');
--   -- doit lister les 4


-- ═══════════════════════════════════════════════════════════════════════
--  TES COMMANDES DU QUOTIDIEN — à garder sous la main
-- ═══════════════════════════════════════════════════════════════════════

-- Donner l'accès à la main (galerie, marque, DJ, toi-même pour tester)
--   insert into public.stoner_access (email, source, city, note)
--   values ('contact@galerie-x.pt', 'grant', 'lisbon', 'Partenariat juillet 2026')
--   on conflict (email) do nothing;

-- Retirer un accès
--   delete from public.stoner_access where email = 'x@y.com';

-- Voir les 20 derniers arrivés, avec leur numéro de place
--   select row_number() over (order by granted_at) as num, email, source, city, granted_at
--   from public.stoner_access order by granted_at desc limit 20;

-- Le chiffre qui compte vraiment : combien est rentré
--   select count(*) as ventes, count(*) * 17 as brut_eur
--   from public.stoner_access where source = 'stripe';
