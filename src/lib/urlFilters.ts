import { useSearchParams } from "react-router-dom";

/** Valeur « pas de filtre » des listes déroulantes (Radix Select refuse ""). */
export const ALL = "all";

/**
 * Filtres des listes admin gardés dans l'adresse (?ville=, ?annee=…), à côté de
 * ?onglet= : un retour arrière ou un lien partagé retrouve la même liste.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, searchParams.get(k) ?? ALL])) as Record<K, string>;
  const setFilter = (key: K, value: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === ALL) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const clearFilters = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      },
      { replace: true },
    );
  const activeCount = keys.filter((k) => values[k] !== ALL).length;
  return { values, setFilter, clearFilters, activeCount };
}
