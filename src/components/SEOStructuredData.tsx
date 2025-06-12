import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOStructuredDataProps {
  type: 'Organization' | 'Article' | 'Event' | 'ImageGallery' | 'LocalBusiness';
  data: any;
}

interface OrganizationData {
  name: string;
  description: string;
  url: string;
  logo: string;
  contactPoint: {
    telephone: string;
    email: string;
    contactType: string;
  };
  address: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  sameAs: string[];
}

interface ArticleData {
  headline: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified: string;
  image: string;
  url: string;
}

interface EventData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  };
  image: string;
  url: string;
  organizer: string;
}

const SEOStructuredData: React.FC<SEOStructuredDataProps> = ({ type, data }) => {
  const generateStructuredData = () => {
    const baseData = {
      '@context': 'https://schema.org',
      '@type': type
    };

    switch (type) {
      case 'Organization':
        return {
          ...baseData,
          name: data.name,
          description: data.description,
          url: data.url,
          logo: data.logo,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: data.contactPoint.telephone,
            email: data.contactPoint.email,
            contactType: data.contactPoint.contactType
          },
          address: {
            '@type': 'PostalAddress',
            streetAddress: data.address.streetAddress,
            addressLocality: data.address.addressLocality,
            postalCode: data.address.postalCode,
            addressCountry: data.address.addressCountry
          },
          sameAs: data.sameAs
        };

      case 'Article':
        return {
          ...baseData,
          headline: data.headline,
          description: data.description,
          author: {
            '@type': 'Organization',
            name: data.author
          },
          datePublished: data.datePublished,
          dateModified: data.dateModified,
          image: data.image,
          url: data.url,
          publisher: {
            '@type': 'Organization',
            name: 'LOOM - Les Ours Occitanie Méditerranée',
            logo: 'https://loom-lgbt.fr/logo.png'
          }
        };

      case 'Event':
        return {
          ...baseData,
          name: data.name,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          location: {
            '@type': 'Place',
            name: data.location.name,
            address: data.location.address
          },
          image: data.image,
          url: data.url,
          organizer: {
            '@type': 'Organization',
            name: data.organizer
          }
        };

      case 'LocalBusiness':
        return {
          ...baseData,
          '@type': 'LocalBusiness',
          name: data.name,
          description: data.description,
          url: data.url,
          telephone: data.telephone,
          email: data.email,
          address: {
            '@type': 'PostalAddress',
            streetAddress: data.address.streetAddress,
            addressLocality: data.address.addressLocality,
            postalCode: data.address.postalCode,
            addressCountry: data.address.addressCountry
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: data.geo?.latitude,
            longitude: data.geo?.longitude
          },
          openingHoursSpecification: data.openingHours?.map((hours: any) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: hours.dayOfWeek,
            opens: hours.opens,
            closes: hours.closes
          })),
          sameAs: data.sameAs
        };

      default:
        return baseData;
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>
    </Helmet>
  );
};

// Données structurées prédéfinies pour LOOM
export const LOOMOrganizationData: OrganizationData = {
  name: 'LOOM - Les Ours Occitanie Méditerranée',
  description: 'Association Bear fondée en 2017. Association pour les Bears et tous ceux qui aiment les Ours, les poils et les tailles allant du XS au XXXXXL.',
  url: 'https://loom-lgbt.fr',
  logo: 'https://loom-lgbt.fr/logo.png',
  contactPoint: {
    telephone: '+33767179100',
    email: 'contactloom34@gmail.com',
    contactType: 'Customer Service'
  },
  address: {
    streetAddress: '49 Rue du faubourg St. Jaumes, Bat E',
    addressLocality: 'Montpellier',
    postalCode: '34000',
    addressCountry: 'FR'
  },
  sameAs: [
    'https://www.facebook.com/groups/1868760663424464/',
    'https://www.instagram.com/loom_ours_34/'
  ]
};

// Composant pour injecter automatiquement les données d'organisation
export const LOOMOrganizationSchema: React.FC = () => (
  <SEOStructuredData type="Organization" data={LOOMOrganizationData} />
);

// Hook pour générer facilement des données structurées d'article
export const useArticleStructuredData = (article: any) => {
  return {
    headline: article.title,
    description: article.excerpt || article.description,
    author: 'LOOM - Les Ours Occitanie Méditerranée',
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    image: article.image_url || 'https://loom-lgbt.fr/placeholder.svg',
    url: `https://loom-lgbt.fr/articles/${article.slug}`
  };
};

// Hook pour générer facilement des données structurées d'événement
export const useEventStructuredData = (event: any) => {
  return {
    name: event.title,
    description: event.description,
    startDate: event.date,
    endDate: event.end_date,
    location: {
      name: event.location || 'Montpellier',
      address: event.address || '49 Rue du faubourg St. Jaumes, Bat E, 34000 Montpellier'
    },
    image: event.image_url || 'https://loom-lgbt.fr/placeholder.svg',
    url: `https://loom-lgbt.fr/events/${event.slug}`,
    organizer: 'LOOM - Les Ours Occitanie Méditerranée'
  };
};

export default SEOStructuredData;
