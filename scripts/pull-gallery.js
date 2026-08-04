// One-off / utilitaire : télécharge toutes les images depuis le serveur
// d'upload (server/upload.js) vers public/gallery/ en local.
//
// Complémentaire à migrate-gallery.js (qui migre depuis Supabase Storage,
// migration historique ponctuelle) : ce script-ci synchronise depuis le
// serveur d'upload Express, la vraie source de vérité pour les albums
// (public/gallery/<albumId>/...). Utile car .gitignore n'embarque que
// public/gallery/images/ dans le repo — les autres albums ne vivent que sur
// le disque du serveur d'upload (upload.lgbt-loom.fr en prod).
//
// Usage:
//   node scripts/pull-gallery.js                          # depuis https://upload.lgbt-loom.fr
//   PULL_UPLOAD_URL=http://localhost:8081 node scripts/pull-gallery.js
//   node scripts/pull-gallery.js --force                   # re-télécharge même les fichiers déjà présents localement
//   PULL_CONCURRENCY=8 node scripts/pull-gallery.js

import fs from 'fs';
import path from 'path';

let _fetch = globalThis.fetch;
if (!_fetch) {
  const mod = await import('node-fetch');
  _fetch = mod.default;
}

const UPLOAD_URL = (process.env.PULL_UPLOAD_URL || 'https://upload.lgbt-loom.fr').replace(/\/+$/, '');
const FORCE = process.argv.includes('--force');
const OUT_DIR = path.resolve(process.cwd(), 'public', 'gallery');

const rawConc = process.env.PULL_CONCURRENCY ?? '';
const parsedConc = Number.parseInt(rawConc, 10);
const CONCURRENCY = Number.isFinite(parsedConc) && parsedConc > 0 ? Math.min(parsedConc, 32) : 6;

async function fetchJson(url) {
  const res = await _fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return res.json();
}

async function downloadFile(url, destPath) {
  const res = await _fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(destPath, buf);
  return buf.length;
}

async function runPool(items, worker, concurrency) {
  let index = 0;
  async function next() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, next));
}

(async () => {
  console.log(`[pull-gallery] Source      : ${UPLOAD_URL}`);
  console.log(`[pull-gallery] Destination : ${OUT_DIR}`);
  console.log(`[pull-gallery] Mode: ${FORCE ? 'force (re-télécharge tout)' : 'incrémental (ignore les fichiers déjà présents)'}, concurrency=${CONCURRENCY}\n`);

  const albums = await fetchJson(`${UPLOAD_URL}/upload/albums`);
  console.log(`[pull-gallery] ${albums.length} album(s) trouvé(s) sur le serveur\n`);

  let totalImages = 0;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytes = 0;

  for (const album of albums) {
    const images = await fetchJson(`${UPLOAD_URL}/upload/albums/${encodeURIComponent(album.id)}/images`);
    totalImages += images.length;
    console.log(`[${album.id}] ${images.length} image(s)`);

    await runPool(images, async (img) => {
      const destPath = path.join(OUT_DIR, img.album_id, path.basename(img.image_url));
      if (!FORCE && fs.existsSync(destPath)) {
        skipped++;
        return;
      }
      try {
        const size = await downloadFile(`${UPLOAD_URL}${img.image_url}`, destPath);
        totalBytes += size;
        downloaded++;
      } catch (e) {
        failed++;
        console.error(`  Échec ${img.image_url}: ${e.message}`);
      }
    }, CONCURRENCY);
  }

  console.log('\n[pull-gallery] Résumé:');
  console.log(`  Albums          : ${albums.length}`);
  console.log(`  Images listées  : ${totalImages}`);
  console.log(`  Téléchargées    : ${downloaded} (${(totalBytes / 1024 / 1024).toFixed(2)} Mo)`);
  console.log(`  Déjà présentes  : ${skipped}`);
  console.log(`  Échecs          : ${failed}`);
})();
