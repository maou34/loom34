
const isProd = import.meta.env.PROD;

export const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || (isProd ? 'https://upload.loom-lgbt.fr' : 'http://localhost:8081');

export const getImageUrl = (relativePath: string) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  // Ensure relativePath starts with /
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${UPLOAD_URL}${path}`;
};
