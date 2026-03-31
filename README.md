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
- **Stockage**: Supabase Storage
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

## �️ Galerie: stockage d'images en local

La galerie n'utilise plus Supabase Storage. Les images sont servies en statique depuis le dossier `public/gallery` et les enregistrements en base (table `gallery_images`) référencent un chemin relatif.

### Ajouter des images

1. Copiez vos fichiers dans le dépôt dans `public/gallery/<albumId>/` ou `public/gallery/unclassified/` si l'image n'appartient à aucun album.
2. Dans l'admin, page Galerie, utilisez le formulaire « Ajouter une image par chemin » et saisissez le chemin relatif à partir de `/public`, par exemple:
	- `/gallery/<albumId>/mon-fichier.jpg`
	- `/gallery/unclassified/photo.png`
3. Validez pour créer l'enregistrement en base et, si un album est sélectionné, sa couverture est mise à jour automatiquement.

Remarques:
- Les fichiers doivent être committés/déployés avec l'app pour être disponibles en production.
- Aucun serveur d'upload n'est requis ni utilisé.

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
- Optimisation des images avec Supabase Storage
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
