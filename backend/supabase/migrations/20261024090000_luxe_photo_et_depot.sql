-- ══════════════════════════════════════════════════════════════════════
-- TOTEHM · 24/10/2026 — LE LUXE : UNE PHOTO, ET 500 € POUR DÉPOSER
-- ══════════════════════════════════════════════════════════════════════
-- Wah : « simplifie largement la rubrique luxe en invitant l'utilisateur à
-- prendre une photo de son article… ici c'est 500 balles pour déposer le
-- projet (remboursé si pas de possibilité) ».
--
-- Deux choses seulement :
--   1. `luxury_quotes.photo_path` — le CHEMIN de la photo dans le seau, jamais
--      l'image. La photo vit dans `luxury-pieces`, privé : un membre n'écrit et
--      ne lit QUE son dossier (`<uid>/…`). L'administrateur la regarde par une
--      URL signée que l'Edge Function `luxury-quote` fabrique (clé de service).
--   2. le seau lui-même et ses deux politiques.
--
-- Le PRIX du dépôt n'est pas ici : il vit déjà dans `luxury_offer` (500 €,
-- `launch`). Rien de l'argent ne change — `luxury-checkout` lit toujours le
-- montant du devis en base, et le webhook reste la seule écriture.
-- ══════════════════════════════════════════════════════════════════════

alter table public.luxury_quotes add column if not exists photo_path text;

comment on column public.luxury_quotes.photo_path is
  'Chemin dans le seau luxury-pieces (<uid>/<fichier>). Jamais une URL : elle se signe au moment de regarder.';

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('luxury-pieces', 'luxury-pieces', false, 8388608,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
                               file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

-- Un membre dépose dans SON dossier et n'y lit que le sien. L'administrateur
-- passe par la fonction (clé de service), jamais par une politique élargie :
-- une politique « les admins voient tout » s'oublie et finit par tout ouvrir.
create policy "luxury photo insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'luxury-pieces' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "luxury photo read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'luxury-pieces' and (storage.foldername(name))[1] = auth.uid()::text);
