import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import type { Tables } from '@/db/types';

/** Colonnes des listes d'articles (accueil, /articles), avec le nom de la catégorie. */
export const ARTICLE_LIST_SELECT = 'id, title, slug, excerpt, image, date, is_featured, content, article_categories(id, name)';

export type ArticleListItem = Pick<
  Tables<'articles'>,
  'id' | 'title' | 'slug' | 'excerpt' | 'image' | 'date' | 'is_featured' | 'content'
> & { article_categories: Pick<Tables<'article_categories'>, 'id' | 'name'> | null };

export const categoryName = (article: Pick<ArticleListItem, 'article_categories'>) => article.article_categories?.name ?? null;

/** « 3 min de lecture » (≈ 200 mots / minute, 1 min minimum). */
export function readingTime(markdown?: string | null): string {
  const words = (markdown ?? '').replace(/[#*_>`[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min de lecture`;
}

/** L'article « À la une » : celui choisi dans l'admin, sinon le plus récent. */
export function pickFeatured<T extends Pick<ArticleListItem, 'is_featured'>>(articles: T[]): { lead: T | null; rest: T[] } {
  const lead = articles.find((a) => a.is_featured) ?? articles[0] ?? null;
  return { lead, rest: articles.filter((a) => a !== lead) };
}

/** Catégories d'articles, dans l'ordre choisi dans l'admin. */
export function useArticleCategories() {
  return useQuery({
    queryKey: ['articleCategories'],
    queryFn: async () => {
      const { data, error } = await db.from('article_categories').select('*').order('position').order('name');
      if (error) throw error;
      return data;
    },
  });
}
