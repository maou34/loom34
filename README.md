# LOOM - Les Ours Occitanie Montpellier

## 🚀 Vue d'ensemble

LOOM est une application web moderne pour l'association Les Ours Occitanie Montpellier, construite avec React et TypeScript.

## 🛠️ Stack Technique

### Frontend
- **Framework**: React 18 avec TypeScript
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **UI Components**: Shadcn/ui (basé sur Radix UI)
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Icons**: Lucide React

### Backend & Services
- **Base de données**: Supabase (PostgreSQL)
- **Authentification**: Supabase Auth
- **Stockage des images**: serveur Express dédié (`server/upload.js`), pas Supabase Storage — voir la section Galerie ci-dessous
- **API**: REST avec Supabase

## 📁 Structure du Projet

```
src/
├── components/         # Composants réutilisables
│   ├── admin/         # Composants spécifiques à l'admin
│   ├── auth/          # Composants d'authentification
│   ├── ui/            # Composants UI de base
│   └── shared/        # Composants partagés
├── contexts/          # Contextes React
├── hooks/             # Hooks personnalisés
├── lib/               # Utilitaires et configurations
├── pages/             # Pages de l'application
│   ├── admin/         # Pages du panneau d'administration
│   ├── auth/          # Pages d'authentification
│   └── public/        # Pages publiques
└── types/             # Types TypeScript
```

## 🔐 Authentification

- Système d'authentification complet avec Supabase
- Rôles utilisateurs : Admin et Utilisateur standard
- Protection des routes admin avec `RequireAuth` et `RequireAdmin`
- Gestion des sessions persistantes

## 🎨 Fonctionnalités Principales

### Public
- Galerie de photos
- Liste des événements
- Articles et actualités
- Page "Monsieur Ours"
- Liste des partenaires
- Formulaire de contact
- Redirection vers HelloAsso (adhésion et boutique)

### Administration
- Dashboard avec statistiques
- Gestion des articles (CRUD)
- Gestion des événements (CRUD)
- Gestion de la galerie photos
- Gestion des utilisateurs
- Gestion des tickets de contact

## 🗄️ Galerie: stockage d'images en local

La galerie n'utilise plus Supabase Storage. Les images sont servies en statique depuis `public/gallery` par un serveur Express dédié (`server/upload.js`, `npm run server:upload`, port 8081 en dev), et les enregistrements en base (table `gallery_images`) référencent un chemin relatif (ex: `/gallery/<albumId>/photo.jpg`).

### Ajouter des images

Dans l'admin (page Galerie, ou HomeSettings/Articles/Events pour leurs images dédiées), le composant `ImageUpload` envoie le fichier au serveur d'upload. Celui-ci le redimensionne et le recompresse automatiquement avant de l'écrire sur disque (voir « Compression des images » ci-dessous) — aucune manipulation manuelle de fichiers n'est nécessaire.

En dev, Vite proxifie `/upload` vers `localhost:8081` (voir `vite.config.ts`) ; en prod, l'upload part vers `upload.lgbt-loom.fr`, un déploiement séparé du site principal.

Remarque: seul `public/gallery/images/` (assets statiques du site, ex. l'image de secours du hero) est committé dans le repo — voir `.gitignore`. Les autres albums vivent uniquement sur le disque du serveur d'upload ; utilisez `npm run pull:gallery` pour en récupérer une copie locale (voir plus bas).

### Compression des images

Chaque upload est automatiquement redimensionné (2400px max sur le plus grand côté, jamais agrandi) et recompressé (JPEG/WebP qualité 82, PNG compression max) par `server/imageCompression.js`, partagé par le serveur d'upload et par le script `scripts/compress-gallery.js` :

```bash
npm run compress:gallery              # dry-run: affiche les gains projetés sans rien modifier
npm run compress:gallery -- --write    # applique la compression aux images déjà présentes dans public/gallery
```

Le script est idempotent (n'écrase un fichier que si le résultat est plus léger) et peut être relancé sans risque.

### Récupérer les images depuis le serveur

`scripts/pull-gallery.js` télécharge toutes les images d'un serveur d'upload en cours d'exécution (prod par défaut) vers `public/gallery/` en local :

```bash
npm run pull:gallery                                          # depuis https://upload.lgbt-loom.fr
PULL_UPLOAD_URL=http://localhost:8081 npm run pull:gallery    # depuis un serveur d'upload local
npm run pull:gallery -- --force                                # re-télécharge même les fichiers déjà présents
```

Incrémental par défaut (ignore les fichiers déjà présents localement).

### Migration depuis Supabase Storage

Un script de migration est fourni pour rapatrier les images existantes de Supabase vers `public/gallery` et mettre à jour les chemins dans la base.

Pré-requis variables d'environnement:

```
VITE_SUPABASE_URL=...           # requis
SUPABASE_SERVICE_ROLE_KEY=...   # recommandé pour mettre à jour la base automatiquement
VITE_SUPABASE_ANON_KEY=...      # utilisé si pas de service role (mise à jour manuelle)
```

Exécution:

```
npm run migrate:gallery
```

Ce script:
- Télécharge les images référencées par des URLs Supabase.
- Les enregistre sous `public/gallery/<albumId|unclassified>/`.
- Si `SUPABASE_SERVICE_ROLE_KEY` est fourni, met à jour `gallery_images.image_url` et `gallery_albums.cover_image` avec les chemins relatifs (ex: `/gallery/<albumId>/file.jpg`).
- Sinon, il génère un rapport JSON `scripts/migrate-gallery-report.json` à appliquer manuellement.

## �🔄 Navigation

- Navigation forcée avec rechargement complet pour garantir la stabilité de la connexion Supabase
- Titres de page dynamiques pour chaque route
- Protection des routes sensibles

## 🚀 Déploiement

Le site est déployé sur Vercel avec les configurations suivantes :
- Build automatique à chaque push
- Variables d'environnement pour les clés Supabase
- Optimisation des performances

## 🔧 Configuration Requise

```bash
# Variables d'environnement (.env)
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

## 📦 Installation

```bash
# Installation des dépendances
npm install

# Démarrage en développement
npm run dev

# Build pour production
npm run build
```

## 🛠️ Maintenance

- Mise à jour régulière des dépendances
- Sauvegarde automatique de la base de données Supabase
- Monitoring des performances via Vercel Analytics

### Migration galerie vers stockage local

La galerie photos n'utilise plus Supabase Storage. Les fichiers sont servis depuis `public/gallery` et les chemins stockés en base sont relatifs (ex: `/gallery/<albumId>/photo.jpg`).

Outils fournis:

- Script de migration: `scripts/migrate-gallery.js`
	- Télécharge les images distantes (URL http/https) référencées dans `gallery_images.image_url` vers `public/gallery/<albumId|unclassified>/`
	- Télécharge les covers d'albums (si URL distante) vers `public/gallery/<albumId>/`
	- Met à jour la base (si `SUPABASE_SERVICE_ROLE_KEY` présent) ou génère un rapport `.json` et `.sql` sinon
	- Options: `--dry-run` (ne fait que préparer les changements, sans téléchargement ni update DB)

Utilisation:

```powershell
# PowerShell (Windows)
$env:VITE_SUPABASE_URL="https://<your>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
npm run migrate:gallery

# Mode simulation (dry-run)
npm run migrate:gallery -- --dry-run
```

Après migration, vous pouvez supprimer les fichiers du bucket Supabase si nécessaire (optionnel), et déployer le site avec les fichiers statiques désormais inclus dans `public/gallery`.

## 📝 Notes Techniques

- Utilisation de React Query pour la gestion du cache et des requêtes
- Compression automatique des images à l'upload (voir section Galerie)
- Gestion des erreurs globalisée
- Support multilingue (préparé pour internationalisation)

## 🔍 SEO

- Meta tags dynamiques
- Sitemap généré automatiquement
- Structure sémantique HTML5
- Optimisation des images et du contenu

## 🤝 Contribution

1. Fork du projet
2. Création d'une branche (`git checkout -b feature/AmazingFeature`)
3. Commit des changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouverture d'une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.
