// Lieu d'un événement : la base n'a qu'un champ texte libre `location`
// (« Marvelous - 3 Rue Saint Ravy 34000 Montpellier », « Le Coxx Montpellier »…).

/** Villes reconnues pour le filtre de l'agenda, dans l'ordre d'affichage. */
const KNOWN_CITIES = ['Montpellier', 'Nîmes', 'Sète', 'Béziers', 'Alès', 'Avignon', 'Perpignan', 'Toulouse', 'Marseille'];

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Ville de l'événement (d'après le texte du lieu), ou null si aucune ville connue n'y figure. */
export function eventCity(location?: string | null): string | null {
  if (!location) return null;
  const text = normalize(location);
  return KNOWN_CITIES.find((city) => text.includes(normalize(city))) ?? null;
}

/** Trie des villes selon l'ordre de KNOWN_CITIES. */
export function sortCities(cities: string[]): string[] {
  return [...cities].sort((a, b) => KNOWN_CITIES.indexOf(a) - KNOWN_CITIES.indexOf(b));
}

/** Itinéraire vers le lieu (Google Maps, ouvre l'appli sur mobile). */
export function directionsUrl(location: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
}
