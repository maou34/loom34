// One-off script: ré-encode rétroactivement toutes les images déjà présentes
// dans public/gallery avec les mêmes réglages que l'upload (server/upload.js
// / server/imageCompression.js), pour les images uploadées avant la mise en
// place de la compression automatique.
//
// Usage:
//   node scripts/compress-gallery.js            # dry-run (aucune écriture)
//   node scripts/compress-gallery.js --write     # applique les changements
//   COMPRESS_CONCURRENCY=8 node scripts/compress-gallery.js --write
//
// N'écrase un fichier que si le résultat compressé est strictement plus
// petit que l'original (idempotent : relancer le script sur des images déjà
// compressées ne les dégrade pas davantage).

import fs from 'fs';
import path from 'path';
import { compressImage } from '../server/imageCompression.js';

const ROOT_DIR = path.resolve(process.cwd(), 'public', 'gallery');
const WRITE = process.argv.includes('--write');
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;

const rawConc = process.env.COMPRESS_CONCURRENCY ?? '';
const parsedConc = Number.parseInt(rawConc, 10);
const CONCURRENCY = Number.isFinite(parsedConc) && parsedConc > 0 ? Math.min(parsedConc, 32) : 4;

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (IMAGE_EXT_RE.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function processFile(filePath) {
  const ext = path.extname(filePath);
  const original = await fs.promises.readFile(filePath);
  const compressed = await compressImage(original, ext);

  const originalSize = original.length;
  const compressedSize = compressed.length;
  const relPath = path.relative(ROOT_DIR, filePath);

  if (compressedSize >= originalSize) {
    console.log(`= ${relPath} (${formatBytes(originalSize)}, déjà optimisée, ignorée)`);
    return { originalSize, savedSize: 0, changed: false };
  }

  const saved = originalSize - compressedSize;
  const pct = ((saved / originalSize) * 100).toFixed(0);
  console.log(
    `${WRITE ? '✓' : '→'} ${relPath}: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (-${pct}%)`
  );

  if (WRITE) {
    await fs.promises.writeFile(filePath, compressed);
  }

  return { originalSize, savedSize: saved, changed: true };
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let index = 0;
  async function next() {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

(async () => {
  console.log(`[compress-gallery] Démarrage (${WRITE ? 'écriture réelle' : 'DRY-RUN, ajoutez --write pour appliquer'}, concurrency=${CONCURRENCY})`);
  console.log(`[compress-gallery] Dossier: ${ROOT_DIR}`);

  const files = await walk(ROOT_DIR);
  console.log(`[compress-gallery] ${files.length} image(s) trouvée(s)\n`);

  const results = await runPool(files, processFile, CONCURRENCY);

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalSaved = results.reduce((sum, r) => sum + r.savedSize, 0);
  const changedCount = results.filter((r) => r.changed).length;

  console.log('\n[compress-gallery] Résumé:');
  console.log(`  Images traitées : ${files.length}`);
  console.log(`  Images réduites : ${changedCount}`);
  console.log(`  Poids initial   : ${formatBytes(totalOriginal)}`);
  console.log(`  Gain total      : ${formatBytes(totalSaved)} (${totalOriginal ? ((totalSaved / totalOriginal) * 100).toFixed(0) : 0}%)`);

  if (!WRITE) {
    console.log('\nDRY-RUN: aucun fichier modifié. Relancez avec --write pour appliquer.');
  }
})();
