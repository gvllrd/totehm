-- ═══════════════════════════════════════════════════════════════════════
-- BOUTIQUE · DECODE GRATUIT POUR LA RUE · 28/11/2026
-- ═══════════════════════════════════════════════════════════════════════
-- Wah (28/11) : « higher.boutique c'est un input utilisateur (histoire ou pas)
-- que l'on retravaille avec un style artistique, avec un nom qui permet de
-- retrouver l'input en ligne par toutes les personnes qui ont vu l'œuvre et le
-- nom dans la rue » · « il faut rendre le decode gratuit pour la street ».
--
-- Avant ce lot, un inconnu qui tapait le nom d'un Cloth ne voyait que le nom, le
-- style, le vêtement et la date : la boucle rue → en ligne s'arrêtait là. Le
-- texte n'allait qu'au propriétaire, à ses abonnés et aux détenteurs d'un THP
-- avec une Habit (`_art_passport`) — une règle à part, différente du Club.
--
-- Désormais, UNE règle, celle de l'accord du propriétaire :
--   · `public_at` = l'heure à laquelle le membre a lu, à la dernière étape de sa
--     commande, « Anyone who types this name will read this element. » ; posée
--     par `create-checkout` et `luxury-quote`, jamais par une page ;
--   · une pièce PUBLIQUE se lit par TOUT LE MONDE, sans compte : la box TELLE
--     QU'ELLE A ÉTÉ FIGÉE au paiement (texte, intentions, palette, vue) ; le nom
--     du totehmisateur seulement si son TOTEHM est partagé (inchangé) ; jamais
--     ce qui lui est relié (mini-box, photos : propriétaire et abonnés), jamais
--     la taille du vêtement ;
--   · une pièce SANS accord (celles d'avant, une page restée en cache) reste
--     fermée aux autres, comme avant — l'accord ne se présume jamais ;
--   · le palier `member` (THP + Habit) disparaît.
-- La BOX, dans le TOTEHM, garde son niveau (private · subscribers) : seule la
-- copie IMPRIMÉE devient publique, par le choix de son propriétaire.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.totehm_clothes add column if not exists public_at timestamptz;
alter table public.luxury_quotes  add column if not exists public_at timestamptz;

comment on column public.totehm_clothes.public_at is
  '[BOUTIQUE] Heure à laquelle le propriétaire a accepté, avant de payer, que la box imprimée se lise par tous via le nom (Decode). Posée par create-checkout. Null = fermée aux autres.';
comment on column public.luxury_quotes.public_at is
  '[BOUTIQUE] Heure à laquelle le propriétaire a accepté, avant de payer, que la box imprimée se lise par tous via le nom (Decode). Posée par luxury-quote. Null = fermée aux autres.';

create or replace function public.reveal_cloth(p_name text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_level text; v_snap jsonb; v_owner_pseudo text; v_shared boolean;
        v_id uuid; v_user uuid; v_cname text; v_kind text; v_msg text; v_at timestamptz;
        v_style uuid; v_style_name text; v_line text := 'streetwear';
        v_garment uuid; v_size text; v_status text; v_test boolean := false; v_paid timestamptz;
        v_art boolean := false; v_title text; v_image text; v_of integer; v_no integer; v_stage text;
        v_public timestamptz;
        v_q text := lower(btrim(coalesce(p_name, '')));
        v_bare boolean;
begin
  if length(v_q) < 2 then return jsonb_build_object('found', false); end if;
  v_bare := v_q !~ '^\d+\.';
  select tc.id, tc.user_id, tc.name, tc.box_kind, tc.box_snapshot, tc.message, tc.created_at, tc.style_id,
         tc.garment_id, tc.size, tc.status, tc.test, tc.paid_at,
         (tc.status = 'shipped' and tc.artwork_storage_path is not null and not tc.test), tc.public_at
    into v_id, v_user, v_cname, v_kind, v_snap, v_msg, v_at, v_style,
         v_garment, v_size, v_status, v_test, v_paid, v_art, v_public
    from public.totehm_clothes tc
   where tc.paid_at is not null
     and (lower(btrim(tc.name)) = v_q
          or (v_bare and lower(regexp_replace(btrim(tc.name), '^\d+\.', '')) = v_q))
   order by (lower(btrim(tc.name)) = v_q) desc, tc.paid_at desc
   limit 1;
  if v_id is not null then
    select s.title, s.image_url, s.max_pieces into v_title, v_image, v_of
      from public.totehm_cloth_support s where s.id = v_garment;
    if not v_test then
      select count(*) into v_no from public.totehm_clothes c
       where c.garment_id = v_garment and c.paid_at is not null and not c.test
         and (c.paid_at < v_paid or (c.paid_at = v_paid and c.id <= v_id));
    end if;
    v_stage := case v_status when 'shipped' then 'shipped' when 'production' then 'production'
                             when 'cancelled' then 'cancelled' else 'making' end;
  else
    select q.id, q.user_id, q.name, q.box_kind, q.box_snapshot, null::text, q.paid_at, q.style_id,
           coalesce(q.test, false), q.paid_at, nullif(btrim(coalesce(q.brand, '') || ' ' || coalesce(q.piece, '')), ''),
           q.public_at
      into v_id, v_user, v_cname, v_kind, v_snap, v_msg, v_at, v_style, v_test, v_paid, v_title, v_public
      from public.luxury_quotes q
     where q.name is not null and q.status = 'paid' and q.paid_at is not null
       and (lower(btrim(q.name)) = v_q
            or (v_bare and lower(regexp_replace(btrim(q.name), '^\d+\.', '')) = v_q))
     order by (lower(btrim(q.name)) = v_q) desc, q.paid_at desc
     limit 1;
    v_line := 'luxury'; v_stage := 'making'; v_art := false;
  end if;
  if v_id is null then return jsonb_build_object('found', false); end if;

  -- Les pièces d'AVANT (message libre) gardent leur Decode public : on ne retire
  -- pas ce qui a été promis.
  if v_kind is null then
    return jsonb_build_object('found', true, 'name', v_cname, 'legacy', true,
      'level', 'full', 'message', v_msg, 'created_at', v_at::date, 'line', v_line,
      'garment', v_title, 'garment_image', v_image, 'stage', v_stage,
      'edition', v_no, 'edition_of', v_of, 'test', v_test, 'art', v_art);
  end if;

  select s.name into v_style_name from public.artistic_styles s where s.id = v_style;
  v_snap := coalesce(v_snap, '{}'::jsonb);
  -- UNE règle : le propriétaire et ses abonnés lisent tout ; tous les autres,
  -- comptes ou pas, lisent la box imprimée SI son propriétaire l'a rendue publique.
  if v_me is not null and (v_user = v_me or public.is_subscribed_to(v_user)) then
    v_level := 'full';
  elsif v_public is not null then
    v_level := 'public';
  else
    v_level := 'locked';
  end if;

  select exists (select 1 from public.totehms t where t.user_id = v_user
                  and t.totehm_visibility in ('subscribers','members')) into v_shared;
  if v_shared or v_user = v_me then
    select pseudo into v_owner_pseudo from public.profiles where id = v_user;
  end if;

  return jsonb_build_object(
    'found', true, 'name', v_cname, 'legacy', false, 'level', v_level, 'line', v_line,
    'public', v_public is not null,
    'style', v_style_name, 'view', v_snap->>'view', 'created_at', v_at::date,
    'garment', v_title, 'garment_image', v_image, 'stage', v_stage,
    'edition', v_no, 'edition_of', v_of, 'test', v_test, 'art', v_art,
    'mine', v_me is not null and v_user = v_me,
    'size',    case when v_level = 'full'   then v_size end,
    'palette', case when v_level = 'locked' then null else v_snap->'palette' end,
    'text',    case when v_level = 'locked' then null else v_snap->>'text' end,
    'is',      case when v_level = 'locked' then null else v_snap->'is' end,
    'owner',   case when v_level = 'locked' then null else v_owner_pseudo end,
    'matter',  case when v_level = 'full'   then v_snap->'matter' else null end);
end $function$;

-- Les grants APRÈS le dernier `create` (CLAUDE.md) : Decode reste ouvert à tous.
revoke all on function public.reveal_cloth(text) from public;
grant execute on function public.reveal_cloth(text) to anon, authenticated, service_role;
