// Géocodage d'une adresse avec Nominatim (OpenStreetMap), pour le plan de la
// fiche événement. Même logique que src/lib/geocode.ts (navigateur de l'admin).
// Politique d'usage Nominatim : 1 requête / s max, User-Agent identifiable ;
// appelé seulement quand le lieu d'un événement change (rare).
import { USER_AGENT } from "./helloasso.ts";
import type { PublicForm } from "./helloasso.ts";

export type Coordinates = { latitude: number | null; longitude: number | null };

const TOO_VAGUE = new Set(["city", "town", "village", "municipality", "postcode", "county", "state", "region", "country"]);
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Formulations à essayer (voir src/lib/geocode.ts, même logique). */
function geocodeQueries(location: string): string[] {
  const clean = location.replace(/,?\s*\bFR\b/g, "").replace(/\s+/g, " ").trim();
  const candidates = [clean];
  const dash = clean.indexOf(" - ");
  if (dash > 0) candidates.push(clean.slice(dash + 3));
  const firstComma = clean.indexOf(",");
  if (firstComma > 0 && !/^\d/.test(clean)) candidates.push(clean.slice(firstComma + 1));
  const number = clean.search(/\b\d{1,4}\s*(?:bis|ter)?,?\s+[A-Za-zÀ-ÿ]/i);
  if (number > 0) candidates.push(clean.slice(number));
  return [...new Set(candidates.map((c) => c.replace(/^[\s,-]+/, "").trim()).filter((c) => c.length > 3 && !/^\d{5}\b/.test(c)))];
}

async function search(q: string): Promise<{ latitude: number; longitude: number } | null> {
  const params = new URLSearchParams({ q, format: "jsonv2", limit: "1", countrycodes: "fr", "accept-language": "fr" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const results = (await res.json()) as { lat?: string; lon?: string; addresstype?: string }[];
  // Un résultat « ville » ou « code postal » placerait le repère au centre-ville : on l'ignore.
  if (!results[0] || TOO_VAGUE.has(results[0].addresstype ?? "")) return null;
  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

/** Coordonnées du lieu (France), ou null si introuvable / erreur. 1 requête / s. */
export async function geocodeAddress(location: string): Promise<{ latitude: number; longitude: number } | null> {
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

/**
 * Coordonnées à écrire pour un lieu venant de HelloAsso : celles de HelloAsso si
 * présentes, sinon géocodage — uniquement si le lieu a changé ou n'a pas encore
 * de coordonnées. Renvoie {} quand il n'y a rien à modifier.
 */
export async function coordinatesForPlace(
  form: PublicForm,
  location: string | undefined,
  current?: { location: string | null; latitude: number | null; longitude: number | null },
): Promise<Coordinates | Record<string, never>> {
  if (!location) return {};
  const unchanged = current && current.location === location && current.latitude !== null && current.longitude !== null;
  if (unchanged) return {};
  const geo = form.place?.geoLocation;
  if (typeof geo?.latitude === "number" && typeof geo?.longitude === "number") {
    return { latitude: geo.latitude, longitude: geo.longitude };
  }
  if (current && current.location === location && current.latitude === null) {
    // Déjà tenté pour ce même lieu : on ne réessaie pas à chaque synchro (toutes les 15 min).
    return {};
  }
  const found = await geocodeAddress(location);
  return found ?? { latitude: null, longitude: null };
}
