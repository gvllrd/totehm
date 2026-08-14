-- higher_count : remplace figher_count
-- Copie exacte via pg_get_functiondef — même corps, même type, même SECURITY, même search_path.
-- figher_count est conservée jusqu'en septembre 2026, non supprimée.

CREATE OR REPLACE FUNCTION public.higher_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::int from public.stoner_access;
$function$;

GRANT EXECUTE ON FUNCTION public.higher_count() TO postgres;
GRANT EXECUTE ON FUNCTION public.higher_count() TO anon;
GRANT EXECUTE ON FUNCTION public.higher_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.higher_count() TO service_role;
