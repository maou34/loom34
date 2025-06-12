import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function validateSEOFiles() {
  console.log('🔍 Validation des fichiers SEO...\n');
  
  let hasErrors = false;
  const results = [];

  // 1. Vérifier robots.txt
  console.log('1. Validation robots.txt...');
  const robotsPath = join(process.cwd(), 'public', 'robots.txt');
  
  if (existsSync(robotsPath)) {
    const robotsContent = readFileSync(robotsPath, 'utf8');
    
    // Vérifications robots.txt
    const checks = {
      'User-agent: *': robotsContent.includes('User-agent: *'),
      'Allow: /': robotsContent.includes('Allow: /'),
      'Sitemap: ': robotsContent.includes('Sitemap: '),
      'Disallow admin': robotsContent.includes('Disallow: /admin/'),
      'Disallow auth': robotsContent.includes('Disallow: /auth/')
    };
    
    let robotsValid = true;
    for (const [check, passed] of Object.entries(checks)) {
      if (passed) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
        robotsValid = false;
        hasErrors = true;
      }
    }
    
    results.push({ file: 'robots.txt', status: robotsValid ? 'OK' : 'ERREUR' });
  } else {
    console.log('   ❌ Fichier robots.txt manquant');
    results.push({ file: 'robots.txt', status: 'MANQUANT' });
    hasErrors = true;
  }

  // 2. Vérifier sitemap.xml
  console.log('\n2. Validation sitemap.xml...');
  const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml');
  
  if (existsSync(sitemapPath)) {
    const sitemapContent = readFileSync(sitemapPath, 'utf8');
    
    const sitemapChecks = {
      'XML valide': sitemapContent.startsWith('<?xml version="1.0"'),
      'Namespace sitemap': sitemapContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
      'URLs présentes': sitemapContent.includes('<url>'),
      'Locations présentes': sitemapContent.includes('<loc>'),
      'Dates de modification': sitemapContent.includes('<lastmod>'),
      'Mobile friendly': sitemapContent.includes('<mobile:mobile/>')
    };
    
    let sitemapValid = true;
    for (const [check, passed] of Object.entries(sitemapChecks)) {
      if (passed) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
        sitemapValid = false;
        hasErrors = true;
      }
    }
    
    // Compter les URLs
    const urlCount = (sitemapContent.match(/<url>/g) || []).length;
    console.log(`   📊 ${urlCount} URLs dans la sitemap`);
    
    results.push({ file: 'sitemap.xml', status: sitemapValid ? 'OK' : 'ERREUR', urls: urlCount });
  } else {
    console.log('   ❌ Fichier sitemap.xml manquant');
    results.push({ file: 'sitemap.xml', status: 'MANQUANT' });
    hasErrors = true;
  }

  // 3. Vérifier les métadonnées dans les composants
  console.log('\n3. Validation des composants SEO...');
  const seoFiles = [
    'src/components/SEOPage.tsx',
    'src/components/SEOStructuredData.tsx',
    'src/components/InternalLinks.tsx',
    'src/lib/sitemap.ts'
  ];

  for (const file of seoFiles) {
    const filePath = join(process.cwd(), file);
    if (existsSync(filePath)) {
      console.log(`   ✅ ${file}`);
      results.push({ file, status: 'OK' });
    } else {
      console.log(`   ❌ ${file} manquant`);
      results.push({ file, status: 'MANQUANT' });
      hasErrors = true;
    }
  }

  // 4. Recommandations SEO
  console.log('\n4. Recommandations SEO...');
  const recommendations = [
    '✅ Utilisez des titres uniques pour chaque page',
    '✅ Optimisez les descriptions meta (150-160 caractères)',
    '✅ Ajoutez des données structurées Schema.org',
    '✅ Optimisez les images avec des attributs alt',
    '✅ Créez un maillage interne cohérent',
    '✅ Surveillez la vitesse de chargement',
    '✅ Assurez-vous que le site est mobile-friendly',
    '✅ Créez du contenu de qualité régulièrement'
  ];

  recommendations.forEach(rec => console.log(`   ${rec}`));

  // 5. Résumé final
  console.log('\n' + '='.repeat(50));
  console.log('📋 RÉSUMÉ DE LA VALIDATION SEO');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.status === 'OK' ? '✅' : result.status === 'MANQUANT' ? '❌' : '⚠️';
    const urls = result.urls ? ` (${result.urls} URLs)` : '';
    console.log(`${status} ${result.file}: ${result.status}${urls}`);
  });

  if (hasErrors) {
    console.log('\n❌ Des problèmes ont été détectés. Veuillez les corriger pour optimiser votre SEO.');
    process.exit(1);
  } else {
    console.log('\n🎉 Tous les fichiers SEO sont en ordre !');
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSEOFiles();
}

export { validateSEOFiles };
