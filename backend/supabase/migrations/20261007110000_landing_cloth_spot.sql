-- COM · 07/10/2026 — la vue de droite de l'atterrissage : [Higher] sur le vêtement
-- why : Wah — « le Higher de la vue centrale doit se caler sur le Higher de
--       l'image du vêtement ». La place du logo sur l'image est une DONNÉE du
--       vêtement (x, y, largeur en fractions de l'image), pas un nombre dans la
--       page : un autre vêtement, une autre place. Absente → le centre de la
--       poitrine (0,5 · 0,3 · 0,3).
-- how : ADDITIF. Une colonne ; et la vignette n'accepte plus qu'un base64 pur
--       (la page la pose dans un `url(...)`).
alter table public.totehm_cloth_support add column if not exists logo_spot jsonb;

create or replace function public.avatar_set(p_data text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'why', 'signin'); end if;
  if p_data is null or p_data !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' or char_length(p_data) > 140000 then
    return jsonb_build_object('ok', false, 'why', 'image');
  end if;
  insert into public.member_avatars(user_id, data, updated_at) values (v_uid, p_data, now())
  on conflict (user_id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.avatar_set(text) from public, anon;
grant execute on function public.avatar_set(text) to authenticated, service_role;
