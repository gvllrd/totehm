-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 11/11/2026 — LE LUXE : L'ATELIER LOCAL, ET CE QU'ON SAIT AVANT DE PAYER
-- ══════════════════════════════════════════════════════════════════════
-- Wah : « avant tout règlement de l'acompte de 770 €, l'utilisateur doit
-- obligatoirement fournir : le nom exact du produit (parmi les 3 marques
-- d'exception avec lesquelles nous travaillons), une photo ou une vidéo haute
-- définition de sa pièce qui doit arriver en premier lieu dès le départ, ainsi
-- que sa ville… une Box issue de son Totehm, un style artistique (liste ou
-- photo d'un artiste) et son budget. »
--
-- Ce que cette migration pose, et RIEN d'autre :
--   1. les colonnes qui manquaient à `luxury_quotes` — la ville, le produit
--      exact, le média d'origine (photo OU vidéo), la référence de style, le
--      budget, l'étude de matière, l'artiste local et sa galerie ;
--   2. le seau `luxury-pieces` accepte la VIDÉO (la page y dépose aussi une
--      image fixe tirée de la vidéo : c'est ELLE que le modèle de vision lit) ;
--   3. l'acompte passe de 500 € à **770 €** (Wah, 11/11 — son « oui » est écrit
--      dans la demande : « l'acompte de 770 € », « remboursé des 770 € »).
--
-- `photo_path` garde son sens : l'IMAGE à étudier, toujours là. `media_path`
-- est ce que le membre a VRAIMENT envoyé. Rien ne bouge côté argent : le
-- montant vient de `luxury_offer`, relu par la fonction, jamais de la page.
-- ══════════════════════════════════════════════════════════════════════

alter table public.luxury_quotes add column if not exists city            text;
alter table public.luxury_quotes add column if not exists product         text;
alter table public.luxury_quotes add column if not exists media_path      text;
alter table public.luxury_quotes add column if not exists media_kind      text;
alter table public.luxury_quotes add column if not exists style_ref_path  text;
alter table public.luxury_quotes add column if not exists budget_cents    bigint;
alter table public.luxury_quotes add column if not exists material        jsonb;
alter table public.luxury_quotes add column if not exists material_at     timestamptz;
alter table public.luxury_quotes add column if not exists artist          text;
alter table public.luxury_quotes add column if not exists gallery         text;
alter table public.luxury_quotes add column if not exists artist_at       timestamptz;

comment on column public.luxury_quotes.city is
  'La ville du membre. L''artiste est LOCAL : c''est elle qui décide qui on mandate.';
comment on column public.luxury_quotes.product is
  'Le nom exact du produit (ex. « Birkin 30 »), écrit par le membre ; la marque reste dans brand.';
comment on column public.luxury_quotes.media_path is
  'Ce que le membre a envoyé (photo ou vidéo HD), dans luxury-pieces/<uid>/. photo_path reste l''IMAGE à étudier.';
comment on column public.luxury_quotes.media_kind is
  'photo | video — la nature de media_path.';
comment on column public.luxury_quotes.style_ref_path is
  'La photo du style d''un artiste aimé, quand le membre n''en choisit pas un dans la liste.';
comment on column public.luxury_quotes.budget_cents is
  'Le budget de l''ŒUVRE, en centimes, annoncé par le membre. Plus il est haut, plus l''artiste peut être prestigieux. Jamais un prix : le prix vient du serveur.';
comment on column public.luxury_quotes.material is
  'L''étude de matière, écrite par n8n depuis un modèle de vision : matière, grain, finition, apprêt, pigments, risques. Lecture seule pour tout le monde sauf le service.';
comment on column public.luxury_quotes.artist is
  'L''artiste local retenu, posé par un administrateur.';
comment on column public.luxury_quotes.gallery is
  'La galerie partenaire, intermédiaire obligatoire de la mise en relation.';
comment on column public.luxury_quotes.artist_at is
  'Quand l''artiste a été sécurisé : l''œuvre est due deux semaines plus tard, à la galerie.';

-- ─── Le seau : la VIDÉO entre aussi ───────────────────────────────────
-- Les deux politiques (écrire et lire SON dossier) couvrent déjà le nouveau
-- fichier : elles portent sur le seau, pas sur le type.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp',
                                  'video/mp4', 'video/quicktime', 'video/webm'],
       file_size_limit    = 52428800
 where id = 'luxury-pieces';

-- ─── L'ACOMPTE : 770 € (Wah, 11/11) ───────────────────────────────────
update public.luxury_offer set price_cents = 77000 where slug = 'launch';
