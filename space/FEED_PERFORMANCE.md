# SPACE — feed vidéo, 4 octobre 2026

BUILD `2026-10-04-instant-feed`.

La première image du clip suivant est préparée pendant la lecture du visible sur un bon réseau. Un seul clip joue ; trois lecteurs au plus (précédent, visible, suivant). Un aller-retour au radar conserve les lecteurs prêts pendant 20 secondes maximum. Arrière-plan, déconnexion ou expiration libèrent les lecteurs. Save-Data/2G n'anticipent rien ; 3G donne priorité au visible.

Le visible et le suivant peuvent partager une requête d'autorisation de deux items maximum. Les droits sont relus indépendamment pour chaque item ; aucune erreur du suivant ne révèle un contenu interdit ou n'empêche l'autorisation du visible. Le contrat de lecture précédent et la confirmation d'upload restent compatibles. Les signatures restent temporaires ; aucun secret serveur n'est transmis au navigateur.

Hls.js chauffe depuis le module local. La lecture Chrome/MSE utilise Hls.js ; Safari conserve le master HLS natif. Premier segment adapté au débit, puis qualité HD automatique sans plafond permanent. Les anciens MP4 préparent aussi des images. Pagination, cinq vues, joystick, caméra portrait, photos, Habit Boxes et droits sont conservés.

| contrôle | résultat |
|---|---|
| Swipe suivant HLS, avant | 1 198 / 1 183 / 1 249 ms ; médiane 1 198 ms |
| Swipe suivant HLS, après | 61 / 63 / 61 ms ; médiane 61 ms |
| Retour radar vers le même clip prêt | 55 / 59 / 64 ms ; aucune nouvelle autorisation de ce clip |
| Premier clip froid après | 1 578 / 1 135 / 1 110 ms |
| Qualité du clip actif | monte à HD ; plafond ABR retiré à l'activation |
| Anciens MP4, suivant préparé | 50 ms |
| Tests de latence | `space_feed_latency.mjs` 37/37 |
| Navigation | `space.mjs` 35/35 |
| Interface | `spaces_ui.mjs` 57/57 |
| Futur, filtre et photos | `space_top_left.mjs` 47/47 |
| Capture/lecture vidéo portrait | `space_video.mjs portrait` 19/19 |
| Régression performance | `space_performance.mjs` 16/16 |
| Autorisations de lecture | `bunny_playback.mjs` 14/14 |
| Protection et signatures | `bunny.mjs` 12/12 |

Ces timings proviennent de vrais HLS/MP4 décodés en Chromium avec comptes et réseau simulés : autorisation 350 ms, CDN 90 ms + taille du segment / 4 MB/s. Trois passages, mêmes délais avant/après. Ils ne mesurent ni un téléphone réel ni TikTok. L'amélioration mesurée concerne principalement les clips préparés ; une première visite nécessite toujours le réseau.

Pour reproduire : générer les fixtures avec `tests/browser/space_video_fixtures.py /tmp/space-portrait-fixtures`, préparer le harnais décrit dans `tests/browser/harness.mjs`, puis lancer `node tests/browser/space_feed_latency.mjs`. Comparaison avant : `SPACE_FEED_BASELINE=<ancien dossier space>` et `--baseline`. Le rapport JSON est produit dans `SPACE_FEED_REPORT_DIR` ou `/tmp/space-oct04-qa`.
