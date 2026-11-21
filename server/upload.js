import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { compressImage, detectImageFormat } from './imageCompression.js';
import { authConfigured, requireAdmin } from './auth.js';
import { serverStatus } from './status.js';

const app = express();

/**
 * CORS
 * - Autorise explicitement lgbt-loom.fr + environnements locaux
 * - Autorise aussi les sous-domaines *.lgbt-loom.fr
 * - IMPORTANT: ne renvoie qu'UNE seule origine (jamais une liste)
 */
const allowedOrigins = new Set([
  'https://lgbt-loom.fr',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://localhost:8081'
]);

const corsOptions = {
  origin(origin, callback) {
    // Requêtes sans Origin (curl, healthchecks, etc.)
    if (!origin) return callback(null, true);

    try {
      // Autoriser les sous-domaines *.lgbt-loom.fr (https uniquement)
      const url = new URL(origin);
      const isSubdomain =
        url.protocol === 'https:' &&
        (url.hostname === 'lgbt-loom.fr' || url.hostname.endsWith('.lgbt-loom.fr'));

      if (allowedOrigins.has(origin) || isSubdomain) {
        return callback(null, true);
      }

      // En production, il vaut mieux refuser ici. Pour l'instant on refuse (sécurise).
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    } catch {
      return callback(new Error(`Invalid Origin header: ${origin}`));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
// Préflight global
app.options('*', cors(corsOptions));

const PORT = Number(process.env.UPLOAD_PORT || 8081);
// Écoute uniquement en local : nginx fait le proxy depuis l'extérieur (UPLOAD_HOST pour changer)
const HOST = process.env.UPLOAD_HOST || '127.0.0.1';
const ROOT_DIR = path.resolve(process.cwd(), 'public', 'gallery');

console.log('Serving gallery from:', ROOT_DIR);
if (!authConfigured) {
  console.warn('⚠ SUPABASE_URL / SUPABASE_ANON_KEY absents : les routes d\'écriture (upload, création / suppression) sont refusées.');
}

// Servir les fichiers statiques de la galerie
app.use('/gallery', express.static(ROOT_DIR));

fs.mkdirSync(ROOT_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 100 },
  // Images uniquement : un .html / .js / .svg déposé serait ensuite servi tel quel
  // depuis upload.lgbt-loom.fr (contenu piégé sur notre domaine)
  fileFilter(req, file, cb) {
    const okExt = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname || '');
    const okMime = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype || '');
    if (okExt && okMime) return cb(null, true);
    const err = new Error(`Type de fichier refusé : ${decodeOriginalName(file.originalname)}`);
    err.status = 400;
    return cb(err);
  }
});

/**
 * Helpers de sanitation
 * NOTE: sanitizeAlbumId ne remplace pas les espaces/quotes -> il garde le nom tel quel
 * (sauf path traversal). C'est OK mais il faut URL-encoder côté front.
 */
function sanitizeSegment(seg) {
  return String(seg || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents retirés : « Été » -> « Ete » (et non « __t »)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 128) || 'unclassified';
}

/**
 * Nom de fichier envoyé par le navigateur. Busboy (sous multer) le lit en latin1 alors
 * que les navigateurs l'envoient en UTF-8 : « Été » arrivait en « Ã\u0089tÃ© ». On le
 * relit en UTF-8, sauf si ça produit des caractères invalides (nom déjà correct).
 */
function decodeOriginalName(name) {
  const raw = String(name || '');
  const utf8 = Buffer.from(raw, 'latin1').toString('utf8');
  return utf8.includes('\uFFFD') ? raw : utf8;
}

function sanitizeAlbumId(seg) {
  if (!seg) return 'unclassified';
  const s = String(seg);
  const safe = path.basename(s);
  if (safe === '.' || safe === '..') return 'unclassified';
  return safe;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function uniquePath(dir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext) || 'image';
  let candidate = `${base}${ext}`;
  let i = 1;

  while (true) {
    try {
      await fsp.access(path.join(dir, candidate), fs.constants.F_OK);
      candidate = `${base}-${i}${ext}`;
      i++;
    } catch {
      return path.join(dir, candidate);
    }
  }
}

/**
 * Handlers
 * On supporte /upload ET /upload/ pour éviter les 301 "trailing slash"
 * (typiquement ajoutés par proxy / CDN) qui cassent CORS sur les POST.
 */
async function uploadHandler(req, res) {
  try {
    const albumIdRaw = ((req.query.albumId || req.body?.albumId || '').toString()).trim();
    const albumSeg = albumIdRaw ? sanitizeAlbumId(albumIdRaw) : 'unclassified';

    const targetDir = path.join(ROOT_DIR, albumSeg);
    await ensureDir(targetDir);

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files' });

    // Contenu vérifié avant toute écriture : un seul fichier qui n'est pas une vraie image refuse tout l'envoi
    for (const file of files) {
      if (!(await detectImageFormat(file.buffer))) {
        return res.status(400).json({ error: `« ${path.basename(decodeOriginalName(file.originalname) || 'fichier')} » n'est pas une image JPG, PNG, GIF ou WebP valide` });
      }
    }

    const items = [];
    for (const file of files) {
      const original = path.basename(decodeOriginalName(file.originalname) || 'image.jpg');
      const safeBase = sanitizeSegment(original.replace(/\.[^.]+$/, ''));
      const ext = path.extname(original).toLowerCase() || '.jpg';

      const out = await uniquePath(targetDir, `${safeBase}${ext}`);
      const compressedBuffer = await compressImage(file.buffer, ext);
      await fsp.writeFile(out, compressedBuffer);

      const finalName = path.basename(out);
      const relativePath = `/gallery/${albumSeg}/${finalName}`;
      items.push({ filename: finalName, relativePath });
    }

    return res.json({ items });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).send(err?.message || 'Server error');
  }
}

// Écritures : admin connecté uniquement (vérifié AVANT de lire les fichiers envoyés).
// Lectures (GET) : publiques, pour la page Photos du site.
app.post('/upload', requireAdmin, upload.array('files'), uploadHandler);
app.post('/upload/', requireAdmin, upload.array('files'), uploadHandler);

/**
 * List albums (directories)
 */
app.get('/upload/albums', async (req, res) => {
  try {
    const entries = await fsp.readdir(ROOT_DIR, { withFileTypes: true });
    const albums = [];

    for (const dirent of entries) {
      if (!dirent.isDirectory()) continue;

      const albumId = dirent.name;
      const albumPath = path.join(ROOT_DIR, albumId);

      let coverImage = null;
      let imageCount = 0;

      try {
        const files = await fsp.readdir(albumPath);
        const images = files.filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
        imageCount = images.length;
        if (images.length > 0) coverImage = `/gallery/${albumId}/${images[0]}`;
      } catch {
        // ignore
      }

      albums.push({
        id: albumId,
        title: albumId,
        cover_image: coverImage,
        image_count: imageCount
      });
    }

    return res.json(albums);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Create album (directory)
 */
app.post('/upload/albums', requireAdmin, express.json(), async (req, res) => {
  try {
    // Nom normalisé ici aussi (un onglet d'admin ouvert avant une mise à jour peut
    // envoyer un nom brut) : un espace final créait un album « X » vide à côté de
    // « X », puisque l'envoi des photos, lui, retire les espaces (21/11/2026).
    const title = String(req.body?.title || '')
      .normalize('NFC')
      .replace(/[\\/]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) return res.status(400).json({ error: "Nom d'album manquant" });

    const safeName = sanitizeAlbumId(title);
    const existing = (await fsp.readdir(ROOT_DIR, { withFileTypes: true }))
      .find((d) => d.isDirectory() && d.name.normalize('NFC').trim().toLowerCase() === safeName.toLowerCase());
    if (existing) return res.status(409).json({ error: `Un album « ${existing.name.trim()} » existe déjà` });

    await ensureDir(path.join(ROOT_DIR, safeName));
    return res.json({ id: safeName, title: safeName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Delete album
 */
app.delete('/upload/albums/:id', requireAdmin, async (req, res) => {
  try {
    const safeName = sanitizeAlbumId(req.params.id);
    const target = path.join(ROOT_DIR, safeName);
    await fsp.rm(target, { recursive: true, force: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * List images in album
 */
app.get('/upload/albums/:id/images', async (req, res) => {
  try {
    const safeName = sanitizeAlbumId(req.params.id);
    const target = path.join(ROOT_DIR, safeName);

    try {
      await fsp.access(target);
    } catch {
      return res.json([]);
    }

    const files = await fsp.readdir(target);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map((f) => ({
        id: f,
        title: f,
        image_url: `/gallery/${safeName}/${f}`,
        album_id: safeName
      }));

    return res.json(images);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Delete image
 */
app.delete('/upload/images', requireAdmin, express.json(), async (req, res) => {
  try {
    const { albumId, filename } = req.body || {};
    if (!albumId || !filename) return res.status(400).json({ error: 'Missing params' });

    const safeAlbum = sanitizeAlbumId(albumId);
    const safeFile = path.basename(filename);
    const target = path.join(ROOT_DIR, safeAlbum, safeFile);

    await fsp.unlink(target);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// État du serveur pour le tableau de bord de l'admin (disque, mémoire, certificat,
// dernier déploiement) : réservé aux admins, ces informations n'ont pas à être publiques.
app.get('/upload/status', requireAdmin, async (req, res) => {
  try {
    res.json(await serverStatus());
  } catch (err) {
    console.error('Status error', err);
    res.status(500).json({ error: 'Status error' });
  }
});

// Erreurs (fichier refusé, taille dépassée, CORS…) -> réponse JSON propre
app.use((err, req, res, next) => { // 4 paramètres obligatoires pour un gestionnaire d'erreurs Express
  // Envoi coupé avant la fin (connexion perdue, ou Safari sur iPhone qui tronquait
  // les photos converties) : erreur du côté de l'envoi, pas du serveur
  if (/Unexpected end of form/i.test(err.message || '')) {
    console.warn('Envoi interrompu :', req.method, req.originalUrl);
    return res.status(400).json({ error: "Envoi interrompu avant la fin : vérifiez la connexion et réessayez" });
  }
  // Origine refusée par CORS : un navigateur d'un autre site, pas une panne
  if (/^Origin not allowed by CORS|^Invalid Origin header/.test(err.message || '')) {
    return res.status(403).json({ error: err.message });
  }
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  if (status >= 500) console.error('Unhandled error', err);
  res.status(status).json({ error: err.message || 'Server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Upload server listening on http://${HOST}:${PORT}`);
});