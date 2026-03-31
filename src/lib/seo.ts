// SEO utility functions
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
  url: 'https://loom-lgbt.fr',
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

// Generate structured data for organization
export function generateOrganizationStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "LOOM - Les Ours Occitanie Montpellier",
    "alternateName": "LOOM",
    "description": "Association Bear fondée en 2017 à Montpellier pour les Bears et tous ceux qui aiment les Ours.",
    "foundingDate": "2017",
    "url": "https://loom-lgbt.fr",
    "logo": "/loom_logo_round.png",
    "sameAs": [
      "https://www.instagram.com/loom_bears",
      "https://www.facebook.com/loom.bears"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "Occitanie",
      "addressCountry": "FR"
    }
  };
  
  updateStructuredData('organization', structuredData);
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
        "url": "/loom_logo_round.png"
      }
    },
    "url": article.url
  };
  
  updateStructuredData('article', structuredData);
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
      "name": event.location
    } : undefined,
    "image": event.image,
    "url": event.url,
    "organizer": {
      "@type": "Organization",
      "name": "LOOM - Les Ours Occitanie Montpellier",
      "url": "https://loom-lgbt.fr"
    },
    "offers": event.price ? {
      "@type": "Offer",
      "price": event.price,
      "priceCurrency": "EUR"
    } : undefined
  };
  
  updateStructuredData('event', structuredData);
}

function updateStructuredData(id: string, data: any) {
  let script = document.querySelector(`script[data-structured-data="${id}"]`);
  
  if (script) {
    script.textContent = JSON.stringify(data);
  } else {
    script = document.createElement('script');
    (script as HTMLScriptElement).type = 'application/ld+json';
    script.setAttribute('data-structured-data', id);
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}
