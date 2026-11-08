-- CHAQUE TABLE DIT SON DOMAINE — Wah, 08/11/2026 : « préciser à chaque fois de quel aspect de la
-- marque il s'agit ». Pas de renommage (92 tables, 506 fonctions, 65 politiques) : le domaine est
-- écrit en commentaire, entre crochets et en tête. Ce test REFUSE une table neuve sans domaine.
-- Attendu : « DOMAINES · FAIL={} ». N'écrit rien.
DO $t$
declare
  fails text[] := '{}';
  v_muettes text; v_inconnus text; v_n int; v_trancher int;
  VALIDES text[] := array['COM','CLUB','BOUTIQUE','SPACE','À TRANCHER'];
begin
  -- 1 · aucune table de `public` sans domaine en tête de son commentaire
  select string_agg(c.relname, ', ' order by c.relname) into v_muettes
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and substring(coalesce(obj_description(c.oid,'pg_class'),'') from '^\[([^\]]+)\]') is null;
  if v_muettes is not null then fails := fails || ('sans domaine: '||v_muettes); end if;

  -- 2 · chaque morceau d'un domaine combiné est un domaine qui existe
  select string_agg(distinct x.part, ', ') into v_inconnus from (
    select c.relname,
           btrim(unnest(string_to_array(
             substring(obj_description(c.oid,'pg_class') from '^\[([^\]]+)\]'), '+'))) as part
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and substring(coalesce(obj_description(c.oid,'pg_class'),'') from '^\[([^\]]+)\]') is not null
  ) x where not (x.part = any(VALIDES));
  if v_inconnus is not null then fails := fails || ('domaine inconnu: '||v_inconnus); end if;

  -- 3 · le grand livre de la creator economy dit qu'il n'est PAS l'argent des autres domaines
  -- (08/11 : c'est l'erreur que ce test existe pour empêcher — la part d'un artiste de
  -- higher.boutique se règle sur la route `cloth` du webhook, jamais dans `member_ledger`).
  if coalesce(obj_description('public.member_ledger'::regclass,'pg_class'),'') not like '%JAMAIS l''argent de higher.boutique%'
    then fails := fails || 'member_ledger ne dit pas sa limite'; end if;

  -- 4 · un repère, pour voir bouger ce qui reste à trancher
  select count(*) into v_trancher from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname='public' and c.relkind='r'
     and obj_description(c.oid,'pg_class') like '[À TRANCHER]%';
  select count(*) into v_n from pg_tables where schemaname = 'public';

  raise exception 'DOMAINES · % tables, % à trancher · FAIL=%', v_n, v_trancher, fails;
end $t$;
