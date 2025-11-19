import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Ensure fetch exists in current Node
let _fetch = globalThis.fetch;
if (!_fetch) {
  const mod = await import('node-fetch');
  _fetch = mod.default;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

if (!SUPABASE_URL || !(SERVICE_KEY || ANON_KEY)) {
  console.error('Missing Supabase env vars. Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or at least VITE_SUPABASE_ANON_KEY) are set.');
  process.exit(1);
}

const canWriteDb = !!SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY);

const OUT_DIR = path.resolve(process.cwd(), 'public', 'gallery');
fs.mkdirSync(OUT_DIR, { recursive: true });

function fileNameFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    return parts[parts.length - 1].split('?')[0] || `${Date.now()}.jpg`;
  } catch {
    return `${Date.now()}.jpg`;
  }
}

function isRemoteUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

async function downloadTo(fileUrl, destFolder, desiredName) {
  const res = await _fetch(fileUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileUrl}`);
  fs.mkdirSync(destFolder, { recursive: true });
  const fileName = desiredName || fileNameFromUrl(fileUrl);
  const outPath = path.join(destFolder, fileName);
  // Some fetch impl (WHATWG) returns Web ReadableStream (no .pipe). Use arrayBuffer.
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(outPath, buf);
  return outPath;
}

(async () => {
  const started = Date.now();
  const rawConc = process.env.MIGRATE_CONCURRENCY ?? '';
  const parsedConc = Number.parseInt(rawConc, 10);
  const CONCURRENCY = Number.isFinite(parsedConc) && parsedConc > 0 ? Math.min(parsedConc, 32) : 8; // 1..32
  console.log(`[migrate-gallery] Démarrage (concurrency=${CONCURRENCY}, dryRun=${DRY_RUN})`);
  console.log('Fetching albums and images...');
  const { data: albums, error: albumsErr } = await supabase.from('gallery_albums').select('*');
  if (albumsErr) throw albumsErr;
  const { data: images, error: imagesErr } = await supabase.from('gallery_images').select('*');
  if (imagesErr) throw imagesErr;

  const imageUpdates = [];
  const albumUpdates = [];
  let ok = 0, fail = 0;

  // Concurrence pour les images
  const remoteImages = images.filter(i => isRemoteUrl(i.image_url));
  const TOTAL_IMAGES = remoteImages.length;
  let processed = 0;
  async function worker() {
    while (remoteImages.length) {
      const img = remoteImages.pop();
      if (!img) break;
      const albumId = img.album_id || 'unclassified';
      const destFolder = path.join(OUT_DIR, String(albumId));
      try {
        if (DRY_RUN) {
          const fakeRel = `/gallery/${albumId}/${fileNameFromUrl(img.image_url)}`;
          imageUpdates.push({ id: img.id, new_path: fakeRel, album_id: img.album_id || null });
          ok++;
        } else {
          const fileBase = fileNameFromUrl(img.image_url);
          const finalPath = path.join(destFolder, fileBase);
          // Skip if already downloaded
          if (fs.existsSync(finalPath)) {
            const rel = path.relative(path.resolve(process.cwd(), 'public'), finalPath).replace(/\\/g, '/');
            imageUpdates.push({ id: img.id, new_path: `/${rel}`, album_id: img.album_id || null });
            ok++;
          } else {
            const savedPath = await downloadTo(img.image_url, destFolder, fileBase);
            const rel = path.relative(path.resolve(process.cwd(), 'public'), savedPath).replace(/\\/g, '/');
            imageUpdates.push({ id: img.id, new_path: `/${rel}`, album_id: img.album_id || null });
            ok++;
          }
        }
      } catch (e) {
        fail++;
        console.error(`[image] Échec ${img.id}: ${e.message}`);
      }
      processed++;
      if (processed % 25 === 0) {
        console.log(`[progress] ${processed}/${TOTAL_IMAGES} images traitées (ok=${ok}, fail=${fail})`);
      }
    }
  }
  const workerCount = Math.max(1, Math.min(CONCURRENCY, TOTAL_IMAGES || 1));
  await Promise.all(Array(workerCount).fill(0).map(worker));

  console.log(`Downloaded: ${ok}, Failed: ${fail}`);

  // Also migrate album cover images
  // Concurrence pour les covers
  const remoteAlbums = albums.filter(a => isRemoteUrl(a.cover_image));
  await Promise.all(remoteAlbums.map(async alb => {
    const destFolder = path.join(OUT_DIR, String(alb.id));
    const coverName = `cover-${fileNameFromUrl(alb.cover_image)}`;
    try {
      let relPath;
      if (DRY_RUN) {
        relPath = `/gallery/${alb.id}/${coverName}`;
      } else {
        const finalPath = path.join(destFolder, coverName);
        if (fs.existsSync(finalPath)) {
          const rel = path.relative(path.resolve(process.cwd(), 'public'), finalPath).replace(/\\/g, '/');
          relPath = `/${rel}`;
        } else {
          const saved = await downloadTo(alb.cover_image, destFolder, coverName);
          const rel = path.relative(path.resolve(process.cwd(), 'public'), saved).replace(/\\/g, '/');
          relPath = `/${rel}`;
        }
      }
      albumUpdates.push({ id: alb.id, new_cover: relPath });
    } catch (e) {
      console.error(`[cover] Échec ${alb.id}: ${e.message}`);
    }
  }));

  // Apply DB updates if service key available
  if (canWriteDb && (imageUpdates.length || albumUpdates.length)) {
    console.log('Updating database paths...');
    // Mise à jour DB en grappes
    const batchSize = 50;
    for (let i = 0; i < imageUpdates.length; i += batchSize) {
      const batch = imageUpdates.slice(i, i + batchSize);
      await Promise.all(batch.map(async u => {
        const { error } = await supabase
          .from('gallery_images')
          .update({ image_url: u.new_path })
          .eq('id', u.id);
        if (error) console.error('[db-image] error', u.id, error.message);
      }));
      if ((i / batchSize) % 5 === 0) console.log(`[db] images progress ${Math.min(i + batchSize, imageUpdates.length)}/${imageUpdates.length}`);
    }

    for (let i = 0; i < albumUpdates.length; i += batchSize) {
      const batch = albumUpdates.slice(i, i + batchSize);
      await Promise.all(batch.map(async a => {
        const { error } = await supabase
          .from('gallery_albums')
          .update({ cover_image: a.new_cover })
          .eq('id', a.id);
        if (error) console.error('[db-album] error', a.id, error.message);
      }));
    }
  } else {
    const outDir = path.resolve(process.cwd(), 'scripts');
    fs.mkdirSync(outDir, { recursive: true });
    const reportJson = path.join(outDir, 'migrate-gallery-report.json');
    fs.writeFileSync(reportJson, JSON.stringify({ images: imageUpdates, albums: albumUpdates }, null, 2));

    // Also write a .sql to apply changes manually
    const sqlLines = [];
    for (const u of imageUpdates) {
      sqlLines.push(`UPDATE public.gallery_images SET image_url='${u.new_path.replace(/'/g, "''")}' WHERE id='${u.id}';`);
    }
    for (const a of albumUpdates) {
      sqlLines.push(`UPDATE public.gallery_albums SET cover_image='${a.new_cover.replace(/'/g, "''")}' WHERE id='${a.id}';`);
    }
    const reportSql = path.join(outDir, 'migrate-gallery-report.sql');
    fs.writeFileSync(reportSql, sqlLines.join('\n') + '\n');
    console.log(`No service key provided or DRY_RUN enabled.`);
    console.log(`Wrote reports: \n- ${reportJson}\n- ${reportSql}`);
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(2);
  console.log(`Done in ${elapsed}s (images=${imageUpdates.length}, covers=${albumUpdates.length}, ok=${ok}, fail=${fail}).`);
})();
