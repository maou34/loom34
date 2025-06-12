import { generateSitemap } from '../lib/sitemap';

// Service pour gérer la génération automatique de sitemap
export class SitemapService {
  private static instance: SitemapService;
  
  public static getInstance(): SitemapService {
    if (!SitemapService.instance) {
      SitemapService.instance = new SitemapService();
    }
    return SitemapService.instance;
  }

  // Génère et sauvegarde la sitemap
  async generateAndSaveSitemap(): Promise<string> {
    try {
      const sitemapContent = await generateSitemap();
      
      // En développement, on peut sauvegarder dans public/
      if (import.meta.env.DEV) {
        // Utiliser l'API File System Access si disponible
        if ('showSaveFilePicker' in window) {
          try {
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: 'sitemap.xml',
              types: [{
                description: 'XML files',
                accept: { 'text/xml': ['.xml'] }
              }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(sitemapContent);
            await writable.close();
            
            console.log('Sitemap générée et sauvegardée avec succès!');
          } catch (error) {
            console.log('Sitemap générée (non sauvegardée):', sitemapContent);
          }
        }
      }
      
      return sitemapContent;
    } catch (error) {
      console.error('Erreur lors de la génération de la sitemap:', error);
      throw error;
    }
  }

  // Génère la sitemap au format JSON pour les APIs
  async generateSitemapJson(): Promise<any> {
    try {
      const sitemapContent = await generateSitemap();
      
      // Parser le XML et convertir en JSON
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(sitemapContent, 'text/xml');
      const urls = Array.from(xmlDoc.querySelectorAll('url')).map(url => ({
        loc: url.querySelector('loc')?.textContent,
        lastmod: url.querySelector('lastmod')?.textContent,
        changefreq: url.querySelector('changefreq')?.textContent,
        priority: url.querySelector('priority')?.textContent
      }));
      
      return {
        generated: new Date().toISOString(),
        count: urls.length,
        urls
      };
    } catch (error) {
      console.error('Erreur lors de la génération de la sitemap JSON:', error);
      throw error;
    }
  }

  // Valide la sitemap générée
  validateSitemap(sitemapContent: string): boolean {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(sitemapContent, 'text/xml');
      
      // Vérifier s'il y a des erreurs de parsing
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('Erreur de parsing XML:', parserError.textContent);
        return false;
      }
      
      // Vérifier la présence d'URLs
      const urls = xmlDoc.querySelectorAll('url');
      if (urls.length === 0) {
        console.error('Aucune URL trouvée dans la sitemap');
        return false;
      }
      
      // Vérifier que chaque URL a bien un loc
      for (const url of urls) {
        const loc = url.querySelector('loc');
        if (!loc || !loc.textContent) {
          console.error('URL sans location trouvée');
          return false;
        }
        
        // Valider le format de l'URL
        try {
          new URL(loc.textContent);
        } catch {
          console.error('URL invalide:', loc.textContent);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la validation de la sitemap:', error);
      return false;
    }
  }
}

// Hook React pour utiliser le service de sitemap
import { useState, useEffect } from 'react';

export const useSitemap = () => {
  const [sitemap, setSitemap] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSitemap = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const service = SitemapService.getInstance();
      const sitemapContent = await service.generateAndSaveSitemap();
      setSitemap(sitemapContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const validateSitemap = (content: string) => {
    const service = SitemapService.getInstance();
    return service.validateSitemap(content);
  };

  return {
    sitemap,
    isLoading,
    error,
    generateSitemap,
    validateSitemap
  };
};

export default SitemapService;
