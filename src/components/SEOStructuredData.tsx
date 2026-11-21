import { Helmet } from 'react-helmet-async';
import { ASSOCIATION } from '@/lib/association';

/**
 * Données structurées schema.org « Organization » de l'association, injectées sur
 * toutes les pages (App.tsx). Les articles et événements ont les leurs, posées par
 * useSEO (src/lib/seo.ts).
 */
const LOOM_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LOOM - Les Ours Occitanie Montpellier',
  description:
    'Association Bear fondée en 2017. Association pour les Bears et tous ceux qui aiment les Ours, les poils et les tailles allant du XS au XXXXXL.',
  url: 'https://lgbt-loom.fr',
  logo: 'https://lgbt-loom.fr/logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+33767179100',
    email: ASSOCIATION.email,
    contactType: 'Customer Service',
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: '49 Rue du faubourg St. Jaumes, Bat E',
    addressLocality: 'Montpellier',
    postalCode: '34000',
    addressCountry: 'FR',
  },
  sameAs: ['https://www.facebook.com/groups/1868760663424464/', 'https://www.instagram.com/loom_ours_34/'],
};

export const LOOMOrganizationSchema = () => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify(LOOM_ORGANIZATION)}</script>
  </Helmet>
);
