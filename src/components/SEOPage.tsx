import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOPageProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  article?: boolean;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

const SEOPage: React.FC<SEOPageProps> = ({
  title,
  description = "LOOM - Les Ours Occitanie Méditerranée. Association Bear fondée en 2017 pour les Bears et tous ceux qui aiment les Ours, les poils et les tailles allant du XS au XXXXXL.",
  keywords = ['LOOM', 'Ours', 'Bear', 'Occitanie', 'Méditerranée', 'Association', 'Montpellier', 'LGBTQ+', 'Communauté'],
  image = 'https://loom-lgbt.frs.fr/logo.png',
  article = false,
  author = 'LOOM - Les Ours Occitanie Méditerranée',
  publishedDate,
  modifiedDate,
  canonicalUrl,
  noindex = false,
  nofollow = false
}) => {
  const location = useLocation();
  const baseUrl = 'https://loom-lgbt.frs.fr';
  const currentUrl = canonicalUrl || `${baseUrl}${location.pathname}`;
  const fullTitle = title ? `${title} | LOOM` : 'LOOM - Les Ours Occitanie Méditerranée';

  return (
    <Helmet>
      {/* Titre et méta descriptions de base */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      
      {/* Robots directives */}
      <meta name="robots" content={`${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`} />
      
      {/* URL canonique */}
      <link rel="canonical" href={currentUrl} />
      
      {/* Métadonnées Open Graph (Facebook) */}
      <meta property="og:type" content={article ? 'article' : 'website'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="LOOM - Les Ours Occitanie Méditerranée" />
      <meta property="og:locale" content="fr_FR" />
      
      {/* Métadonnées Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@loom_ours_34" />
      
      {/* Métadonnées spécifiques aux articles */}
      {article && (
        <>
          <meta property="article:author" content={author} />
          {publishedDate && <meta property="article:published_time" content={publishedDate} />}
          {modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}
          <meta property="article:section" content="Actualités" />
          <meta property="article:tag" content={keywords.join(',')} />
        </>
      )}
      
      {/* Langues alternatives */}
      <link rel="alternate" hrefLang="fr" href={currentUrl} />
      <link rel="alternate" hrefLang="x-default" href={currentUrl} />
      
      {/* Métadonnées pour les moteurs de recherche locaux */}
      <meta name="geo.region" content="FR-34" />
      <meta name="geo.placename" content="Montpellier" />
      <meta name="geo.position" content="43.610769;3.876716" />
      <meta name="ICBM" content="43.610769, 3.876716" />
      
      {/* Métadonnées de contact et organisation */}
      <meta name="contact" content="contactloom34@gmail.com" />
      <meta name="author" content="LOOM - Les Ours Occitanie Méditerranée" />
      <meta name="revisit-after" content="7 days" />
      
      {/* DNS prefetch pour améliorer les performances */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
      <link rel="dns-prefetch" href="//www.facebook.com" />
      <link rel="dns-prefetch" href="//www.instagram.com" />
      
      {/* Preconnect pour les ressources critiques */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </Helmet>
  );
};

// Composants SEO spécialisés pour chaque type de page
export const SEOHomePage: React.FC<{ title?: string; description?: string }> = ({ 
  title, 
  description = "LOOM - Les Ours Occitanie Méditerranée. Rejoignez notre communauté Bear à Montpellier. Événements, articles, galerie photos et plus encore." 
}) => (
  <SEOPage
    title={title}
    description={description}
    keywords={['LOOM', 'Accueil', 'Bears', 'Montpellier', 'Association', 'Communauté', 'LGBTQ+', 'Événements', 'Occitanie']}
  />
);

export const SEOArticlePage: React.FC<{
  title: string;
  description: string;
  publishedDate: string;
  modifiedDate?: string;
  image?: string;
  keywords?: string[];
}> = ({ title, description, publishedDate, modifiedDate, image, keywords }) => (
  <SEOPage
    title={title}
    description={description}
    keywords={['Article', 'Actualités', 'LOOM', 'Bears', ...(keywords || [])]}
    image={image}
    article={true}
    publishedDate={publishedDate}
    modifiedDate={modifiedDate}
  />
);

export const SEOEventPage: React.FC<{
  title: string;
  description: string;
  date: string;
  image?: string;
}> = ({ title, description, date, image }) => (
  <SEOPage
    title={title}
    description={description}
    keywords={['Événement', 'LOOM', 'Bears', 'Montpellier', 'Sortie', 'Communauté']}
    image={image}
    publishedDate={date}
  />
);

export const SEOGalleryPage: React.FC<{ title?: string; description?: string }> = ({ 
  title = "Galerie Photos", 
  description = "Découvrez nos plus beaux moments en images. Galerie photos des événements et sorties de LOOM - Les Ours Occitanie Méditerranée." 
}) => (
  <SEOPage
    title={title}
    description={description}
    keywords={['Galerie', 'Photos', 'Images', 'LOOM', 'Bears', 'Événements', 'Souvenirs']}
  />
);

export const SEOAboutPage: React.FC<{ title?: string; description?: string }> = ({ 
  title = "À propos", 
  description = "Découvrez l'histoire de LOOM - Les Ours Occitanie Méditerranée. Association Bear fondée en 2017 à Montpellier pour rassembler la communauté." 
}) => (
  <SEOPage
    title={title}
    description={description}
    keywords={['À propos', 'Histoire', 'LOOM', 'Bears', 'Association', 'Montpellier', 'Fondation', '2017']}
  />
);

export default SEOPage;
