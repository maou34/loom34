/**
 * Prépare une photo avant l'envoi au serveur d'images.
 *
 * Pourquoi : depuis un iPhone, Safari convertit à la volée les photos HEIC en
 * JPEG au moment de l'envoi, et le corps de la requête arrivait parfois tronqué
 * (« Unexpected end of form » côté serveur, erreur 500 — 21/11/2026). En
 * décodant la photo ici et en envoyant un fichier JPEG que l'on a soi-même
 * produit, le contenu envoyé est entièrement connu d'avance.
 *
 * Au passage, la photo est réduite à 2400 px de côté (ce que le serveur garde de
 * toute façon, cf. server/imageCompression.js) : une photo de téléphone de 4 à
 * 10 Mo devient ~1 Mo, beaucoup plus rapide à envoyer en 4G.
 *
 * Seuls les JPEG et HEIC/HEIF sont réencodés. PNG (transparence), GIF (animation)
 * et WebP sont envoyés tels quels, après une copie en mémoire de leurs octets ;
 * idem si le navigateur ne sait pas décoder la photo.
 */
const MAX_SIDE = 2400;
const REENCODE = /^image\/(jpeg|jpg|pjpeg|heic|heif)$/i;
const HEIC_NAME = /\.(heic|heif)$/i;

/** Copie les octets du fichier : le navigateur envoie alors un contenu déjà lu, de taille connue. */
async function copyBytes(file: File): Promise<File> {
  return new File([await file.arrayBuffer()], file.name, { type: file.type, lastModified: file.lastModified });
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!REENCODE.test(file.type) && !HEIC_NAME.test(file.name)) return copyBytes(file);
  try {
    // imageOrientation « from-image » : l'orientation EXIF du téléphone est appliquée
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponible");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("encodage JPEG impossible");
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch (e) {
    console.warn("Photo envoyée sans préparation :", file.name, e);
    return copyBytes(file);
  }
}
