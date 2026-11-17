
const isProd = import.meta.env.PROD;

// Determine if we are in a production-like environment based on the hostname
const isProdHostname = typeof window !== 'undefined' && (
  window.location.hostname === 'lgbt-loom.fr' || 
  window.location.hostname.endsWith('.lgbt-loom.fr')
);

export const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || (isProd || isProdHostname ? 'https://upload.lgbt-loom.fr' : 'http://localhost:8081');

// HelloAsso (billetterie). En local, pour tester avec la sandbox :
//   VITE_HELLOASSO_BASE_URL=https://www.helloasso-sandbox.com
//   VITE_HELLOASSO_ORG_SLUG=<slug de l'organisation sandbox>
export const HELLOASSO_BASE_URL = (import.meta.env.VITE_HELLOASSO_BASE_URL || 'https://www.helloasso.com').replace(/\/+$/, '');
export const HELLOASSO_ORG_SLUG = import.meta.env.VITE_HELLOASSO_ORG_SLUG || 'les-ours-occitanie-montpellier';

export const getImageUrl =(relativePath: string) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  // Ensure relativePath starts with /
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${UPLOAD_URL}${path}`;
};
