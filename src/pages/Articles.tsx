import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, Search } from 'lucide-react';
import { db } from '@/db/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SOCIAL_LINKS } from '@/components/site/navigation';
import { btnPrimary, btnSecondary, card, chip, container, pageFocus } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { cn } from '@/lib/utils';
import { formatLongDate } from '@/lib/eventDates';
import { stripMarkdown } from '@/lib/markdown';
import {
  ARTICLE_LIST_SELECT,
  categoryName,
  pickFeatured,
  readingTime,
  useArticleCategories,
  type ArticleListItem,
} from '@/lib/articles';

const PAGE_SIZE = 9;

/** Recherche insensible à la casse et aux accents. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function ArticleImage({ src, className }: { src?: string | null; className?: string }) {
  if (src) return <img src={src} alt="" loading="lazy" className={cn('bg-loom-surface-2 object-cover', className)} />;
  return (
    <div role="img" aria-label="Pas encore d'image" className={cn('flex items-center justify-center bg-loom-chip-bg text-loom-chip-fg', className)}>
      <Newspaper aria-hidden="true" size={34} strokeWidth={1.6} />
    </div>
  );
}

const Articles = () => {
  useSEO({
    title: 'Actualités - LOOM | Les nouvelles de la communauté Bear de Montpellier',
    description: "Les actualités de LOOM - Les Ours Occitanie Montpellier : vie de l'association, partenariats, communauté Bear, retours en images.",
    keywords: ['LOOM actualités', 'Bears', 'communauté Bear', 'Montpellier', 'association LGBTQ+'],
    type: 'website',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('categorie');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles', 'list'],
    queryFn: async () => {
      const { data, error } = await db
        .from('articles')
        .select(ARTICLE_LIST_SELECT)
        .eq('published', true)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as unknown as ArticleListItem[];
    },
  });
  const { data: allCategories = [] } = useArticleCategories();

  // Filtres : seulement les catégories qui ont des articles publiés, dans l'ordre de l'admin
  const categories = useMemo(() => {
    const used = new Set(articles.map((a) => a.article_categories?.id).filter(Boolean));
    return allCategories.filter((c) => used.has(c.id));
  }, [articles, allCategories]);
  const activeCategory = categories.find((c) => c.name === categoryParam) ?? null;

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return articles.filter((a) => {
      if (activeCategory && a.article_categories?.id !== activeCategory.id) return false;
      if (!q) return true;
      return fold(`${a.title} ${a.excerpt} ${stripMarkdown(a.content)}`).includes(q);
    });
  }, [articles, activeCategory, query]);

  const browsing = !activeCategory && !query.trim();
  // « À la une » en grand seulement sans filtre ni recherche
  const { lead, rest } = browsing ? pickFeatured(filtered) : { lead: null, rest: filtered };
  const visible = rest.slice(0, limit);

  const selectCategory = (name: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (name) next.set('categorie', name);
    else next.delete('categorie');
    setSearchParams(next, { replace: true });
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className={cn(container, 'flex flex-1 flex-col gap-6 pb-16 pt-6 sm:gap-7 sm:pb-[72px] sm:pt-10')}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[34px] font-extrabold tracking-[-0.02em] sm:text-[44px]">Actualités</h1>
            <p className="text-base text-loom-text-2 sm:text-lg">Ce qui se passe chez LOOM et dans la communauté.</p>
          </div>
          <label className="relative w-full sm:w-[320px]">
            <span className="sr-only">Rechercher un article</span>
            <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-loom-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="Rechercher un article"
              className={cn(
                'h-12 w-full rounded-full border border-loom-border-strong bg-loom-surface pl-11 pr-4 text-base text-loom-text placeholder:text-loom-text-muted',
                pageFocus,
              )}
            />
          </label>
        </div>

        {categories.length > 1 && (
          <div role="group" aria-label="Filtrer par catégorie" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[null, ...categories].map((c) => {
              const pressed = (activeCategory?.id ?? null) === (c?.id ?? null);
              return (
                <button
                  key={c?.id ?? 'all'}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => selectCategory(c?.name ?? null)}
                  className={cn(
                    'h-10 flex-none rounded-full border px-4 text-[15px] font-semibold',
                    pressed
                      ? 'border-loom-primary-bg bg-loom-primary-bg text-loom-primary-fg'
                      : 'border-loom-border-strong bg-loom-surface text-loom-text hover:border-loom-text-muted',
                    pageFocus,
                  )}
                >
                  {c?.name ?? 'Toutes'}
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div aria-hidden="true" className="flex flex-col gap-6">
            <div className={cn(card, 'h-[340px] animate-pulse bg-loom-surface-2')} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={cn(card, 'h-[300px] animate-pulse bg-loom-surface-2')} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* À la une */}
            {lead && (
              <Link
                to={`/articles/${lead.slug}`}
                className={cn(card, 'group flex flex-col overflow-hidden text-loom-text no-underline shadow-loom-card md:flex-row', pageFocus)}
              >
                {/* Desktop : l'image remplit la hauteur sans l'imposer (visuels carrés) */}
                <span className="relative block h-52 w-full flex-none sm:h-[300px] md:h-auto md:min-h-[340px] md:w-[53%]">
                  <ArticleImage src={lead.image} className="absolute inset-0 h-full w-full" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-8">
                  <span className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-loom-chip-hot-bg px-2.5 py-0.5 text-xs font-extrabold text-loom-chip-hot-fg">
                      À la une
                    </span>
                    {categoryName(lead) && <span className={chip}>{categoryName(lead)}</span>}
                  </span>
                  <span className="text-2xl font-extrabold leading-tight group-hover:underline group-hover:underline-offset-4 sm:text-[32px] sm:leading-[1.15]">
                    {lead.title}
                  </span>
                  {lead.excerpt && <span className="text-base text-loom-text-2 sm:text-[17px]">{lead.excerpt}</span>}
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-sm text-loom-text-muted">
                    <span>
                      {formatLongDate(lead.date)} · {readingTime(lead.content)}
                    </span>
                    <span aria-hidden="true" className="font-bold text-loom-link">
                      Lire l'article →
                    </span>
                  </span>
                </span>
              </Link>
            )}

            <section aria-labelledby="h-all" className="flex flex-col gap-5">
              <h2 id="h-all" className="text-2xl font-extrabold">
                {activeCategory ? activeCategory.name : query.trim() ? 'Résultats' : 'Tous les articles'}
                {!browsing && <span className="ml-2 text-base font-semibold text-loom-text-muted">({filtered.length})</span>}
              </h2>

              {filtered.length === 0 ? (
                <p className={cn(card, 'p-6 text-loom-text-muted')}>
                  Aucun article ne correspond{query.trim() ? ` à « ${query.trim()} »` : ''}.
                </p>
              ) : (
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((article) => (
                    <li key={article.id} className="flex">
                      <Link
                        to={`/articles/${article.slug}`}
                        className={cn(card, 'group flex w-full flex-col overflow-hidden rounded-[18px] text-loom-text no-underline', pageFocus)}
                      >
                        <ArticleImage src={article.image} className="h-[180px] w-full" />
                        <span className="flex flex-1 flex-col gap-2 p-5">
                          {categoryName(article) && <span className={cn(chip, 'self-start')}>{categoryName(article)}</span>}
                          <span className="text-lg font-extrabold leading-tight group-hover:underline group-hover:underline-offset-4">
                            {article.title}
                          </span>
                          {article.excerpt && (
                            <span className="block">
                              <span className="text-[15px] text-loom-text-2 line-clamp-2">{article.excerpt}</span>
                            </span>
                          )}
                          <span className="mt-auto pt-2 text-sm text-loom-text-muted">{formatLongDate(article.date)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {rest.length > visible.length && (
                <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)} className={cn(btnSecondary, 'h-12 self-center rounded-full px-6')}>
                  Afficher plus d'articles
                </button>
              )}
            </section>
          </>
        )}

        <aside
          aria-labelledby="h-follow"
          className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-loom-highlight-border bg-loom-highlight-bg p-6 sm:px-8"
        >
          <div className="flex flex-col gap-1">
            <h2 id="h-follow" className="text-xl font-extrabold">
              Ne ratez rien
            </h2>
            <p className="text-loom-text-2">Les photos des soirées et les annonces de dernière minute passent d'abord par nos réseaux.</p>
          </div>
          <div className="flex gap-2.5">
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, 'h-11 px-5')}>
              Instagram<span className="sr-only"> (nouvel onglet)</span>
            </a>
            <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, 'h-11 px-5')}>
              Facebook<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
};

export default Articles;
