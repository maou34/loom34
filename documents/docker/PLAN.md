# Passage de Supabase sur Docker — plan de développement

Rédigé le 20/11/2026, branche `feature/supabase-docker` (partie de `main`). Statut : **phases 1 et 2 faites le 20/11/2026** (CLI Supabase 3.2.0 ; migrations `20261120074827` et `20261120090000` appliquées en prod, secret Vault `project_url` créé, notification et cron vérifiés). Phase 3 en cours depuis le 20/11/2026 : pile installée dans `/opt/supabase` (release self-hosted/v0.8.4), `https://api.lgbt-loom.fr` en HTTPS, migrations appliquées, Vault et fonctions de `main` en place, sync HelloAsso sandbox OK depuis la base. Phases 4 et suivantes : pas commencées.

## Objectif

1. **Développer en local** sur une vraie copie de Supabase (Docker), avec la structure de la base décrite dans git (migrations) au lieu de fichiers `.sql` collés à la main dans la base de production.
2. **Auto-héberger Supabase sur le VPS OVH** (4 vCores, 8 Go de RAM, 75 Go de disque) pour ne plus dépendre de l'offre gratuite de Supabase, avant d'y construire la future base adhérents (HelloAsso ne servira plus qu'aux paiements en ligne).

L'ordre compte : la phase 1 est utile même si l'auto-hébergement ne se fait jamais, et elle rend la suite beaucoup plus simple.

## Ce qui est concerné aujourd'hui

| Élément | Où | Remarque pour la migration |
|---|---|---|
| Base Postgres (tables, RLS, triggers, fonctions SQL) | 17 fichiers `src/db/*.sql` collés à la main | À transformer en migrations ; l'état réel de la prod fait foi (`db pull`), pas les fichiers |
| Comptes (Auth) | schéma `auth` | Les mots de passe suivent la copie ; les sessions non (nouvelle clé JWT) : tout le monde se reconnecte |
| Extensions | `unaccent`, `pg_cron`, `pg_net`, Vault | Présentes dans l'image Postgres de Supabase |
| Secrets en base (Vault) | `sync_events_secret`, `notify_message_secret` | À recréer à la main sur chaque instance (jamais dans git) |
| URL de prod écrite en dur | `helloasso_cron.sql`, `message_notifications.sql` (`https://abqhawhalbrqgtepaclc.supabase.co/functions/v1/…`) | À remplacer par une URL lue dans le Vault, sinon une copie locale appellerait la prod |
| Edge Functions | `admin-users`, `sync-events`, `helloasso-webhook`, `notify-new-message`, `site-stats` (+ `admin-create-user`, à supprimer après la fusion) | Toutes en `verify_jwt = false` (elles vérifient elles-mêmes l'appelant) |
| Secrets des fonctions | HelloAsso, Gmail, Cloudflare, UptimeRobot, secrets de sync/webhook/notification | `supabase secrets` aujourd'hui ; fichier d'environnement sur le VPS demain |
| Réglages Auth du tableau de bord | SMTP Gmail, modèles d'e-mails en français, Site URL, Redirect URLs, inscriptions fermées | À reporter en variables d'environnement (`GOTRUE_*`) et en fichiers de modèles |
| Clients de l'API | le site (`VITE_SUPABASE_URL/ANON_KEY` au build), le serveur d'images (`server/auth.js`), le sitemap (`scripts/generate-seo.js`) | Changent d'URL et de clé à la bascule |
| Appelants externes | webhook HelloAsso (back-office HelloAsso), cron | URL à changer à la bascule |
| Non utilisés | Storage (les photos sont sur le serveur d'images), Realtime | Peuvent être désactivés en auto-hébergé pour économiser la mémoire |

## Phase 1 — Supabase en local (½ à 1 jour)

Branche dédiée, par exemple `feature/supabase-local`.

1. **Configuration complète** : compléter `supabase/config.toml` (aujourd'hui seulement les `verify_jwt`) avec les réglages Auth de la prod : inscriptions fermées, Site URL `http://localhost:8080`, redirection `/auth/update-password`, SMTP remplacé par la boîte mail de test intégrée (Inbucket/Mailpit).
2. **Migration de départ** : `supabase link` puis `supabase db pull` → un premier fichier `supabase/migrations/<date>_baseline.sql` qui décrit **la base de prod telle qu'elle est** (y compris ce qui a été modifié à la main dans le tableau de bord). Relire le fichier : rien de personnel dedans (structure seulement).
3. **Supprimer les URL en dur** : une migration qui fait lire l'URL des fonctions dans le Vault (`project_url`) par le cron et le trigger de notification. En local : `http://kong:8000` ; en prod : l'URL publique.
4. **Données de test** : `supabase/seed.sql` avec du contenu public fictif ou copié de la prod (événements, articles, partenaires, réglages, catégories, histoire, équipe, palmarès). **Jamais** de copie de `contact_tickets`, `profiles` ou `auth.users` ; un compte admin de test créé par le seed.
5. **Fonctions en local** : `supabase functions serve --env-file supabase/.env.local` (fichier non suivi, identifiants **sandbox** HelloAsso uniquement).
6. **Raccourcis npm** : `db:start`, `db:stop`, `db:reset` (recrée la base depuis les migrations + seed), `functions:serve`.
7. **Front en local** : un `.env.development.local` (non suivi) pointant `VITE_SUPABASE_URL` vers `http://127.0.0.1:54321` ; garder la possibilité de repointer vers la prod.
8. **Documentation** : mettre à jour `CLAUDE.md` (nouveau processus) et indiquer en tête de chaque `src/db/*.sql` qu'il est historique.

**Terminé quand** : `npm run db:reset` puis `npm run dev` donnent un site complet en local ; connexion admin, création d'événement, formulaire de contact (e-mail visible dans la boîte de test) et sync HelloAsso sandbox fonctionnent ; `npm run lint` et `npm run build` passent.

## Phase 2 — Nouveau processus pour la base de prod (¼ de jour, puis à l'usage)

La prod reste sur Supabase en ligne pendant cette phase.

1. Marquer la migration de départ comme déjà appliquée en prod (`supabase migration repair --status applied <version>`).
2. Désormais, tout changement de structure : `supabase migration new <nom>` → test en local avec `db:reset` → relecture → **feu vert de Florent** → `supabase db push` vers la prod (remplace le copier-coller dans le SQL Editor).
3. Les secrets Vault restent créés à la main, une fois par instance.

**Terminé quand** : au moins une vraie modification de la base est passée par ce circuit sans accroc.

## Phase 3 — Supabase auto-hébergé sur le VPS, en parallèle (2 à 3 jours)

L'instance en ligne continue de servir le site pendant toute la phase.

1. **Prérequis** : vérifier la mémoire et le disque libres (bloc « Santé du site »), la version majeure de Postgres de la prod (même version en auto-hébergé), et l'existence d'un instantané OVH récent.
2. **Installation** : le `docker-compose` officiel de Supabase dans `/opt/supabase` (**hors** du dépôt `/var/www/loom34`), version des images figée, `.env` généré sur place (mot de passe Postgres, secret JWT, clés anon/service_role, mot de passe du Studio) ; ce fichier ne quitte pas le serveur, sauf vers le gestionnaire de mots de passe de l'asso.
3. **Alléger** : retirer les services non utilisés (Storage, imgproxy, Realtime ; Analytics/Logflare si la mémoire est juste, au prix des journaux dans le Studio).
4. **Réseau et sécurité** :
   - publier tous les ports Docker **sur 127.0.0.1 uniquement** — Docker contourne le pare-feu UFW pour les ports publiés sur toutes les interfaces ;
   - une seule entrée publique : `api.lgbt-loom.fr` (nom à valider) → nginx + certbot → Kong ;
   - Postgres et le Studio jamais exposés : accès par tunnel SSH (`ssh -L`) ;
   - fail2ban déjà en place ; ajouter une sonde UptimeRobot sur l'API.
5. **Auth** : SMTP Gmail (port 465), modèles d'e-mails en français servis en fichiers, Site URL et Redirect URLs, inscriptions fermées.
6. **Base** : appliquer les migrations (`supabase db push --db-url …` via le tunnel), créer les secrets Vault (`project_url` = `http://kong:8000`, secrets de sync et de notification).
7. **Fonctions** : copier `supabase/functions` dans le volume du conteneur Edge Runtime, renseigner leurs secrets dans l'environnement du conteneur (identifiants sandbox HelloAsso pendant les essais), vérification JWT désactivée (toutes les fonctions la font elles-mêmes). Écrire un petit script de déploiement (copie + redémarrage du conteneur) qui remplace `supabase functions deploy`.
8. **Mises à jour** : noter la procédure (`docker compose pull` + redémarrage, lecture préalable des notes de version) et la fréquence (mensuelle).

**Terminé quand** : un front local pointé sur `api.lgbt-loom.fr` fonctionne avec des données de test ; la mémoire du VPS reste sous 80 % avec le site, le serveur d'images et Supabase.

## Phase 4 — Répétition de la migration (1 jour)

1. Copier les données de prod vers l'instance du VPS : `pg_dump` des données (schémas `public` et `auth`), restauration, puis recréation des secrets Vault et du cron. Transfert par SSH uniquement, fichiers de dump supprimés ensuite.
2. Pointer un front local et un serveur d'images local sur l'instance du VPS, et dérouler la liste de tests :
   - pages publiques (agenda, actualités, photos, partenaires, Monsieur Ours, redirections d'anciennes adresses) ;
   - connexion admin, mot de passe oublié (e-mail reçu, lien valide), invitation d'un admin ;
   - formulaire de contact → e-mail de notification ;
   - envoi de photos (le serveur d'images vérifie le jeton auprès de la nouvelle API) ;
   - sync HelloAsso sandbox, webhook (achat sandbox), cron toutes les 15 min ;
   - tableau de bord : visites, santé du site, état du serveur.
3. Chronométrer la copie pour prévoir la durée de la bascule.

## Phase 5 — Sauvegardes (½ jour, obligatoire avant la bascule)

Une fois hors de Supabase en ligne, plus personne ne sauvegarde la base à votre place. Minimum : `pg_dump` nocturne chiffré (clé publique sur le VPS, clé privée hors du serveur) envoyé hors du VPS (Drive de l'association avec rclone), rotation, et **une restauration testée**. Détails à préciser le moment venu.

## Phase 6 — Bascule (une soirée)

1. Prévenir les admins ; geler les modifications dans l'admin.
2. **Couper le cron de Supabase en ligne** (sinon deux instances synchronisent HelloAsso).
3. Copie finale des données (procédure répétée en phase 4).
4. Changer les URL et clés :
   - `.env` du site sur le VPS (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) puis `npm run build` ;
   - `.env` du serveur d'images puis `sudo systemctl restart loom-upload` ;
   - URL du webhook dans le back-office HelloAsso ;
   - identifiants HelloAsso de **production** dans l'environnement des fonctions.
5. Dérouler la liste de tests de la phase 4 sur le vrai site.
6. Surveiller une semaine (UptimeRobot, journaux, mémoire).

**Retour arrière** : tant que l'instance en ligne n'est pas supprimée, revenir = remettre les anciennes valeurs dans les `.env`, rebuild, remettre l'ancien webhook et réactiver l'ancien cron. Les modifications faites entre-temps sur le VPS seraient à reporter à la main.

## Phase 7 — Après

1. Garder l'instance Supabase en ligne en secours 2 à 4 semaines, puis la supprimer (après une dernière sauvegarde).
2. Mettre à jour `CLAUDE.md` (URL, déploiement des fonctions, procédure de mise à jour) et la mémoire du projet.
3. Seulement ensuite : concevoir la base adhérents (données strictement nécessaires, accès, durée de conservation, registre RGPD).

## Estimation

| Phase | Durée |
|---|---|
| 1. Supabase local | ½ à 1 jour |
| 2. Processus de migrations | ¼ de jour |
| 3. Installation sur le VPS | 2 à 3 jours |
| 4. Répétition | 1 jour |
| 5. Sauvegardes | ½ jour |
| 6. Bascule | une soirée |
| **Total** | **environ 5 à 6 jours de travail**, étalés |

Les phases 1 et 2 peuvent se faire seules et s'arrêter là si l'auto-hébergement est reporté.

## Décisions à prendre

- Nom de domaine de l'API (`api.lgbt-loom.fr` ?).
- Services à retirer (Analytics/Logflare : journaux du Studio contre mémoire).
- Qui garde les secrets (mot de passe Postgres, clés, clé privée des sauvegardes) — au moins deux personnes du bureau.
- Date de la bascule (période calme, pas la veille d'un événement en billetterie).

## Risques principaux

- **Sécurité à la charge de l'association** : mises à jour, exposition des ports, secrets. Le point Docker/UFW est le piège le plus courant.
- **Tout sur un seul VPS** : site, photos et base tombent ensemble → sauvegardes hors VPS indispensables.
- **Écarts entre la prod et les fichiers `src/db/*.sql`** : réglés en partant de `db pull` et non des fichiers.
- **Fonctionnalités du tableau de bord Supabase absentes** du Studio auto-hébergé (gestion fine des comptes, journaux) : l'admin du site (`/admin/users`) couvre déjà l'essentiel.
