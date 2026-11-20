# Supabase auto-hébergé sur le VPS — installation (phase 3)

Plan d'ensemble : `documents/docker/PLAN.md`. Ce dossier contient tout ce qui est propre à LOOM ; le reste vient de la **release officielle `self-hosted/v0.8.4`** de Supabase (testée en local le 20/11/2026 : 7 services, ~700 Mo de mémoire, migrations appliquées sans erreur).

| Fichier | Rôle |
|---|---|
| `docker-compose.loom.yml` | Surcouche : passerelle et Postgres publiés sur **127.0.0.1 seulement**, Realtime/Storage/imgproxy/Supavisor désactivés, secrets des fonctions lus dans `functions.env` |
| `env.loom` | Réglages LOOM (adresses, Auth, SMTP) à reporter dans le `.env` généré, **sans écraser les secrets** |
| `apply-env.sh` | Reporte `env.loom` dans `.env` (ignore les valeurs encore à remplir `<…>`) |
| `functions.env.example` | Modèle des secrets des Edge Functions |
| `deploy-functions.sh` | Copie `supabase/functions/*` dans le volume des fonctions et les redémarre |
| `nginx/api.lgbt-loom.fr.conf` | nginx de l'hôte : seules `/auth/v1`, `/rest/v1`, `/functions/v1` sont publiques |

Emplacements sur le VPS : la pile dans **`/opt/supabase`** (hors du dépôt `/var/www/loom34`), les fichiers LOOM publiés par nginx dans `/opt/supabase-loom/`.

Règles de sécurité :
- **jamais de port Docker publié sur 0.0.0.0** (Docker contourne UFW) ; vérifier avec `sudo ss -ltnp` ;
- Postgres (`127.0.0.1:5433`) et le Studio (`127.0.0.1:8000`) ne sont joignables que par **tunnel SSH** ;
- `/opt/supabase/.env` et `functions.env` en droits 600, jamais copiés ailleurs que dans le gestionnaire de mots de passe de l'asso.

## Étapes

### 0. DNS (OVH)
Enregistrement `A` : `api.lgbt-loom.fr` → `54.37.159.129` (même type que `upload.lgbt-loom.fr`). Vérifier : `dig +short api.lgbt-loom.fr`.

### 1. Installation de la pile officielle
```bash
cd /tmp && curl -fsSLo setup.sh https://raw.githubusercontent.com/supabase/supabase/self-hosted/v0.8.4/docker/setup.sh
less setup.sh                       # relire avant d'exécuter
cd /opt && sudo sh /tmp/setup.sh --ref self-hosted/v0.8.4 --project-dir supabase
```
`setup.sh` installe Docker s'il manque, copie la release dans `/opt/supabase` et **génère tous les secrets** (mot de passe Postgres, clés JWT, mot de passe du Studio). Questions posées : `SUPABASE_PUBLIC_URL` → `https://api.lgbt-loom.fr` ; `API_EXTERNAL_URL` → Entrée (valeur proposée) ; `SITE_URL` → `https://lgbt-loom.fr` ; `PROXY_DOMAIN` → Entrée (on utilise le nginx déjà installé, pas celui de Supabase). Le script ne démarre rien.

### 2. Réglages LOOM
Le kit est copié sur le serveur dans `~/supabase-loom` (depuis le poste : `scp -r deploy/supabase ubuntu@54.37.159.129:supabase-loom`).
```bash
cd /opt/supabase
sudo cp ~/supabase-loom/docker-compose.loom.yml .
cp ~/supabase-loom/env.loom /tmp/env.loom && nano /tmp/env.loom    # remplir les <…> (SMTP)
sudo sh ~/supabase-loom/apply-env.sh /tmp/env.loom .env && rm /tmp/env.loom
sudo cp ~/supabase-loom/functions.env.example functions.env && sudo nano functions.env && sudo chmod 600 functions.env
sudo sh run.sh start
sudo ss -ltnp | grep -E ':(8000|5433) '     # doit montrer 127.0.0.1 uniquement
```

### 3. nginx + HTTPS
```bash
sudo cp ~/supabase-loom/nginx/api.lgbt-loom.fr.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.lgbt-loom.fr.conf /etc/nginx/sites-enabled/
sudo mkdir -p /opt/supabase-loom/email-templates
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.lgbt-loom.fr
```

### 4. Structure de la base (depuis le poste)
```bash
ssh -N -L 5433:127.0.0.1:5433 ubuntu@54.37.159.129        # terminal 1 : tunnel
read -s PGPW                                               # terminal 2 : coller POSTGRES_PASSWORD (non affiché)
supabase db push --remote "postgresql://postgres:$PGPW@127.0.0.1:5433/postgres"
```

### 5. Secrets du Vault (sur le serveur)
L'adresse interne des fonctions, puis les deux secrets partagés **lus directement dans `functions.env`** (les recopier à la main a donné un 401 lors de l'installation du 20/11/2026). À l'invite du serveur (`ubuntu@…$`), pas dans psql :
```bash
sudo docker exec supabase-db psql -U postgres -c "SELECT vault.create_secret('http://kong:8000', 'project_url')"
for n in SYNC_EVENTS_SECRET:sync_events_secret NOTIFY_MESSAGE_SECRET:notify_message_secret; do
  V=$(sudo grep "^${n%%:*}=" /opt/supabase/functions.env | cut -d= -f2- | tr -d '\r\n')
  echo "SELECT vault.create_secret(:'v', '${n#*:}');" \
    | sudo docker exec -i supabase-db psql -U postgres -At -v v="$V" >/dev/null && echo "${n#*:} créé"
done; unset V
```
(Pour corriger un secret existant : même boucle avec `SELECT vault.update_secret(id, :'v') FROM vault.secrets WHERE name = '…'`.) Vérifier par empreintes (le ` -` final de `md5sum` est normal) :
```bash
sudo grep -E '^(SYNC_EVENTS|NOTIFY_MESSAGE)_SECRET=' /opt/supabase/functions.env | cut -d= -f2- | while read -r v; do printf %s "$v" | md5sum; done
sudo docker exec supabase-db psql -U postgres -At -c "SELECT md5(decrypted_secret) FROM vault.decrypted_secrets WHERE name IN ('sync_events_secret','notify_message_secret') ORDER BY name DESC"
```

### 6. Fonctions
```bash
sudo REPO=/var/www/loom34 sh ~/supabase-loom/deploy-functions.sh
```

### 7. Studio (tableau de bord)
`ssh -N -L 8000:127.0.0.1:8000 ubuntu@54.37.159.129` puis http://localhost:8000 (identifiants : `sudo sh /opt/supabase/run.sh secrets`).

### 8. Ranger les secrets
`sudo sh /opt/supabase/run.sh secrets` → copier dans le gestionnaire de mots de passe de l'asso (deux personnes du bureau).

## Plus tard (avant la bascule)
- Modèles d'e-mails en français : fichiers dans `/opt/supabase-loom/email-templates/` + variables `GOTRUE_MAILER_TEMPLATES_*` / `GOTRUE_MAILER_SUBJECTS_*` sur le service `auth`.
- Sauvegardes chiffrées hors du VPS (phase 5).
- Mises à jour : `sh update.sh --dry-run`, puis `sh update.sh && sh run.sh pull && sh run.sh recreate` (après sauvegarde).
