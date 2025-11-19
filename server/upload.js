import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';

const app = express();
app.use(cors());

const PORT = process.env.UPLOAD_PORT || 8081;
const ROOT_DIR = path.resolve(process.cwd(), 'public', 'gallery');

fs.mkdirSync(ROOT_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 100 } });

function sanitizeSegment(seg) {
  return String(seg || '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 128) || 'unclassified';
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
    const albumSeg = albumIdRaw ? sanitizeSegment(albumIdRaw) : 'unclassified';
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Upload server listening on http://localhost:${PORT}`);
});
