-- ─────────────────────────────────────────────────────────────────────
-- LE TROU QUE LA LIAISON TELEGRAM REND CRITIQUE
--
-- La policy `profiles read all` a pour qual `true` : tout membre connecté
-- lit TOUTES les lignes de profiles, colonne telegram_id comprise. Et le
-- rôle `authenticated` a le GRANT UPDATE sur cette colonne, que la policy
-- `profiles update own` autorise sur sa propre ligne.
--
-- Conséquence : n'importe quel membre pouvait lire le telegram_id d'un
-- autre, puis se l'attribuer — et recevoir à sa place les questions
-- quotidiennes du bot. Les codes à usage unique de bot_link_codes ne
-- servent à rien tant que la colonne qu'ils protègent est écrivable
-- directement.
--
-- ⚠️ CES TROIS REVOKE NE FONT RIEN, ET C'EST LA LEÇON :
--    on ne retire pas une colonne d'un GRANT posé au niveau TABLE.
--    PostgreSQL accepte la commande, émet un WARNING, ne change rien.
--    La migration suivante corrige. On garde celle-ci telle quelle :
--    l'historique doit refléter ce qui a été appliqué.
-- ─────────────────────────────────────────────────────────────────────

revoke update (telegram_id) on public.profiles from authenticated, anon;
revoke insert (telegram_id) on public.profiles from authenticated, anon;
revoke select (telegram_id) on public.profiles from authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────
-- Le membre n'a pas besoin de son telegram_id. Il a besoin de savoir
-- s'il est lié, pour que le bouton dise « Connect » ou « Connected ».
-- Un booléen, sur SA ligne, rien d'autre.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.bot_linked()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and telegram_id is not null
  );
$$;

-- L'ordre compte : `create or replace` rend le GRANT à PUBLIC.
-- Le revoke vient APRÈS le dernier create, jamais avant.
revoke execute on function public.bot_linked() from public, anon;
grant  execute on function public.bot_linked() to authenticated;
