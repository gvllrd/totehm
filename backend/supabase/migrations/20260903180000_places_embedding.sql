-- ══ places.embedding — LE RADAR MATCHE LES HABITUDES ══
--
-- La promesse TOTEHM : tu voyages avec ton Totehm, le radar traduit chaque
-- ville en "voici ce qui correspond à TES habitudes". Google Maps montre
-- ce qui existe ; TOTEHM montre ce qui te correspond.
--
-- Ce qui rend ça possible : un vecteur par lieu (name + primaryType +
-- descriptions AI), comparé aux vecteurs de chaque habitude du membre.
-- Ranking, pas filtering — le radar montre toujours 3-5 lieux par
-- intention, dans l'ordre de fit (T brillant au centre = meilleur match,
-- T tamisé en périphérie = fit faible).
--
-- text-embedding-3-small : 1536 dimensions, ~0,00002 $ par lieu embedé.
-- Cosine distance via `<=>`. Index IVFFlat pour scans rapides même à
-- 10 000 lieux ; pour 60 lignes actuelles c'est overkill mais on prépare.

alter table public.places
  add column if not exists embedding vector(1536);

-- Index cosine seulement quand la table sera assez remplie. IVFFlat
-- demande au moins ~1000 lignes pour trier ses listes sans dégrader la
-- précision. Créé maintenant avec `lists=10` (adapté au volume 60-500),
-- à re-créer avec `lists=100` quand on passe à 10k+.
create index if not exists places_embedding_cosine_idx
  on public.places
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

comment on column public.places.embedding is
  'Vecteur 1536 dim (text-embedding-3-small) sur "name + primaryType +
   descriptions.values()". Généré par higher-map warm() à la création,
   backfillé par edge-tools/embed-places sur les lignes préexistantes.
   Comparé aux embeddings des habitudes du membre via cosine (<=>) dans
   places_matching_habits. NULL toléré tant que non-embedé : ces lignes
   tombent en bas du ranking, elles n''apparaissent pas au top du radar.';
