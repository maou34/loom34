import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { updatePageSEO, SEOProps } from '@/lib/seo';

/**
 * Titre, description, Open Graph… de la page courante. Le bloc JSON-LD « Organization »
 * est posé une fois pour tout le site (LOOMOrganizationSchema, App.tsx) ; ceux des
 * articles et événements par leur page (generateArticle/EventStructuredData), qui les
 * retire elle-même en partant.
 *
 * L'effet ne dépend que du contenu (sérialisé) : `seoProps` est un nouvel objet à chaque
 * rendu, et l'ancienne version, qui en dépendait, se relançait à chaque rendu et
 * effaçait au passage les blocs Event/Article (Google ne les voyait jamais).
 */
export function useSEO(seoProps: Partial<SEOProps>) {
  const location = useLocation();
  const key = JSON.stringify(seoProps);

  useEffect(() => {
    updatePageSEO({ ...(JSON.parse(key) as Partial<SEOProps>), url: `${window.location.origin}${location.pathname}` });
  }, [location.pathname, key]);
}

export default useSEO;
