-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 12/11/2026 — CONQUER THE WORLD : LA RÉSERVATION, LA PORTE, LES MOTS
-- ══════════════════════════════════════════════════════════════════════
-- Trois choses :
--   1. `outreach_claim` / `outreach_sent` — le SERVICE réserve AVANT d'envoyer
--      et écrit le grand livre APRÈS. Réserver d'abord est ce qui empêche un
--      double tap d'écrire deux fois à la même galerie ; un échec rend la ligne
--      à la file avec son motif, il ne la perd pas.
--   2. `outreach_apply` — la porte de `/atelier`, ouverte à qui n'a pas de
--      compte (une galerie n'a pas de TOTEHM). Elle valide tout, et un frein
--      global empêche qu'un robot remplisse la table.
--   3. Les MOTS par défaut, et les STYLES DU LUXE, séparés de streetwear
--      (`artistic_styles.scope`) : une pièce de cuir ne se peint pas comme un
--      sweat, et Wah veut pouvoir changer les styles sans déployer.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.outreach_claim(p_kind text, p_city text default null, p_limit int default 10)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v jsonb;
begin
  if p_kind not in ('first', 'followup') then return jsonb_build_object('error', 'bad_kind'); end if;
  with pris as (
    update public.outreach_prospects q
       set status       = case when p_kind = 'first' then 'contacted' else 'followed' end,
           contacted_at = case when p_kind = 'first' then now() else contacted_at end,
           followed_at  = case when p_kind = 'followup' then now() else followed_at end,
           updated_at   = now()
     where q.id in (
       select id from public.outreach_prospects
        where email is not null
          and (p_city is null or lower(city) = lower(p_city))
          and ((p_kind = 'first'    and status = 'to_contact')
            or (p_kind = 'followup' and status = 'contacted' and contacted_at < now() - interval '5 days'))
        order by rank desc, created_at
        limit greatest(1, least(coalesce(p_limit, 10), 40))
        for update skip locked)
    returning q.id, q.segment, q.name, q.city, q.email)
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'segment', segment, 'name', name, 'city', city, 'email', email)), '[]'::jsonb)
    into v from pris;
  return jsonb_build_object('ok', true, 'jobs', v,
    'templates', coalesce((select jsonb_object_agg(slug, jsonb_build_object('subject', subject, 'body', body))
                             from public.outreach_templates), '{}'::jsonb));
end $function$;

create or replace function public.outreach_sent(p_id uuid, p_kind text, p_subject text,
                                                p_ok boolean, p_error text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.outreach_sends(prospect_id, kind, subject, ok, error)
  values (p_id, case when p_kind = 'followup' then 'followup' else 'first' end,
          left(p_subject, 200), coalesce(p_ok, false), left(p_error, 300));
  -- UN ÉCHEC REND LA LIGNE À LA FILE, avec son motif : on la reverra.
  if not coalesce(p_ok, false) then
    update public.outreach_prospects
       set status = case when p_kind = 'followup' then 'contacted' else 'to_contact' end,
           last_error = left(p_error, 300), updated_at = now()
     where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end $function$;

-- ─── LA PORTE DE /atelier — une galerie n'a pas de TOTEHM ──────────────
create or replace function public.outreach_apply(p_kind text, p_name text, p_city text,
                                                 p_email text, p_link text default null,
                                                 p_word text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id uuid; v_recent int;
begin
  if p_kind not in ('gallery', 'artist') then return jsonb_build_object('error', 'kind'); end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then return jsonb_build_object('error', 'name'); end if;
  if char_length(trim(coalesce(p_city, ''))) < 2 then return jsonb_build_object('error', 'city'); end if;
  if coalesce(p_email, '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then return jsonb_build_object('error', 'email'); end if;
  -- LE FREIN : vingt candidatures en une heure, c'est un robot, pas une ville.
  select count(*) into v_recent from public.outreach_applications where created_at > now() - interval '1 hour';
  if v_recent >= 20 then return jsonb_build_object('error', 'too_many'); end if;
  insert into public.outreach_applications(kind, name, city, email, link, word)
  values (p_kind, left(trim(p_name), 120), left(trim(p_city), 80), lower(trim(p_email)),
          nullif(left(trim(coalesce(p_link, '')), 300), ''), nullif(left(trim(coalesce(p_word, '')), 600), ''))
  returning id into v_id;
  return jsonb_build_object('ok', v_id is not null);
end $function$;

-- ─── LES MOTS PAR DÉFAUT — vrais, courts, et modifiables en base ───────
insert into public.outreach_templates(slug, subject, body) values
('gallery_first', 'One gallery per city — {{city}}', $t$Hello,

TOTEHM hand-paints one personal element of someone's life onto a luxury piece they already own — an Hermès, a Louis Vuitton, a Gucci bag or jacket. The work is always made by an artist who lives in the owner's city. That is written into what we are.

We are opening {{city}}, and we work with one partner gallery per city. We would like it to be {{name}}.

What it means for you:
· Paid commissions, not projects. The client pays a 770 EUR deposit before anything starts; the artwork starts at 2 000 EUR.
· The artist is one of yours. You choose who fits the brief. The artist takes 55 % of the artwork, the gallery 20 %.
· The piece is deposited at your gallery, worked on, and collected there. Nothing travels blind.
· Six months of exclusivity on {{city}}.

We bring the client, the brief, the material study and the money. You bring the artist and the address.

Everything is here: https://www.higher.boutique/atelier

Would you be open to a short call this week?

Wah
Founder, TOTEHM
higher.boutique

If you would rather not hear from us again, reply STOP and we remove you.$t$),
('gallery_followup', 'Re: one gallery per city — {{city}}', $t$Hello,

I wrote last week about opening {{city}} with one partner gallery. I am still holding the city for {{name}}.

The short version: we bring paid commissions on luxury pieces, your artist paints them, you take 20 % and keep the piece in your gallery the whole time. Six months of exclusivity.

https://www.higher.boutique/atelier

A yes, a no, or a name to talk to — any of the three helps.

Wah
Founder, TOTEHM

If you would rather not hear from us again, reply STOP and we remove you.$t$),
('hotel_first', 'Something your guests cannot buy anywhere — {{city}}', $t$Hello,

TOTEHM turns a guest's own luxury piece — a bag, a jacket, a pair of shoes — into a one-of-a-kind hand-painted work, made by an artist who lives in {{city}} and shown through our partner gallery here.

It is the kind of thing a guest remembers longer than the room: they arrive with a bag, they leave with a piece no one else owns.

For {{name}}: we handle everything — the study of the piece, the artist, the gallery, the delivery. Your concierge simply introduces it. We pay a referral commission on every piece.

https://www.higher.boutique/atelier

Would fifteen minutes with your concierge team be possible?

Wah
Founder, TOTEHM

If you would rather not hear from us again, reply STOP and we remove you.$t$),
('hotel_followup', 'Re: something your guests cannot buy anywhere — {{city}}', $t$Hello,

Following up on the hand-painted pieces for your guests in {{city}}. One bag, one local artist, one gallery — and a commission for {{name}} on every piece.

https://www.higher.boutique/atelier

Happy to send photographs of finished work if that is more useful than a call.

Wah
Founder, TOTEHM

If you would rather not hear from us again, reply STOP and we remove you.$t$)
on conflict (slug) do nothing;

-- ─── LES STYLES DU LUXE, SÉPARÉS DE STREETWEAR ─────────────────────────
-- `scope` : streetwear | luxury | both. Wah change un style dans le Table
-- Editor de Supabase ; rien à déployer.
alter table public.artistic_styles add column if not exists scope text not null default 'streetwear';
comment on column public.artistic_styles.scope is
  'streetwear | luxury | both — quelle boutique propose ce style. Un style de cuir peint à la main n''est pas un style d''impression.';

insert into public.artistic_styles(name, position, active, status, total_capacity, remaining_capacity,
                                   system_prompt_prefix, negative_prompt, scope) values
('Ink Line',      1, true, 'active', 999, 999, 'A single continuous ink line drawing, hand-painted on leather, confident and unbroken, high contrast, no shading.', 'photorealism, gradients, logos, text', 'luxury'),
('Gold Leaf',     2, true, 'active', 999, 999, 'Hand-laid gold leaf over a deep matte ground, sharp edges, museum restoration feel, warm metallic light.', 'glitter, plastic shine, logos, text', 'luxury'),
('Oil Portrait',  3, true, 'active', 999, 999, 'An old-master oil portrait treatment, thin glazes, deep shadows, painted directly on the material, visible brushwork.', 'cartoon, flat colour, logos, text', 'luxury'),
('Abstract Flow', 4, true, 'active', 999, 999, 'Abstract flowing colour fields with hand-painted texture, soft edges meeting hard ones, contemporary gallery abstraction.', 'figurative detail, logos, text', 'luxury'),
('Botanical',     5, true, 'active', 999, 999, 'Hand-painted botanical study, scientific plate precision, fine linework and muted washes.', 'neon, graffiti, logos, text', 'luxury'),
('Monogram Void', 6, true, 'active', 999, 999, 'Minimal geometry and negative space, one bold hand-painted shape, nothing else, architectural restraint.', 'busy pattern, brand monograms, logos, text', 'luxury')
on conflict do nothing;

revoke all on function public.outreach_claim(text, text, int) from public, anon, authenticated;
revoke all on function public.outreach_sent(uuid, text, text, boolean, text) from public, anon, authenticated;
revoke all on function public.outreach_apply(text, text, text, text, text, text) from public;
grant execute on function public.outreach_claim(text, text, int) to service_role;
grant execute on function public.outreach_sent(uuid, text, text, boolean, text) to service_role;
grant execute on function public.outreach_apply(text, text, text, text, text, text) to anon, authenticated, service_role;
