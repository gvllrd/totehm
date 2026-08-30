-- ══ LES SPOTS POSÉS PAR LES MEMBRES, PAR TELEGRAM ══
--
-- Trois choses, dans cet ordre : la liaison qui manquait, l'état d'une
-- conversation en cours, et le verrou d'écriture qui devient urgent le jour
-- où quelqu'un publie pour de vrai.

-- ─────────────────────────────────────────────────────────────────────────
-- 1 · LA LIAISON — un code à usage unique, dix minutes
--
-- `bot-reply` disait déjà « lie ton compte sur totehm.space ». Cette liaison
-- n'existait nulle part : 0 profil sur 3 avec un telegram_id, et tout le
-- produit Telegram injoignable depuis le premier jour.
--
-- Pourquoi une table et pas un jeton signé dans le lien `?start=` : un jeton
-- signé reste rejouable jusqu'à son expiration. Si quelqu'un intercepte le
-- lien, il branche SON Telegram sur TON Totehm — il reçoit tes rappels et
-- répond à ta place. Usage unique en base, ce risque disparaît.
create table if not exists public.bot_link_codes (
  code       text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);
create index if not exists bot_link_codes_user_idx on public.bot_link_codes(user_id);
alter table public.bot_link_codes enable row level security;
comment on table public.bot_link_codes is
  'Code de liaison Telegram, usage unique, 10 minutes. Lu et consomme par
   bot-reply (service_role). Aucune policy : le client ne le lit jamais.';

-- Le client ne choisit pas son code — il le demande.
create or replace function public.new_bot_link_code()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- Un seul code vivant par membre : demander un nouveau code annule le précédent.
  delete from public.bot_link_codes where user_id = auth.uid();
  v_code := encode(gen_random_bytes(12), 'base64');
  v_code := replace(replace(replace(v_code,'+','-'),'/','_'),'=','');
  insert into public.bot_link_codes(code, user_id) values (v_code, auth.uid());
  return v_code;
end $$;

-- ⚠️ LA LEÇON DE L'AUDIT DU 28/08 : `create or replace function` rétablit le
-- GRANT à PUBLIC. Le revoke se pose APRÈS le create, jamais avant.
revoke all on function public.new_bot_link_code() from public, anon;
grant execute on function public.new_bot_link_code() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2 · LE BROUILLON — l'état d'une conversation à plusieurs temps
--
-- `bot-reply` déduisait son état du dernier `habit_outcomes` : élégant pour
-- deux taps, insuffisant pour cinq étapes. Une ligne par membre, écrasée à
-- chaque pas, effacée à la fin. Rien ne survit à un abandon.
create table if not exists public.bot_drafts (
  telegram_id bigint primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null default 'spot',
  step        text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.bot_drafts enable row level security;
comment on table public.bot_drafts is
  'Conversation Telegram en cours (creation de spot). Ecrite par bot-reply
   avec le service_role. Aucune policy : jamais lue par un client.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3 · LE VERROU D'ÉCRITURE SUR `spots`
--
-- MESURÉ LE 28/08/2026 : la policy d'insertion n'avait pour seul controle
-- que `auth.role() = 'authenticated'`. N'importe quel membre connecte
-- pouvait inserer un spot AU NOM D'UN AUTRE, public, avec le role de son
-- choix. Theorique tant que personne ne publiait ; plus du tout a partir de
-- ce lot.
drop policy if exists "members insert spots" on public.spots;
create policy "members insert own spots" on public.spots
  for insert to authenticated
  with check (auth.uid() = user_id and user_id is not null);

comment on policy "members insert own spots" on public.spots is
  'Un membre ne peut inserer QUE sous son propre user_id. Le bot ecrit avec
   le service_role et pose le user_id depuis profiles.telegram_id, jamais
   depuis le message.';
