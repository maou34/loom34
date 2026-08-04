import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import sharp from 'sharp';

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
const ROOT_DIR = path.resolve(process.cwd(), 'public', 'gallery');

console.log('Serving gallery from:', ROOT_DIR);

// Servir les fichiers statiques de la galerie
app.use('/gallery', express.static(ROOT_DIR));

fs.mkdirSync(ROOT_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 100 }
});

/**
 * Helpers de sanitation
 * NOTE: sanitizeAlbumId ne remplace pas les espaces/quotes -> il garde le nom tel quel
 * (sauf path traversal). C'est OK mais il faut URL-encoder côté front.
 */
function sanitizeSegment(seg) {
  return String(seg || '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 128) || 'unclassified';
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

/**
 * Compression à l'upload : redimensionne (sans agrandir) et ré-encode pour
 * réduire le poids sans perte de qualité visible. `.rotate()` sans argument
 * applique l'orientation EXIF (photos de téléphone) avant de la stripper.
 * GIF et formats non reconnus sont laissés tels quels (pas de gestion
 * d'animation GIF ici).
 */
const MAX_DIMENSION = 2400;

async function compressImage(buffer, ext) {
  const extLower = ext.toLowerCase();
  try {
    const resized = sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

    if (extLower === '.jpg' || extLower === '.jpeg') {
      return await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    }
    if (extLower === '.png') {
      return await resized.png({ compressionLevel: 9 }).toBuffer();
    }
    if (extLower === '.webp') {
      return await resized.webp({ quality: 82 }).toBuffer();
    }
  } catch (err) {
    console.error('Image compression failed, keeping original file:', err.message);
  }
  return buffer;
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

    const items = [];
    for (const file of files) {
      const original = path.basename(file.originalname || 'image.jpg');
      const safeBase = sanitizeSegment(original.replace(/\.[^.]+$/, ''));
      const ext = path.extname(original) || '.jpg';

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

app.post('/upload', upload.array('files'), uploadHandler);
app.post('/upload/', upload.array('files'), uploadHandler);

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
app.post('/upload/albums', express.json(), async (req, res) => {
  try {
    const { title } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Title required' });

    const safeName = sanitizeAlbumId(title);
    await ensureDir(path.join(ROOT_DIR, safeName));
    return res.json({ id: safeName, title: safeName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Delete album
 */
app.delete('/upload/albums/:id', async (req, res) => {
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
app.delete('/upload/images', express.json(), async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Upload server listening on http://localhost:${PORT}`);
});