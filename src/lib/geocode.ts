// Géocodage d'une adresse avec Nominatim (OpenStreetMap), depuis le navigateur
// de l'admin. Politique d'usage Nominatim : requêtes ponctuelles (à
// l'enregistrement d'un événement), 1 par seconde maximum, jamais depuis les
// pages publiques. Même logique côté Edge Functions : supabase/functions/_shared/geocode.ts
// (à garder synchronisée).

export type Coordinates = { latitude: number; longitude: number };

const TOO_VAGUE = new Set(['city', 'town', 'village', 'municipality', 'postcode', 'county', 'state', 'region', 'country']);
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Formulations à essayer, de la plus complète à la plus réduite. Nominatim ne
 * trouve rien quand le nom du lieu précède l'adresse (« Marvelous - 3 Rue Saint
 * Ravy 34000 Montpellier ») : on retente sans le nom, puis à partir du numéro.
 */
export function geocodeQueries(location: string): string[] {
  const clean = location.replace(/,?\s*\bFR\b/g, '').replace(/\s+/g, ' ').trim();
  const candidates = [clean];
  const dash = clean.indexOf(' - ');
  if (dash > 0) candidates.push(clean.slice(dash + 3));
  const firstComma = clean.indexOf(',');
  if (firstComma > 0 && !/^\d/.test(clean)) candidates.push(clean.slice(firstComma + 1));
  const number = clean.search(/\b\d{1,4}\s*(?:bis|ter)?,?\s+[A-Za-zÀ-ÿ]/i);
  if (number > 0) candidates.push(clean.slice(number));
  return [...new Set(candidates.map((c) => c.replace(/^[\s,-]+/, '').trim()).filter((c) => c.length > 3 && !/^\d{5}\b/.test(c)))];
}

async function search(q: string): Promise<Coordinates | null> {
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'fr', 'accept-language': 'fr' });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const results = (await res.json()) as { lat?: string; lon?: string; addresstype?: string }[];
  // Un résultat « ville » ou « code postal » placerait le repère au centre-ville : on l'ignore.
  if (!results[0] || TOO_VAGUE.has(results[0].addresstype ?? '')) return null;
  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

/** Coordonnées du lieu (France), ou null si introuvable / erreur réseau. */
export async function geocodeAddress(location: string): Promise<Coordinates | null> {
  const queries = geocodeQueries(location);
  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await sleep(1100);
    try {
      const found = await search(queries[i]);
      if (found) return found;
    } catch {
      return null;
    }
  }
  return null;
}
