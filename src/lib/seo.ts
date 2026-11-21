// Fonctions SEO : balises meta, Open Graph et données structurées JSON-LD
import { parseEventTime } from './eventDates';
export interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export const defaultSEO: SEOProps = {
  title: 'LOOM - Les Ours Occitanie Montpellier',
  description: 'Association Bear fondée en 2017 à Montpellier. Rejoignez une communauté dynamique de plus de 150 personnes pour des événements, articles et moments de partage.',
  keywords: ['LOOM', 'Bears', 'Ours', 'Montpellier', 'Occitanie', 'Montpellier', 'Association', 'Communauté', 'LGBTQ+'],
  image: '/loom_logo_round.png',
  url: 'https://lgbt-loom.fr',
  type: 'website'
};

export function updatePageSEO(seoProps: Partial<SEOProps>) {
  const seo = { ...defaultSEO, ...seoProps };
  
  // Update title
  document.title = seo.title;
  
  // Update or create meta tags
  updateMetaTag('description', seo.description);
  updateMetaTag('keywords', seo.keywords?.join(', ') || '');
  
  // Open Graph tags
  updateMetaTag('og:title', seo.title, 'property');
  updateMetaTag('og:description', seo.description, 'property');
  updateMetaTag('og:type', seo.type || 'website', 'property');
  updateMetaTag('og:url', seo.url || window.location.href, 'property');
  updateMetaTag('og:image', seo.image || defaultSEO.image!, 'property');
  updateMetaTag('og:site_name', 'LOOM - Les Ours Occitanie Montpellier', 'property');
  
  // Twitter Card tags
  updateMetaTag('twitter:card', 'summary_large_image', 'name');
  updateMetaTag('twitter:title', seo.title, 'name');
  updateMetaTag('twitter:description', seo.description, 'name');
  updateMetaTag('twitter:image', seo.image || defaultSEO.image!, 'name');
  
  // Article specific tags
  if (seo.type === 'article') {
    if (seo.author) {
      updateMetaTag('article:author', seo.author, 'property');
    }
    if (seo.publishedTime) {
      updateMetaTag('article:published_time', seo.publishedTime, 'property');
    }
    if (seo.modifiedTime) {
      updateMetaTag('article:modified_time', seo.modifiedTime, 'property');
    }
  }
  
  // Canonical URL
  updateLinkTag('canonical', seo.url || window.location.href);
}

function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  if (!content) return;
  
  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  
  if (element) {
    element.content = content;
  } else {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    element.content = content;
    document.head.appendChild(element);
  }
}

function updateLinkTag(rel: string, href: string) {
  if (!href) return;
  
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (element) {
    element.href = href;
  } else {
    element = document.createElement('link');
    element.rel = rel;
    element.href = href;
    document.head.appendChild(element);
  }
}

// Generate structured data for articles
export function generateArticleStructuredData(article: {
  title: string;
  description: string;
  image?: string;
  publishedTime: string;
  modifiedTime?: string;
  author?: string;
  url: string;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "image": article.image,
    "datePublished": article.publishedTime,
    "dateModified": article.modifiedTime || article.publishedTime,
    "author": {
      "@type": "Organization",
      "name": article.author || "LOOM"
    },
    "publisher": {
      "@type": "Organization",
      "name": "LOOM - Les Ours Occitanie Montpellier",
      "logo": {
        "@type": "ImageObject",
        "url": "https://lgbt-loom.fr/loom_logo_round.png"
      }
    },
    "url": article.url
  };
  
  return updateStructuredData('article', structuredData);
}

// Generate structured data for events
export function generateEventStructuredData(event: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  image?: string;
  url: string;
  price?: string;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.name,
    "description": event.description,
    "startDate": event.startDate,
    "endDate": event.endDate,
    "location": event.location ? {
      "@type": "Place",
      "name": event.location,
      "address": event.location
    } : undefined,
    "image": event.image,
    "url": event.url,
    "organizer": {
      "@type": "Organization",
      "name": "LOOM - Les Ours Occitanie Montpellier",
      "url": "https://lgbt-loom.fr"
    },
    "offers": event.price ? {
      "@type": "Offer",
      "price": event.price,
      "priceCurrency": "EUR"
    } : undefined
  };
  
  return updateStructuredData('event', structuredData);
}

/**
 * Pose (ou remplace) un bloc JSON-LD dans <head> et renvoie la fonction qui le retire :
 * à renvoyer depuis le useEffect de la page, pour qu'il disparaisse quand on la quitte.
 */
function updateStructuredData(id: string, data: Record<string, unknown>): () => void {
  let script = document.querySelector(`script[data-structured-data="${id}"]`);
  if (!script) {
    script = document.createElement('script');
    (script as HTMLScriptElement).type = 'application/ld+json';
    script.setAttribute('data-structured-data', id);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
  const placed = script;
  return () => placed.remove();
}

/**
 * Date de début schema.org : « 2026-12-05T20:00:00+01:00 » (heure de Paris, décalage
 * été/hiver du jour même) si l'heure texte est lisible, sinon la date seule.
 */
export function schemaStartDate(date: string, time?: string | null): string {
  const t = parseEventTime(time);
  if (!t) return date;
  const noonUtc = new Date(`${date}T12:00:00Z`);
  const offset =
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' })
      .formatToParts(noonUtc)
      .find((p) => p.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '+01:00';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date}T${pad(t.hours)}:${pad(t.minutes)}:00${offset}`;
}
