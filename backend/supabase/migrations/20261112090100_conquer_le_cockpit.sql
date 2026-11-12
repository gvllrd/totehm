-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 12/11/2026 — CONQUER THE WORLD : CE QUE LE COCKPIT LIT ET ÉCRIT
-- ══════════════════════════════════════════════════════════════════════
-- Une seule lecture pour tout l'écran (`outreach_board`) : le score, les villes
-- et leur état, le prochain lot à envoyer, les relances dues, ce qui est arrivé
-- de la page partenaire. La page ne reçoit que des nombres DÉJÀ CALCULÉS.
--
-- UNE VILLE EST CONQUISE quand une galerie y a signé. Tant qu'aucune n'a signé,
-- la ville est « en cours » : c'est le seul compteur qui décide si l'on peut
-- vraiment prendre un acompte là-bas.
--
-- Les gestes d'administrateur (ajouter, marquer, réécrire les mots) vérifient
-- `_boutique_admin` ; la réservation et le grand livre sont réservés au SERVICE
-- (l'Edge Function qui envoie), jamais à une page.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.outreach_board(p_city text default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid();
begin
  if not public._boutique_admin(v_uid) then return jsonb_build_object('error', 'forbidden'); end if;
  return jsonb_build_object(
    'score', (select jsonb_build_object(
        'prospects', count(*),
        'to_contact', count(*) filter (where status = 'to_contact'),
        'contacted',  count(*) filter (where status in ('contacted', 'followed')),
        'replied',    count(*) filter (where status in ('replied', 'meeting')),
        'signed',     count(*) filter (where status = 'signed'),
        'refused',    count(*) filter (where status in ('refused', 'bounced', 'stopped')))
      from public.outreach_prospects),
    -- LE TABLEAU DE CONQUÊTE : une ligne par ville, l'état d'abord.
    'cities', coalesce((select jsonb_agg(c order by c->>'conquered' desc, (c->>'replied')::int desc, c->>'city')
      from (select jsonb_build_object(
              'city', city,
              'country', max(country),
              'prospects', count(*),
              'to_contact', count(*) filter (where status = 'to_contact'),
              'contacted',  count(*) filter (where status in ('contacted', 'followed')),
              'replied',    count(*) filter (where status in ('replied', 'meeting')),
              'signed',     count(*) filter (where status = 'signed'),
              'galleries',  count(*) filter (where segment = 'gallery'),
              'conquered',  count(*) filter (where status = 'signed' and segment = 'gallery') > 0) as c
             from public.outreach_prospects group by city) t), '[]'::jsonb),
    -- LE PROCHAIN LOT : qui part au prochain tap, le prestige d'abord.
    'file', coalesce((select jsonb_agg(jsonb_build_object(
              'id', id, 'name', name, 'city', city, 'segment', segment,
              'rank', rank, 'email', email, 'site', site) order by rank desc, created_at)
      from (select * from public.outreach_prospects
             where status = 'to_contact' and email is not null
               and (p_city is null or lower(city) = lower(p_city))
             order by rank desc, created_at limit 25) f), '[]'::jsonb),
    -- LES RELANCES DUES : contactées il y a 5 jours et toujours muettes.
    'due_followup', (select count(*) from public.outreach_prospects
                      where status = 'contacted' and email is not null
                        and contacted_at < now() - interval '5 days'
                        and (p_city is null or lower(city) = lower(p_city))),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
              'id', id, 'kind', kind, 'name', name, 'city', city, 'email', email,
              'link', link, 'word', word, 'status', status, 'created_at', created_at)
            order by created_at desc)
      from (select * from public.outreach_applications where status in ('new', 'read')
             order by created_at desc limit 20) a), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object(
              'name', p.name, 'city', p.city, 'kind', s.kind, 'ok', s.ok,
              'error', left(coalesce(s.error, ''), 90), 'at', s.sent_at) order by s.sent_at desc)
      from (select * from public.outreach_sends order by sent_at desc limit 12) s
      join public.outreach_prospects p on p.id = s.prospect_id), '[]'::jsonb),
    'templates', coalesce((select jsonb_agg(jsonb_build_object(
              'slug', slug, 'subject', subject, 'body', body) order by slug)
      from public.outreach_templates), '[]'::jsonb));
end $function$;

-- ─── AJOUTER DES PROSPECTS — par lot, sans jamais écrire deux fois le même ──
create or replace function public.outreach_add(p_rows jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); n int := 0; r jsonb;
begin
  if not public._boutique_admin(v_uid) then return jsonb_build_object('error', 'forbidden'); end if;
  if jsonb_typeof(p_rows) <> 'array' then return jsonb_build_object('error', 'bad_rows'); end if;
  for r in select * from jsonb_array_elements(p_rows) limit 200 loop
    begin
      insert into public.outreach_prospects(segment, name, city, country, email, site, social, note, rank)
      values (coalesce(nullif(r->>'segment', ''), 'gallery'),
              left(trim(coalesce(r->>'name', '')), 120),
              left(trim(coalesce(r->>'city', '')), 80),
              nullif(left(trim(coalesce(r->>'country', '')), 80), ''),
              nullif(lower(trim(coalesce(r->>'email', ''))), ''),
              nullif(left(trim(coalesce(r->>'site', '')), 300), ''),
              nullif(left(trim(coalesce(r->>'social', '')), 300), ''),
              nullif(left(trim(coalesce(r->>'note', '')), 500), ''),
              least(3, greatest(0, coalesce((r->>'rank')::int, 1))));
      n := n + 1;
    exception when unique_violation or check_violation or invalid_text_representation then
      null;   -- un doublon ou une ligne bancale ne casse pas le lot
    end;
  end loop;
  return jsonb_build_object('ok', true, 'added', n);
end $function$;

-- ─── MARQUER — répondu, rendez-vous, signé, refusé, arrêté ─────────────
create or replace function public.outreach_mark(p_id uuid, p_status text, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if not public._boutique_admin(v_uid) then return jsonb_build_object('error', 'forbidden'); end if;
  if p_status not in ('to_contact','contacted','followed','replied','meeting','signed','refused','bounced','stopped') then
    return jsonb_build_object('error', 'bad_status');
  end if;
  update public.outreach_prospects
     set status = p_status,
         note = coalesce(nullif(left(p_note, 500), ''), note),
         replied_at = case when p_status in ('replied','meeting') then coalesce(replied_at, now()) else replied_at end,
         signed_at  = case when p_status = 'signed' then coalesce(signed_at, now()) else signed_at end,
         updated_at = now()
   where id = p_id returning id into v_id;
  return jsonb_build_object('ok', v_id is not null);
end $function$;

-- ─── UNE CANDIDATURE LUE, GARDÉE OU ÉCARTÉE ────────────────────────────
create or replace function public.outreach_application_mark(p_id uuid, p_status text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if not public._boutique_admin(auth.uid()) then return jsonb_build_object('error', 'forbidden'); end if;
  if p_status not in ('new','read','kept','refused') then return jsonb_build_object('error', 'bad_status'); end if;
  update public.outreach_applications set status = p_status where id = p_id returning id into v_id;
  return jsonb_build_object('ok', v_id is not null);
end $function$;

-- ─── LES MOTS — Wah les réécrit sans déployer ──────────────────────────
create or replace function public.outreach_template_set(p_slug text, p_subject text, p_body text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public._boutique_admin(auth.uid()) then return jsonb_build_object('error', 'forbidden'); end if;
  if char_length(coalesce(p_subject, '')) < 3 or char_length(coalesce(p_body, '')) < 30 then
    return jsonb_build_object('error', 'too_short');
  end if;
  insert into public.outreach_templates(slug, subject, body)
  values (left(p_slug, 60), left(p_subject, 200), left(p_body, 4000))
  on conflict (slug) do update set subject = excluded.subject, body = excluded.body, updated_at = now();
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.outreach_board(text) from public, anon;
revoke all on function public.outreach_add(jsonb) from public, anon;
revoke all on function public.outreach_mark(uuid, text, text) from public, anon;
revoke all on function public.outreach_application_mark(uuid, text) from public, anon;
revoke all on function public.outreach_template_set(text, text, text) from public, anon;
grant execute on function public.outreach_board(text) to authenticated, service_role;
grant execute on function public.outreach_add(jsonb) to authenticated, service_role;
grant execute on function public.outreach_mark(uuid, text, text) to authenticated, service_role;
grant execute on function public.outreach_application_mark(uuid, text) to authenticated, service_role;
grant execute on function public.outreach_template_set(text, text, text) to authenticated, service_role;
