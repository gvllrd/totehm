-- LOT · 15/11/2026 — LES VIGNETTES D'UNE PHOTO SE LISENT COMME SA PHOTO
--
-- Wah : « passer aux vignettes ». Une photo est stockée en 1600 px et s'affiche dans une tuile d'environ 190 px :
-- on lit donc 10 à 20 fois plus d'octets qu'il n'en faut. La vignette (520 px, ~30 Ko) vit À CÔTÉ de sa photo,
-- sous le nom `<chemin>.jpg` — la même convention que la vignette d'une vidéo dans `element-media`
-- (`_element_media_readable` accepte déjà `path || '.jpg'`).
--
-- Dans le seau `moments`, `_clip_readable` ne connaissait que `video` et `photo` : la vignette d'une photo de
-- spot était donc illisible pour tout autre que son auteur. Elle se lit maintenant EXACTEMENT comme la photo
-- qu'elle accompagne — même spot publié, même audience, même règle `_audience_ok`. Rien d'autre ne change :
-- une vignette n'ouvre jamais plus que sa photo.
--
-- Additif : un `create or replace`, aucune table, aucune colonne, aucune ligne. Grants APRÈS le create.
create or replace function public._clip_readable(p_name text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $function$
  select (auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text)
      or exists (select 1 from public.spot_plans p
                  where (p.video = p_name or p.photo = p_name or p.photo || '.jpg' = p_name)
                    and p.status = 'published'
                    and public._audience_ok(p.user_id, p.audience, auth.uid(),
                          case when p.audience = 'figher' and auth.uid() is not null then public._is_figher(auth.uid()) else false end));
$function$;

revoke all on function public._clip_readable(text) from public;
grant execute on function public._clip_readable(text) to anon, authenticated, service_role;
