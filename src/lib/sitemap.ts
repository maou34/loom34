import { db } from '../db';
import { UPLOAD_URL } from '@/config';

export async function generateSitemap(): Promise<string> {
  const baseUrl = 'https://loom-lgbt.fr';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Pages statiques
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'weekly', lastmod: currentDate },
    { url: '/about', priority: '0.9', changefreq: 'monthly', lastmod: currentDate },    { url: '/articles', priority: '0.9', changefreq: 'daily', lastmod: currentDate },
    { url: '/events', priority: '0.9', changefreq: 'daily', lastmod: currentDate },
    { url: '/gallery', priority: '0.8', changefreq: 'weekly', lastmod: currentDate },
    { url: '/partners', priority: '0.8', changefreq: 'monthly', lastmod: currentDate },
    { url: '/monsieur-ours', priority: '0.7', changefreq: 'yearly', lastmod: currentDate },
    { url: '/terms', priority: '0.5', changefreq: 'yearly', lastmod: currentDate },
  ];

  let dynamicPages: any[] = [];
  
  try {
    // Récupérer les articles publiés
    const { data: articles } = await db
      .from('articles')
      .select('slug, updated_at, created_at')
      .eq('published', true)
      .order('updated_at', { ascending: false });
    
    if (articles) {
      dynamicPages = dynamicPages.concat(
        articles.map(article => ({
          url: `/articles/${article.slug}`,
          priority: '0.8',
          changefreq: 'weekly',
          lastmod: article.updated_at ? new Date(article.updated_at).toISOString().split('T')[0] : new Date(article.created_at).toISOString().split('T')[0]
        }))
      );
    }

    // Récupérer les événements
    const { data: events } = await db
      .from('events')
      .select('slug, updated_at, created_at, date')
      .order('date', { ascending: false });
    
    if (events) {
      dynamicPages = dynamicPages.concat(
        events.map(event => ({
          url: `/events/${event.slug}`,
          priority: '0.8',
          changefreq: 'weekly',
          lastmod: event.updated_at ? new Date(event.updated_at).toISOString().split('T')[0] : new Date(event.created_at).toISOString().split('T')[0]
        }))
      );
    }

    // Récupérer les albums de galerie
    try {
      const res = await fetch(`${UPLOAD_URL}/upload/albums`);
      if (res.ok) {
        const albums = await res.json();
        dynamicPages = dynamicPages.concat(
          albums.map((album: any) => ({
            url: `/gallery/${album.id}`,
            priority: '0.7',
            changefreq: 'monthly',
            lastmod: currentDate
          }))
        );
      }
    } catch (e) {
      console.warn('Could not fetch gallery albums for sitemap', e);
    }
  } catch (error) {
    console.error('Erreur lors de la génération de la sitemap:', error);
    // Continuer avec seulement les pages statiques
  }

  const allPages = [...staticPages, ...dynamicPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml" 
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <mobile:mobile/>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
}

export function generateRobotsTxt(): string {
  const baseUrl = 'https://loom-lgbt.fr';
  
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin pages
Disallow: /admin/
Disallow: /auth/

# Disallow temporary pages
Disallow: /unauthorized
Disallow: /404`;
}
