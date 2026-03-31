import { writeFileSync } from 'fs';
import { join } from 'path';

// Générer la sitemap manuellement (version simplifiée pour le script)
function generateSitemap() {
  const baseUrl = 'https://lgbt-loom.frs.fr';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const pages = [
    { url: '', priority: '1.0', changefreq: 'weekly', lastmod: currentDate },    { url: '/about', priority: '0.9', changefreq: 'monthly', lastmod: currentDate },
    { url: '/articles', priority: '0.9', changefreq: 'daily', lastmod: currentDate },
    { url: '/events', priority: '0.9', changefreq: 'daily', lastmod: currentDate },
    { url: '/gallery', priority: '0.8', changefreq: 'weekly', lastmod: currentDate },
    { url: '/partners', priority: '0.8', changefreq: 'monthly', lastmod: currentDate },
    { url: '/monsieur-ours', priority: '0.7', changefreq: 'yearly', lastmod: currentDate },
    { url: '/terms', priority: '0.5', changefreq: 'yearly', lastmod: currentDate },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml" 
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <mobile:mobile/>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
}

function generateRobotsTxt() {
  const baseUrl = 'https://lgbt-loom.frs.fr';
  
  return `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

# Pages importantes à explorer en priorité
Allow: /articles
Allow: /events
Allow: /gallery
Allow: /partners
Allow: /about
Allow: /monsieur-ours

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin pages
Disallow: /admin/
Disallow: /auth/

# Disallow temporary pages
Disallow: /unauthorized
Disallow: /404

# Disallow fichiers techniques
Disallow: /*.json$
Disallow: /*.config.*$
Disallow: /src/
Disallow: /node_modules/

# Informations de contact
# Contact: webmaster@lgbt-loom.frs.fr`;
}

async function generateSEOFiles() {
  try {
    console.log('🚀 Génération des fichiers SEO...');
    
    // Générer la sitemap
    console.log('📄 Génération de la sitemap XML...');
    const sitemapContent = generateSitemap();
    const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml');
    writeFileSync(sitemapPath, sitemapContent, 'utf8');
    console.log('✅ Sitemap générée avec succès:', sitemapPath);
    
    // Générer le robots.txt
    console.log('🤖 Génération du robots.txt...');
    const robotsContent = generateRobotsTxt();
    const robotsPath = join(process.cwd(), 'public', 'robots.txt');
    writeFileSync(robotsPath, robotsContent, 'utf8');
    console.log('✅ Robots.txt généré avec succès:', robotsPath);
    
    // Statistiques
    const urlCount = (sitemapContent.match(/<url>/g) || []).length;
    console.log(`📊 Statistiques: ${urlCount} URLs ajoutées à la sitemap`);
    
    console.log('🎉 Génération des fichiers SEO terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des fichiers SEO:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  generateSEOFiles();
}

export { generateSEOFiles };
