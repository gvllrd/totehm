-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 26/10/2026 — LES PHOTOS D'UNE BOX
-- ══════════════════════════════════════════════════════════════════════
-- Wah : « quand tu sélectionnes la box, je veux que tu affiches en-dessous
-- les medias photo … et aussi les spots photo … avec la possibilité d'en
-- sélectionner une (comme les sous-box de la box) ».
--
-- Une box a un MONDE : ses mini-boxes (déjà `_box_matter`), ses photos, et
-- les photos des spots qu'on y a vécus. Ce fichier donne le second.
--
--   `_box_shots(user, kind, ref)` — ce que MOI j'ai posé sur CETTE box :
--      · media — `element_media` de la box même (photos seules), non retiré ;
--      · spot  — la photo d'un `spot_plans` publié, d'une Habit du monde de
--        la box : la box elle-même si c'est une Habit, sinon les Habits
--        qu'elle sert ou qui la menacent (un spot n'appartient qu'à une
--        Habit : `com/CLAUDE.md`). MY STORY et MY VISION passent par leurs
--        objectifs et leurs répulsions — deux liens, pas plus.
--   `my_box_shots(kind, ref)` — la même, pour la page (`auth.uid()`).
--
-- Rien n'est signé ici : on rend un CHEMIN et son seau. La page signe ce
-- qu'elle affiche (une heure) ; `create-checkout` relit ces mêmes lignes
-- avec la clé de service, et c'est LUI qui décide ce qui part à l'usine.
-- Une référence qui ne sort pas d'ici n'existe pas.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public._box_shots(p_user uuid, p_kind text, p_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_steps jsonb; v_habits text[]; v_uuid uuid; v_big bigint;
  v_em_kind text; v_out jsonb;
begin
  if p_user is null or btrim(coalesce(p_ref, '')) = '' then return '[]'::jsonb; end if;

  select coalesce(t.steps, '[]'::jsonb) into v_steps from public.totehms t where t.user_id = p_user limit 1;
  v_steps := coalesce(v_steps, '[]'::jsonb);

  -- La lettre de `element_media` pour cette vue ; une vue inconnue ne rend rien.
  v_em_kind := case p_kind when 'habit' then 'h' when 'objective' then 'o' when 'repulsion' then 'r'
                           when 'wisdom' then 'w' when 'vision' then 'v' else null end;
  if v_em_kind is null then return '[]'::jsonb; end if;

  -- Les Habits du MONDE de la box : c'est par elles que les spots arrivent.
  if p_kind = 'habit' then
    select array(select s->>'t' from jsonb_array_elements(v_steps) s where s->>'t' = p_ref) into v_habits;

  elsif p_kind = 'objective' then
    begin v_uuid := p_ref::uuid; exception when others then return '[]'::jsonb; end;
    select array(
      select distinct s->>'t' from jsonb_array_elements(v_steps) s
       where btrim(coalesce(s->>'t', '')) <> ''
         and (s->>'o' = p_ref or exists (select 1 from public.objective_habits oh
               where oh.user_id = p_user and oh.objective_id = v_uuid and oh.habit_text = s->>'t'))) into v_habits;

  elsif p_kind = 'repulsion' then
    begin v_big := p_ref::bigint; exception when others then return '[]'::jsonb; end;
    select array(
      select distinct s->>'t' from jsonb_array_elements(v_steps) s
       where btrim(coalesce(s->>'t', '')) <> ''
         and (s->>'t' = (select r.habit_text from public.repulsions r where r.id = v_big and r.user_id = p_user)
              or exists (select 1 from public.repulsion_habits rh
                          where rh.user_id = p_user and rh.repulsion_id = v_big and rh.habit_text = s->>'t'))) into v_habits;

  elsif p_kind = 'wisdom' then
    begin v_uuid := p_ref::uuid; exception when others then return '[]'::jsonb; end;
    -- MY STORY enseigne des objectifs et tient contre des répulsions : ses Habits sont les leurs.
    select array(
      select distinct s->>'t' from jsonb_array_elements(v_steps) s
       where btrim(coalesce(s->>'t', '')) <> ''
         and (exists (select 1 from public.teaching_objectives t
                       join public.objective_habits oh on oh.objective_id = t.objective_id and oh.user_id = p_user
                      where t.user_id = p_user and t.wisdom_id = v_uuid and oh.habit_text = s->>'t')
              or exists (select 1 from public.teaching_objectives t
                         where t.user_id = p_user and t.wisdom_id = v_uuid and t.objective_id::text = s->>'o')
              or exists (select 1 from public.repulsion_teachings rt
                          join public.repulsion_habits rh on rh.repulsion_id = rt.repulsion_id and rh.user_id = p_user
                         where rt.user_id = p_user and rt.wisdom_id = v_uuid and rh.habit_text = s->>'t'))) into v_habits;

  elsif p_kind = 'vision' then
    begin v_uuid := p_ref::uuid; exception when others then return '[]'::jsonb; end;
    select array(
      select distinct s->>'t' from jsonb_array_elements(v_steps) s
       where btrim(coalesce(s->>'t', '')) <> ''
         and (exists (select 1 from public.objective_visions ov
                       join public.objective_habits oh on oh.objective_id = ov.objective_id and oh.user_id = p_user
                      where ov.user_id = p_user and ov.vision_id = v_uuid and oh.habit_text = s->>'t')
              or exists (select 1 from public.objective_visions ov
                         where ov.user_id = p_user and ov.vision_id = v_uuid and ov.objective_id::text = s->>'o'))) into v_habits;
  end if;

  v_habits := coalesce(v_habits, '{}');

  -- Les photos de la box d'abord, les spots ensuite ; la plus récente en tête
  -- de chaque genre, douze au plus — au-delà on ne CHOISIT plus, on subit.
  v_out := coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'media', 'id', m.id::text, 'bucket', 'element-media',
                                        'path', m.path, 'txt', coalesce(nullif(btrim(m.name), ''), 'photo'),
                                        'at', to_char(m.created_at, 'YYYY-MM-DD')) order by m.created_at desc)
      from (select em.* from public.element_media em
             where em.user_id = p_user and em.removed_at is null
               and em.kind = v_em_kind and em.ref = p_ref and coalesce(em.mime, '') like 'image/%'
             order by em.created_at desc limit 12) m), '[]'::jsonb);

  v_out := v_out || coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'spot', 'id', s.spot_id::text, 'bucket', 'moments',
                                        'path', s.photo, 'txt', coalesce(nullif(btrim(s.place), ''),
                                                                         nullif(btrim(s.venue), ''),
                                                                         nullif(btrim(s.city), ''), s.habit),
                                        'at', to_char(s.starts_at, 'YYYY-MM-DD'))
             order by s.starts_at desc)
      from (select sp.* from public.spot_plans sp
             where sp.user_id = p_user and sp.status = 'published'
               and btrim(coalesce(sp.photo, '')) <> '' and sp.habit = any(v_habits)
             order by sp.starts_at desc limit 12) s), '[]'::jsonb);

  return v_out;
end $$;

comment on function public._box_shots(uuid, text, text) is
  'Les photos du MONDE d''une box : ses medias photo, et les photos des spots de ses Habits. Chemins seuls, jamais signés.';

create or replace function public.my_box_shots(p_kind text, p_ref text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$ select public._box_shots(auth.uid(), p_kind, p_ref) $$;

comment on function public.my_box_shots(text, text) is
  'Les photos de MA box, pour la page (higher.boutique). La page signe ce qu''elle affiche ; create-checkout relit.';

grant execute on function public.my_box_shots(text, text) to authenticated;
