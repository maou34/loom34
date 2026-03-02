import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';

const app = express();

// Configuration CORS pour autoriser le domaine principal et le développement local
const allowedOrigins = [
  'https://loom-lgbt.fr',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://localhost:8081'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.loom-lgbt.fr')) {
      return callback(null, true);
    }
    // Fallback for other environments or if strict security is not required yet
    // callback(new Error('Not allowed by CORS'));
    return callback(null, true); // Permissive for now to avoid breakage
  },
  credentials: true
}));

const PORT = process.env.UPLOAD_PORT || 8081;
const ROOT_DIR = path.resolve(process.cwd(), 'public', 'gallery');

console.log('Serving gallery from:', ROOT_DIR);

// Servir les fichiers statiques de la galerie
app.use('/gallery', express.static(ROOT_DIR));

fs.mkdirSync(ROOT_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 100 } });

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
    } catch (_) {
      return path.join(dir, candidate);
    }
  }
}

app.post('/upload', upload.array('files'), async (req, res) => {
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
      await fsp.writeFile(out, file.buffer);
      const finalName = path.basename(out);
      const relativePath = `/gallery/${albumSeg}/${finalName}`;
      items.push({ filename: finalName, relativePath });
    }

    res.json({ items });
  } catch (err) {
    console.error('Upload error', err);
    res.status(500).send(err?.message || 'Server error');
  }
});

// List albums (directories)
app.get('/upload/albums', async (req, res) => {
  try {
    const entries = await fsp.readdir(ROOT_DIR, { withFileTypes: true });
    const albums = [];
    
    for (const dirent of entries) {
      if (dirent.isDirectory()) {
        const albumId = dirent.name;
        const albumPath = path.join(ROOT_DIR, albumId);
        let coverImage = null;
        let imageCount = 0;
        
        try {
          const files = await fsp.readdir(albumPath);
          const images = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
          imageCount = images.length;
          if (images.length > 0) {
            coverImage = `/gallery/${albumId}/${images[0]}`;
          }
        } catch (e) {
          // Ignore error reading album dir
        }

        albums.push({
          id: albumId,
          title: albumId,
          cover_image: coverImage,
          image_count: imageCount
        });
      }
    }
    
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create album (directory)
app.post('/upload/albums', express.json(), async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const safeName = sanitizeAlbumId(title);
    await ensureDir(path.join(ROOT_DIR, safeName));
    res.json({ id: safeName, title: safeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete album
app.delete('/upload/albums/:id', async (req, res) => {
  try {
    const safeName = sanitizeAlbumId(req.params.id);
    const target = path.join(ROOT_DIR, safeName);
    await fsp.rm(target, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List images in album
app.get('/upload/albums/:id/images', async (req, res) => {
  try {
    const safeName = sanitizeAlbumId(req.params.id);
    const target = path.join(ROOT_DIR, safeName);
    
    // Check if dir exists
    try {
      await fsp.access(target);
    } catch {
      return res.json([]);
    }

    const files = await fsp.readdir(target);
    const images = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map(f => ({
        id: f, // filename as id
        title: f,
        image_url: `/gallery/${safeName}/${f}`,
        album_id: safeName
      }));
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete image
app.delete('/upload/images', express.json(), async (req, res) => {
  try {
    const { albumId, filename } = req.body;
    if (!albumId || !filename) return res.status(400).json({ error: 'Missing params' });
    
    const safeAlbum = sanitizeAlbumId(albumId);
    const safeFile = path.basename(filename);
    const target = path.join(ROOT_DIR, safeAlbum, safeFile);
    
    await fsp.unlink(target);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Upload server listening on http://localhost:${PORT}`);
});
