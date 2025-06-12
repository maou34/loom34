export function generateSitemap(): string {
  const baseUrl = 'https://loom-bears.fr';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const pages = [
    { url: '', priority: '1.0', changefreq: 'weekly' },
    { url: '/about', priority: '0.9', changefreq: 'monthly' },
    { url: '/articles', priority: '0.9', changefreq: 'weekly' },
    { url: '/events', priority: '0.9', changefreq: 'weekly' },
    { url: '/gallery', priority: '0.8', changefreq: 'monthly' },
    { url: '/partners', priority: '0.8', changefreq: 'monthly' },
    { url: '/monsieur-ours', priority: '0.7', changefreq: 'yearly' },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
}

export function generateRobotsTxt(): string {
  const baseUrl = 'https://loom-bears.fr';
  
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
