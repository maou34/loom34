
const isProd = import.meta.env.PROD;

// Determine if we are in a production-like environment based on the hostname
const isProdHostname = typeof window !== 'undefined' && (
  window.location.hostname === 'loom-lgbt.fr' || 
  window.location.hostname.endsWith('.loom-lgbt.fr')
);

export const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || (isProd || isProdHostname ? 'https://upload.loom-lgbt.fr' : 'http://localhost:8081');

export const getImageUrl = (relativePath: string) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  // Ensure relativePath starts with /
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${UPLOAD_URL}${path}`;
};
