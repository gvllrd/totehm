# n8n · Oracle Cloud

```
Domaine   n8n.higher.boutique   (DNS Vercel, enregistrement A)
Serveur   Oracle Cloud Infrastructure, Ubuntu
Chemin    ~/n8n-server
Rôle      automatisation Totehm Cloth
Fuseau    Europe/Lisbon
```

Connexion :

```bash
ssh -i ~/totehm/oracle/<cle>.key ubuntu@<ip>
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
