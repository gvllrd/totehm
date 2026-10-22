# n8n · Oracle Cloud

## Essais Streetwear

Depuis la racine du dépôt :

```bash
node tests/n8n/streetwear/offline.mjs
```

Le banc exécute les Code nodes des exports archivés dans `tests/n8n/streetwear/snapshots/`.
Les requêtes HTTP et les RPC de base sont simulées ; aucun secret ni accès réseau n'est fourni.
Le résultat est écrit dans `tests/n8n/streetwear/results.json`. Les versions de source sont dans chaque
snapshot. Le modèle E préparé provient du commit `7bdd1223c2469f0d9bf5f3108e6959ad4dd27fb2`.

59 scénarios passent : refus anonymes, décisions de réservation, sept concepts, reprise de notification,
reprise d'agrandissement, brouillon Printful, métadonnées/photos du catalogue et suivi préparé.
Les décisions des RPC sont simulées : ce banc ne valide ni les verrous PostgreSQL ni les fournisseurs réels.

Les six défauts détectés sont des blocages, pas des succès de la chaîne : CONFIG publié avec `process.env`
dans B/C/D/E ; brouillon E sans vérification d'origine ni exclusion TEST ; distribution des expéditions
par F encore arrêtée avant E. Le E préparé est testé séparément et n'est pas publié.

F publié reste le catalogue corrigé. B/C/D/E doivent être raccordés et publiés ensemble avec un
`stripe-webhook` qui authentifie son appel à B. La réception Telegram et la distribution Printful sont
à raccorder dans le même lot, en conservant les autres usages du bot partagé.

Le contrôle manuel T vérifie des booléens sans envoyer de message ni de commande. Ses contrôles de
protection peuvent passer alors que `stripe_test_key`, `stripe_test_webhook` ou Telegram restent absents.
Les deux secrets Stripe TEST doivent être installés côté Supabase avant un achat fictif.
Une pièce TEST reste exclue de génération et de fabrication ; le pilote fournisseurs est distinct,
avec coût plafonné, commandes Printful en brouillon et expédition simulée vers une adresse de test.

---

```
Domaine   n8n.higher.boutique   (DNS Vercel, enregistrement A)
Serveur   Oracle Cloud Infrastructure, Ubuntu
Chemin    ~/n8n-server
Rôle      automatisation Totehm Cloth
Fuseau    Europe/Lisbon
```

Connexion :

```bash
ssh -i ~/totehm/oracle/oracle-vm-ssh ubuntu@<ip>
```

Les clés SSH restent dans `~/totehm/oracle/` en `chmod 400`, gitignoré.
**Ne jamais les déplacer dans `backend/`.**

---

## Caddyfile

```
n8n.higher.boutique {
    reverse_proxy n8n:5678
}
```

Caddy obtient et renouvelle le certificat TLS tout seul, à condition
que le DNS pointe correctement et que les ports 80 et 443 soient ouverts.

---

## .env — sur le serveur uniquement

```bash
N8N_USER=...
N8N_PASSWORD=...
N8N_ENCRYPTION_KEY=...     # openssl rand -hex 32
```

Sans `N8N_ENCRYPTION_KEY` fixe, n8n en génère une au démarrage et
**tous tes credentials deviennent illisibles au redémarrage suivant**.

---

## ⚠️ Deux points à traiter avant d'y faire passer des commandes

**1. L'IP publique est éphémère.**
Sur OCI, une IP éphémère est libérée si l'instance est arrêtée ou
redémarrée, et tu en récupères une différente. L'enregistrement A
pointe alors dans le vide, Caddy ne renouvelle plus son certificat,
et **tous les webhooks tombent en silence** — commandes perdues,
aucune alerte.

Correction : OCI → Networking → Reserved public IPs → réserver,
puis assigner à la VNIC. Gratuit tant qu'elle est attachée, 5 minutes.

**2. Ubuntu 20.04 est en fin de vie** (avril 2025).
Plus de correctifs de sécurité sur une machine exposée en 80/443
qui recevra des webhooks de paiement. Pas urgent, mais à planifier :
22.04 ou 24.04.

---

## Frontière avec Supabase

n8n **n'accorde jamais** l'accès Higher. Cette décision appartient
exclusivement à `stripe-webhook` et à la table `stoner_access`.

n8n s'occupe de Totehm Cloth : génération d'image, upscale, Printful,
email de confirmation. Deux systèmes, deux responsabilités, aucun
recouvrement.
