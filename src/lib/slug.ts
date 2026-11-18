import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/client";

/**
 * Adresse (slug) à partir d'un titre : accents translittérés (« Nîmes » → « nimes »,
 * « fête » → « fete »), tout le reste en tirets. Même règle que la fonction SQL
 * public.slugify() (src/db/slug_redirects.sql) — garder les deux identiques.
 *
 * L'ancienne règle supprimait les lettres accentuées (« nmes », « f-te ») et
 * laissait des tirets en bout (« anniversaire- ») : les adresses ainsi créées
 * restent valides grâce aux redirections (slug_redirects).
 */
export function slugify(input: string): string {
  return input
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SlugKind = "events" | "articles";

/**
 * Nouvelle adresse d'un article / événement renommé (table slug_redirects,
 * alimentée par un trigger à chaque changement de slug). Active seulement quand
 * l'adresse demandée n'existe pas (`enabled`). `null` = pas de redirection.
 */
export function useSlugRedirect(kind: SlugKind, slug: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["slugRedirect", kind, slug],
    enabled: enabled && !!slug,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.from("slug_redirects").select("new_slug").eq("kind", kind).eq("old_slug", slug!).limit(1);
      if (error) return null; // table absente ou erreur : pas de redirection, la page affiche 404
      const target = data?.[0]?.new_slug;
      return target && target !== slug ? target : null;
    },
  });
}
