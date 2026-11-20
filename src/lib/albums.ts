import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import type { Tables } from '@/db/types';
import { UPLOAD_URL, getImageUrl } from '@/config';

// Albums photo = dossiers du serveur d'upload, complétés par la table
// photo_albums (date, titre, couverture, soirée liée) quand elle a une ligne.

/** Dossiers techniques jamais montrés comme albums (images du site, tests). */
export const isHiddenAlbumId = (id: string) => id === 'images' || id === 'unclassified' || id.startsWith('tip');

type ServerAlbum = { id: string; title: string; cover_image: string | null; image_count: number };
export type ServerImage = { id: string; title: string; image_url: string; album_id: string };
export type AlbumMeta = Tables<'photo_albums'>;

export type Album = {
  id: string;
  title: string;
  /** Date de la soirée (fiche admin, sinon déduite du nom du dossier) */
  date: Date | null;
  /** « Juin 2026 », « 2025 » ou '' */
  dateLabel: string;
  year: number | null;
  cover: string | null;
  count: number;
  eventId: string | null;
};

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
// Formes abrégées acceptées (« 7 nov.2025 ») → index du mois
const MONTH_ALIASES: Record<string, number> = {
  ...Object.fromEntries(MONTHS.map((m, i) => [m, i])),
  janv: 0, fev: 1, fevr: 1, avr: 3, juil: 6, sept: 8, oct: 9, nov: 10, dec: 11,
};
const MONTH_RE = Object.keys(MONTH_ALIASES).sort((a, b) => b.length - a.length).join('|');
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Date approximative tirée du nom d'un dossier : « … 3 avril 2026 », « 7 nov.2025 »,
 * « 06.09.2025 » (jour), « … juin 2025 » (mois) ou « … 2025 … » (année seule). null sinon.
 */
export function dateFromAlbumName(name: string): { date: Date; precision: 'day' | 'month' | 'year' } | null {
  const text = fold(name);
  const numeric = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (numeric && +numeric[2] >= 1 && +numeric[2] <= 12) return { date: new Date(+numeric[3], +numeric[2] - 1, +numeric[1]), precision: 'day' };
  const full = text.match(new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${MONTH_RE})\\.?\\s*(20\\d{2})\\b`));
  if (full) return { date: new Date(+full[3], MONTH_ALIASES[full[2]], +full[1]), precision: 'day' };
  const month = text.match(new RegExp(`\\b(${MONTH_RE})\\.?\\s*(20\\d{2})\\b`));
  if (month) return { date: new Date(+month[2], MONTH_ALIASES[month[1]], 1), precision: 'month' };
  const year = text.match(/\b(20\d{2})\b/);
  if (year) return { date: new Date(+year[1], 0, 1), precision: 'year' };
  return null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function toAlbum(server: ServerAlbum, meta?: AlbumMeta): Album {
  let date: Date | null = null;
  let precision: 'day' | 'month' | 'year' = 'day';
  if (meta?.album_date) {
    const [y, m, d] = meta.album_date.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    const guessed = dateFromAlbumName(server.title || server.id);
    if (guessed) ({ date, precision } = guessed);
  }
  const dateLabel = !date
    ? ''
    : precision === 'year'
      ? String(date.getFullYear())
      : capitalize(date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const cover = meta?.cover_image || server.cover_image;
  return {
    id: server.id,
    title: meta?.title?.trim() || server.title || server.id,
    date,
    dateLabel,
    year: date?.getFullYear() ?? null,
    cover: cover ? getImageUrl(cover) : null,
    count: server.image_count,
    eventId: meta?.event_id ?? null,
  };
}

/** Fiches photo_albums ; liste vide si la table n'existe pas encore (SQL pas appliqué). */
async function fetchAlbumMeta(): Promise<AlbumMeta[]> {
  const { data, error } = await db.from('photo_albums').select('*');
  if (error) {
    console.warn('photo_albums indisponible :', error.message);
    return [];
  }
  return data;
}

/** Tous les albums visibles, du plus récent au plus ancien (sans date en dernier). */
export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const [res, metas] = await Promise.all([fetch(`${UPLOAD_URL}/upload/albums`), fetchAlbumMeta()]);
      if (!res.ok) throw new Error(`Albums : HTTP ${res.status}`);
      const server = (await res.json()) as ServerAlbum[];
      const byId = new Map(metas.map((m) => [m.album_id, m]));
      return server
        .filter((a) => !isHiddenAlbumId(a.id) && a.image_count > 0)
        .map((a) => toAlbum(a, byId.get(a.id)))
        .sort((a, b) => (b.date?.getTime() ?? -Infinity) - (a.date?.getTime() ?? -Infinity) || a.title.localeCompare(b.title, 'fr'));
    },
  });
}

/** Photos d'un album (URL complètes). */
export function useAlbumImages(albumId: string | undefined) {
  return useQuery({
    queryKey: ['albumImages', albumId],
    enabled: !!albumId,
    queryFn: async () => {
      const res = await fetch(`${UPLOAD_URL}/upload/albums/${encodeURIComponent(albumId!)}/images`);
      if (!res.ok) throw new Error(`Photos : HTTP ${res.status}`);
      const images = (await res.json()) as ServerImage[];
      return images.map((img) => ({ ...img, src: getImageUrl(img.image_url) }));
    },
  });
}

/** Albums liés à un événement (fiche événement : « Les photos de la soirée »). */
export function useEventAlbums(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventAlbums', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await db.from('photo_albums').select('album_id, title').eq('event_id', eventId!);
      if (error) return [];
      return data;
    },
  });
}
