// Lieu d'un événement : la base n'a qu'un champ texte libre `location`
// (« Marvelous - 3 Rue Saint Ravy 34000 Montpellier », « Le Coxx Montpellier »…).

/** Villes reconnues pour le filtre de l'agenda, dans l'ordre d'affichage. */
const KNOWN_CITIES = ['Montpellier', 'Nîmes', 'Sète', 'Béziers', 'Alès', 'Avignon', 'Perpignan', 'Toulouse', 'Marseille'];

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Ville de l'événement d'après le texte du lieu : d'abord une ville connue,
 * sinon le mot qui suit un code postal (« … 34000 Montpellier », format des
 * lieux importés de HelloAsso). null si rien de reconnaissable.
 */
export function eventCity(location?: string | null): string | null {
  if (!location) return null;
  const text = normalize(location);
  const known = KNOWN_CITIES.find((city) => text.includes(normalize(city)));
  if (known) return known;
  const match = location.match(/\b\d{5}\s+([A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?:[ -][A-Za-zÀ-ÖØ-öø-ÿ'’-]+)*)/);
  if (!match) return null;
  const city = match[1].trim();
  return city.charAt(0).toUpperCase() + city.slice(1);
}

/** Trie des villes selon l'ordre de KNOWN_CITIES. */
export function sortCities(cities: string[]): string[] {
  const rank = (c: string) => (KNOWN_CITIES.includes(c) ? KNOWN_CITIES.indexOf(c) : KNOWN_CITIES.length);
  return [...cities].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'fr'));
}

/** Itinéraire vers le lieu (Google Maps, ouvre l'appli sur mobile). */
export function directionsUrl(location: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
}
