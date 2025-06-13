import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface InternalLink {
  href: string;
  label: string;
  description?: string;
  category?: 'primary' | 'secondary' | 'tertiary';
}

interface InternalLinksProps {
  className?: string;
  category?: 'primary' | 'secondary' | 'tertiary' | 'all';
  showDescription?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
}

// Configuration centralisée des liens internes pour le SEO
const INTERNAL_LINKS: InternalLink[] = [
  // Liens primaires - Pages principales
  {
    href: '/',
    label: 'Accueil LOOM',
    description: 'Découvrez Les Ours Occitanie Méditerranée',
    category: 'primary'
  },
  {
    href: '/about',
    label: 'À propos de LOOM',
    description: 'Notre histoire et nos valeurs',
    category: 'primary'
  },
  {
    href: '/articles',
    label: 'Actualités et Articles',
    description: 'Toutes nos actualités sur la communauté Ours',
    category: 'primary'
  },
  {
    href: '/events',
    label: 'Événements LOOM',
    description: 'Participez à nos événements communautaires',
    category: 'primary'
  },
  {
    href: '/gallery',
    label: 'Galerie Photos',
    description: 'Nos plus beaux moments en images',
    category: 'primary'
  },
  {
    href: '/partners',
    label: 'Nos Partenaires',
    description: 'Découvrez nos partenaires de confiance',
    category: 'secondary'
  },
  {
    href: '/monsieur-ours',
    label: 'Monsieur Ours',
    description: 'L\'histoire de notre mascotte emblématique',
    category: 'secondary'
  },  // Liens tertiaires
  {
    href: '/terms',
    label: 'Conditions d\'utilisation',
    description: 'Les conditions d\'utilisation de notre site',
    category: 'tertiary'
  }
];

export const InternalLinks: React.FC<InternalLinksProps> = ({
  className,
  category = 'all',
  showDescription = false,
  layout = 'horizontal'
}) => {
  const filteredLinks = category === 'all' 
    ? INTERNAL_LINKS 
    : INTERNAL_LINKS.filter(link => link.category === category);

  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-4',
    vertical: 'flex flex-col space-y-2',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  };

  return (
    <nav className={cn(layoutClasses[layout], className)} aria-label="Navigation interne">
      {filteredLinks.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className={cn(
            "text-blue-600 hover:text-blue-800 hover:underline transition-colors",
            showDescription && "block p-3 border rounded-lg hover:bg-gray-50"
          )}
          title={link.description}
        >
          <span className="font-medium">{link.label}</span>
          {showDescription && link.description && (
            <span className="block text-sm text-gray-600 mt-1">
              {link.description}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
};

// Hook pour obtenir les liens internes par catégorie
export const useInternalLinks = (category?: 'primary' | 'secondary' | 'tertiary') => {
  return category 
    ? INTERNAL_LINKS.filter(link => link.category === category)
    : INTERNAL_LINKS;
};

// Composant pour les breadcrumbs automatiques
interface BreadcrumbsProps {
  currentPath: string;
  className?: string;
}

export const AutoBreadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPath, className }) => {
  const pathSegments = currentPath.split('/').filter(Boolean);
  
  const breadcrumbItems = [
    { href: '/', label: 'Accueil' },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const linkConfig = INTERNAL_LINKS.find(link => link.href === href);
      return {
        href,
        label: linkConfig?.label || segment.charAt(0).toUpperCase() + segment.slice(1)
      };
    })
  ];

  return (
    <nav className={cn("text-sm text-gray-600", className)} aria-label="Fil d'Ariane">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && <span className="mx-2">/</span>}
            {index === breadcrumbItems.length - 1 ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default InternalLinks;
