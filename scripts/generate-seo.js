// Plan du site (sitemap.xml) généré après chaque build (`postbuild` dans package.json).
//
// Écrit dans dist/ et non dans public/ : sur le serveur, le build tourne dans le
// dépôt git ; un fichier suivi réécrit à chaque build bloquerait le `git pull`
// suivant. public/robots.txt est statique et pointe vers /sitemap.xml.
//
// Contenu : les pages fixes, les articles et événements publiés (lus dans Supabase
// avec la clé publique — la RLS ne renvoie que ce qui est publié), les albums
// photos (serveur d'upload). Si Supabase ou le serveur d'upload ne répond pas, le
// plan contient au moins le reste : le build n'échoue jamais à cause de lui.
//
// Usage : `npm run seo:generate` (après un build) ; `-- --out=<dossier>` pour écrire ailleurs.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'https://lgbt-loom.fr';
const UPLOAD_URL = 'https://upload.lgbt-loom.fr';
/** Dossiers du serveur d'upload qui ne sont pas des albums publics (cf. lib/albums.ts) */
const isHiddenAlbum = (id) => id === 'images' || id === 'unclassified' || id.startsWith('tip');

const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/events', changefreq: 'daily', priority: '0.9' },
  { path: '/articles', changefreq: 'weekly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/gallery', changefreq: 'weekly', priority: '0.7' },
  { path: '/partners', changefreq: 'monthly', priority: '0.7' },
  { path: '/monsieur-ours', changefreq: 'monthly', priority: '0.7' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
  { path: '/legal-notice', changefreq: 'yearly', priority: '0.2' },
];

/** Variables VITE_* : environnement, sinon .env.local / .env (Node ≥ 20.12). */
function loadEnv() {
  for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    if (existsSync(file)) {
      try {
        process.loadEnvFile(file); // n'écrase pas les variables déjà définies
      } catch {
        // fichier illisible : ignoré
      }
    }
  }
  return { url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_ANON_KEY };
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url.split('?')[0]}`);
  return res.json();
}

const day = (value) => (value ? String(value).slice(0, 10) : undefined);
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');

async function dynamicPages(warnings) {
  const pages = [];
  const { url, key } = loadEnv();

  if (url && key) {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    try {
      const articles = await getJson(`${url}/rest/v1/articles?select=slug,date,updated_at&published=eq.true&order=date.desc`, headers);
      for (const a of articles) {
        if (a.slug) pages.push({ path: `/articles/${a.slug}`, lastmod: day(a.updated_at ?? a.date), changefreq: 'monthly', priority: '0.6' });
      }
    } catch (e) {
      warnings.push(`articles : ${e.message}`);
    }
    try {
      const events = await getJson(`${url}/rest/v1/events?select=slug,date,updated_at&published=eq.true&order=date.desc`, headers);
      const today = new Date().toISOString().slice(0, 10);
      for (const e of events) {
        if (!e.slug) continue;
        const upcoming = e.date >= today;
        pages.push({ path: `/events/${e.slug}`, lastmod: day(e.updated_at ?? e.date), changefreq: upcoming ? 'daily' : 'yearly', priority: upcoming ? '0.8' : '0.4' });
      }
    } catch (e) {
      warnings.push(`événements : ${e.message}`);
    }
  } else {
    warnings.push('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY absentes : articles et événements non listés');
  }

  try {
    const albums = await getJson(`${process.env.VITE_UPLOAD_URL || UPLOAD_URL}/upload/albums`);
    for (const a of albums) {
      if (!a.id || isHiddenAlbum(a.id) || !a.image_count) continue;
      pages.push({ path: `/gallery/${encodeURIComponent(a.id)}`, changefreq: 'yearly', priority: '0.4' });
    }
  } catch (e) {
    warnings.push(`albums : ${e.message}`);
  }

  return pages;
}

function renderSitemap(pages) {
  const urls = pages.map((p) =>
    [
      '  <url>',
      `    <loc>${escapeXml(BASE_URL + p.path)}</loc>`,
      p.lastmod ? `    <lastmod>${p.lastmod}</lastmod>` : null,
      `    <changefreq>${p.changefreq}</changefreq>`,
      `    <priority>${p.priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

async function main() {
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outDir = outArg ? outArg.slice('--out='.length) : 'dist';
  if (!existsSync(outDir)) {
    console.error(`sitemap : dossier « ${outDir} » introuvable (lancez d'abord le build).`);
    return;
  }

  const warnings = [];
  const pages = [...STATIC_PAGES, ...(await dynamicPages(warnings))];
  const file = join(outDir, 'sitemap.xml');
  writeFileSync(file, renderSitemap(pages), 'utf8');

  for (const w of warnings) console.warn(`⚠️  sitemap : ${w}`);
  console.log(`✅ ${file} : ${pages.length} adresses`);
}

// Jamais d'échec de build à cause du plan du site
main().catch((e) => console.error('sitemap : génération impossible —', e));
