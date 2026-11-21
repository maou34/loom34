# LOOM – Les Ours Occitanie Montpellier

Site de l'association LOOM, en ligne sur **[lgbt-loom.fr](https://lgbt-loom.fr)** :
- l'agenda des soirées, avec inscription et paiement via HelloAsso ;
- les actualités ;
- la présentation de l'association et de Monsieur Ours ;
- les albums photos ;
- les partenaires ;
- un formulaire de contact.

Un espace d'administration permet au bureau de tout gérer sans toucher au code.

> Ce dépôt est public. N'y committez jamais de secret (clés, mots de passe, fichiers `.env`).

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Démarrer en local](#démarrer-en-local)
- [Commandes utiles](#commandes-utiles)
- [Base de données](#base-de-données)
- [Mise en ligne](#mise-en-ligne)
- [Surveillance et audits](#surveillance-et-audits)
- [Pour aller plus loin](#pour-aller-plus-loin)

## Fonctionnalités

**Site public**
- Accueil avec la soirée à la une, les prochains événements et les rendez-vous réguliers.
- Agenda filtrable par ville, et fiche de chaque événement. La fiche donne :
  - les tarifs et les places restantes ;
  - l'inscription HelloAsso (intégrée sur ordinateur, en nouvel onglet sur mobile) ;
  - un plan OpenStreetMap ;
  - un lien « Ajouter à mon agenda ».
- Actualités par catégorie, page de l'association (histoire, équipe, contact), palmarès de Monsieur Ours.
- Albums photos avec visionneuse, et partenaires filtrables par catégorie et par ville.
- Mode nuit (par défaut), options d'accessibilité (taille du texte, police OpenDyslexic, contraste renforcé…).
- Installable sur téléphone (PWA).

**Administration** (`/admin`, réservée aux comptes administrateurs)
- Tableau de bord :
  - prochains événements et choses à traiter ;
  - visites (Cloudflare Web Analytics) et santé du site ;
  - résultat de l'audit de sécurité.
- Gestion des événements, articles, partenaires, albums photos, Monsieur Ours, histoire et équipe.
- Réglages de la page d'accueil et des liens Boutique / Adhérer.
- Messages du formulaire de contact, avec alerte par e-mail.
- Gestion des administrateurs par invitation. Les inscriptions publiques sont fermées.

## Architecture

| Élément | Technologie |
|---|---|
| Site (SPA) | React 18, TypeScript, Vite, React Router 7, TanStack Query, Tailwind CSS, shadcn/ui (Radix) |
| Données et comptes | [Supabase](https://supabase.com) : PostgreSQL avec règles d'accès (RLS), Auth, Edge Functions (Deno) |
| Photos | Serveur Express dédié (`server/upload.js`), sur `upload.lgbt-loom.fr`, et non Supabase Storage |
| Billetterie | [HelloAsso](https://www.helloasso.com). Le site ne stocke que des compteurs (places vendues), jamais de données de participants |
| Hébergement | VPS OVH (nginx) pour le site et le serveur de photos ; Supabase pour la base |

Organisation du code :

```
src/
├── pages/            # Pages publiques (Index, Events, EventDetail…) et pages admin (pages/admin/)
├── components/       # Composants par zone : site/, home/, agenda/, event/, asso/, gallery/, admin/, ui/ (shadcn)
├── lib/              # Logique partagée (billetterie, dates, slugs, préparation des photos…)
├── db/               # Client Supabase, types de la base (types.ts) et schéma documenté (*.sql)
├── theme/            # Couleurs (clair / nuit) en variables CSS
└── contexts/, hooks/
server/               # Serveur de photos (envoi, compression, albums) — Node/Express
supabase/functions/   # Edge Functions : synchro HelloAsso, webhook, notifications, statistiques, audit…
scripts/              # Sitemap, outils photos, contrôles du site et des dépendances
```

## Démarrer en local

Prérequis : Node.js 22 et npm.

```bash
npm ci
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:8080
```

Variables d'environnement (`.env.local`, jamais committé) :

```bash
VITE_SUPABASE_URL=https://<projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<clé publique « anon »>
# Facultatif
VITE_UPLOAD_URL=http://localhost:8081                     # serveur de photos (déduit de l'adresse sinon)
VITE_HELLOASSO_BASE_URL=https://www.helloasso-sandbox.com # bac à sable HelloAsso en développement
VITE_HELLOASSO_ORG_SLUG=<organisation HelloAsso>
```

Seules les variables `VITE_…` arrivent dans le navigateur : n'y mettez jamais de clé secrète. Les secrets des Edge Functions se règlent avec `supabase secrets set`.

Pour envoyer des photos en local, lancez aussi le serveur de photos :

```bash
npm run server:upload        # http://127.0.0.1:8081 (a besoin de SUPABASE_URL et SUPABASE_ANON_KEY)
```

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production dans `dist/`, puis génération de `dist/sitemap.xml` |
| `npm run lint` | ESLint |
| `npm run preview` | Sert le build de production en local |
| `npm run server:upload` | Serveur de photos |
| `npm run pull:gallery` | Copie locale des photos du serveur de prod |
| `npm run compress:gallery` | Recompresse les photos déjà en place (simulation par défaut, `-- --write` pour appliquer) |
| `node scripts/site-check.mjs` | Contrôle du site en ligne : pages, liens, images, certificats |
| `node scripts/audit-deps.mjs` | Failles connues dans les dépendances de production |

Il n'y a pas de tests automatisés. Avant chaque mise en ligne, `npm run build` doit passer. Vérifiez aussi les pages modifiées à 390 px et à 1440 px de large, en mode clair et en mode nuit.

## Base de données

- Le schéma de chaque table est documenté dans `src/db/*.sql`, et les types TypeScript dans `src/db/types.ts`, tenus à jour à la main.
- Les nouvelles évolutions de schéma passent par des migrations Supabase (`supabase/migrations/`, branche `feature/supabase-docker`), appliquées avec `supabase db push`.
- Chaque table a ses règles d'accès (RLS) :
  - lecture publique de ce qui est publié ;
  - écriture réservée aux administrateurs ;
  - le formulaire de contact est la seule écriture ouverte aux visiteurs.

  Une nouvelle table sans règles est bloquée en écriture ; une table sans RLS est ouverte à tous. L'audit de sécurité nocturne le signale.

## Mise en ligne

Sur le VPS, dans le dépôt cloné :

```bash
git pull
npm ci                              # seulement si package-lock.json a changé
npm run build                       # le dossier dist/ est servi par nginx
sudo systemctl restart loom-upload  # seulement si server/ ou les dépendances ont changé
```

- Quand une modification touche le site et le serveur de photos, mettez d'abord le site en ligne, puis le serveur.
- Les Edge Functions se déploient à part : `supabase functions deploy <nom>`.
- Ne modifiez jamais de fichier suivi par git directement sur le serveur : le `git pull` suivant serait bloqué.

## Surveillance et audits

- **Chaque nuit**, un audit de sécurité de la base contrôle notamment :
  - la protection RLS de chaque table ;
  - les droits des visiteurs ;
  - la protection du statut administrateur ;
  - la fermeture des inscriptions ;
  - l'apparition d'un nouvel administrateur ou d'un nouveau compte.

  Les administrateurs sont prévenus par e-mail en cas de problème.
- **Chaque lundi**, un workflow GitHub Actions (`.github/workflows/site-audit.yml`) vérifie :
  - les failles des dépendances ;
  - toutes les pages du site rendues dans Chrome, et leurs liens ;
  - les certificats HTTPS ;
  - les scores Lighthouse (accessibilité, bonnes pratiques et SEO bloquants).

  On peut aussi le lancer à la main depuis l'onglet *Actions*.
- **Dependabot** propose chaque mois une pull request groupée de mises à jour mineures, et une pour les correctifs de sécurité.

## Pour aller plus loin

[`CLAUDE.md`](CLAUDE.md) est la documentation technique détaillée, en anglais. On y trouve notamment :
- les décisions sur la billetterie HelloAsso ;
- le fonctionnement du serveur de photos ;
- les règles d'accès de la base ;
- le thème et les pièges connus.

Contact : [contactloom34@gmail.com](mailto:contactloom34@gmail.com).
