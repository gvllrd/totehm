# Streetwear — état et procédures (06/10/2026)

Le catalogue et les tests sont réparés. La chaîne après paiement attend encore la publication de B/C/D/E et le déploiement des raccordements Stripe et TotehmBot. Les versions décrites comme préparées ci-dessous ne sont pas actives.

| étape | fonctionnement prévu | état mesuré |
|---|---|---|
| F · catalogue | notification authentifiée, reçu privé avant réponse, produit revérifié chez Printful, synchronisation atomique, photo principale automatique | publié `7b434d99-dd6d-43e4-bcc6-10244f912a6c` ; Printful raccordé ; événements catalogue uniquement |
| Paiement | session et montant vérifiés, passage paid atomique, tâche de génération durable | trigger durable déployé ; handler `stripe-webhook` corrigé sur `test/streetwear`, version active 41 inchangée |
| B · génération | une réservation par pièce, sept concepts privés, prompt Box + intentions/matière/palette + style + zone, notification de curation | brouillon corrigé ; version active ancienne |
| C · choix | curateur Telegram vérifié, un seul choix, agrandissement repris par identifiant, composition et réservation de D | brouillon corrigé ; raccordement bot partagé préparé seulement sur la branche |
| D · Printful | refus TEST, recherche par external_id avant création, lien d'impression renouvelé, fichiers Higher conservés | brouillon corrigé ; création prévue en brouillon Printful `confirm=false` |
| E · expédition | notification interne depuis F, commande/colis relus chez Printful, email de suivi idempotent | préparation sur la branche ; mise à jour n8n rejetée par contrôle automatique |
| R · reprise | tâches queued/waiting, interrogation d'une prédiction connue, reprise des événements catalogue | code préparé sur la branche ; aucun ordonnanceur actif créé |
| T · contrôles | lecture des configurations, refus anonymes, état des clés, reçu privé composé de booléens | workflow manuel `cDhaaRiJCHtf9lG5`, projet personnel Guillaume Vallerand |

## Catalogue et images

Les nouveaux produits arrivent inactifs, prix et édition à zéro. Une mise à jour conserve active, price, max_pieces et claimed ainsi que la photo choisie. L'aperçu principal Printful remplit une photo absente ; la page donne priorité aux images déjà placées dans le dossier Storage. Une absence de photo provoque cinq reprises espacées d'une minute. Une suppression doit être confirmée par une réponse 404 de Printful ; une pièce commandée conserve son support désactivé.

Une seule URL Printful reçoit actuellement product_synced, product_updated et product_deleted. Sa signature est dérivée côté serveur, jamais copiée dans le dépôt. Ne pas enregistrer package_shipped ni changer Telegram tant que E et le bot partagé ne sont pas approuvés. Après approbation, F sera l'unique entrée Printful et distribuera l'expédition à E.

## Paiements et fichiers d'impression

Trois migrations additives sont appliquées : streetwear_secure_pipeline, streetwear_webhook_recovery, streetwear_lock_order. Les pièces TEST ne prennent ni stock ni capacité artistique et ne créent aucune tâche fournisseur. Les mutations de la chaîne et les concepts sont réservés au rôle serveur. Un passage draft → paid réel crée une tâche durable même si n8n est indisponible.

Une génération interrompue après le départ de l'appel payant est verrouillée en error_locked ; elle n'est jamais relancée aveuglément. Une prédiction Replicate connue est interrogée de nouveau. Une commande Printful ambiguë est recherchée via son external_id avant toute décision. Le brouillon Printful ne porte pas le statut production tant que Printful ne le confirme pas.

compose-artwork utilise une bibliothèque Deno et le vrai logo `/assets/img/totehm_logo.png`. Son authentification accepte les clés secrètes Supabase actuelles. Les chemins privés des concepts et du fichier final sont durables ; streetwear-assets renouvelle les liens au moment de Telegram, Replicate et Printful. L'œuvre finale reste surprise pour le membre.

## Tester en parallèle

`test/streetwear` isole le code. Elle utilise encore le projet Supabase de production : une branche Git ne crée ni base ni compte Stripe séparés. Les tests navigateur du dépôt simulent intégralement Supabase et Stripe. Les tests SQL annulent tous leurs fixtures avec l'exception finale attendue `FAIL={}`.

Pour les essais sur higher.boutique, le compte Vallerand est déjà dans boutique_testers. Le serveur décide du mode TEST ; aucun champ envoyé par le navigateur ne peut allumer ce mode. Le front préparé dans la branche ajoute TEST MODE à la commande et TEST dans My clothes ; il n’est pas encore publié sur higher.boutique. Sélectionner Box, vêtement, nom unique, style et taille se teste déjà.

Le paiement test attend STRIPE_TEST_SECRET_KEY et STRIPE_TEST_WEBHOOK_SECRET, absentes au dernier contrôle. La tâche de configuration locale est dans CLAUDE_CODE.md. Une fois les clés posées : carte 4242 4242 4242 4242, expiration future, CVC 123 ; reçu TEST payé, stock/capacités identiques, aucune génération/commande Printful. Le mode TEST s'arrête volontairement après paiement : tester les vrais fournisseurs demande une pièce pilote séparément autorisée.

T peut être exécuté manuellement sans risque de commande. Le dernier diagnostic se lit avec `select payload from streetwear_events where payload->>'type'='streetwear_readiness' order by id desc limit 1;`. Les champs de readiness à false signalent la configuration encore manquante ; aucun secret n'est enregistré. Les workflows de production ne conservent ni succès, ni erreur, ni données manuelles ; les erreurs opérationnelles vivent dans les tables privées de jobs et événements.

## Publication restante

Le contrôle automatique a rejeté les déploiements partagés stripe-webhook et bot-reply et la configuration d'email de E : impacts sur paiements/abonnements, fonctions transverses du bot et communications aux clients. Ils sont préparés pour relecture dans la PR de test/streetwear, sans déploiement indirect. La mise à jour de main a aussi été rejetée pour préserver l’isolation des tests ; les changements frontend restent sur la branche. Aucune modification de checkout ou fermeture des ventes n'a été appliquée.

Après autorisation explicite : déployer les seuls handlers modifiés, publier B/C/D/E ensemble avec R, configurer le webhook Telegram unique vers C (messages normaux transmis au bot partagé), ajouter package_shipped à la même URL F, puis vérifier un événement signé et un doublon sur un pilote autorisé. Ne pas publier les vieux exports A.
