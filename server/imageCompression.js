import sharp from 'sharp';

/**
 * Compression partagée entre l'upload (upload.js) et le script de
 * ré-encodage rétroactif (scripts/compress-gallery.js), pour que les deux
 * chemins produisent le même résultat.
 *
 * `.rotate()` sans argument applique l'orientation EXIF (photos de
 * téléphone) avant de la stripper. GIF et formats non reconnus sont
 * laissés tels quels (pas de gestion d'animation GIF ici).
 */
export const MAX_DIMENSION = 2400;

/** Formats acceptés, lus dans le contenu du fichier (et non dans le type annoncé par le navigateur). */
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'gif', 'webp']);

/**
 * Format réel de l'image d'après son contenu, ou null si ce n'est pas une image
 * jpg/png/gif/webp lisible. Le type MIME et l'extension sont fournis par le
 * client : un fichier texte renommé « x.jpg » passait le filtre de multer.
 */
export async function detectImageFormat(buffer) {
  try {
    const { format } = await sharp(buffer).metadata();
    return ACCEPTED_FORMATS.has(format) ? format : null;
  } catch {
    return null;
  }
}

export async function compressImage(buffer, ext) {
  const extLower = ext.toLowerCase();
  try {
    const resized = sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

    if (extLower === '.jpg' || extLower === '.jpeg') {
      return await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    }
    if (extLower === '.png') {
      return await resized.png({ compressionLevel: 9 }).toBuffer();
    }
    if (extLower === '.webp') {
      return await resized.webp({ quality: 82 }).toBuffer();
    }
  } catch (err) {
    console.error('Image compression failed, keeping original file:', err.message);
  }
  return buffer;
}
