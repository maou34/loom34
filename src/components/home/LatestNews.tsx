import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { formatLongDate } from '@/lib/eventDates';
import SectionHeader from '@/components/site/SectionHeader';
import { card, chip, container, pageFocus } from '@/components/site/styles';

import { categoryName, pickFeatured, type ArticleListItem } from '@/lib/articles';

const FALLBACK_IMAGE = '/loom_logo_square.jpg';

/** « Les dernières nouvelles » : un article à la une + 2 vignettes (1 sur mobile). */
export default function LatestNews({ articles, isLoading }: { articles: ArticleListItem[]; isLoading: boolean }) {
  const { lead, rest: others } = pickFeatured(articles);

  return (
    <section aria-labelledby="news-title" className={cn(container, 'flex flex-col gap-6 py-10 sm:pb-16 sm:pt-14')}>
      <SectionHeader
        id="news-title"
        title="Les dernières nouvelles"
        mobileTitle="Dernières nouvelles"
        subtitle="Ce qui se passe chez LOOM et dans la communauté."
        link={{ to: '/articles', label: 'Toutes les actualités →', mobileLabel: 'Tout voir' }}
      />

      {isLoading ? (
        <div className="flex flex-wrap gap-5" aria-hidden="true">
          <div className={cn(card, 'h-[320px] flex-[3_1_520px] animate-pulse bg-loom-surface-2')} />
          <div className="flex flex-[2_1_340px] flex-col gap-5">
            <div className={cn(card, 'h-[150px] animate-pulse bg-loom-surface-2')} />
            <div className={cn(card, 'h-[150px] animate-pulse bg-loom-surface-2')} />
          </div>
        </div>
      ) : !lead ? (
        <p className="text-loom-text-muted">Aucune actualité pour le moment.</p>
      ) : (
        <div className="flex flex-wrap items-stretch gap-4 sm:gap-5">
          {/* Article à la une */}
          <Link
            to={`/articles/${lead.slug}`}
            className={cn(
              card,
              'group flex min-w-0 flex-[3_1_520px] flex-wrap overflow-hidden text-loom-text no-underline shadow-loom-card',
              pageFocus,
            )}
          >
            <img
              src={lead.image || FALLBACK_IMAGE}
              alt=""
              loading="lazy"
              className="h-48 w-full min-w-0 flex-[1_1_260px] bg-loom-surface-2 object-cover sm:h-[320px]"
            />
            <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-5 sm:p-7">
              <span className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-loom-chip-hot-bg px-2.5 py-0.5 text-xs font-extrabold text-loom-chip-hot-fg">
                  À la une
                </span>
                {categoryName(lead) && <span className={chip}>{categoryName(lead)}</span>}
              </span>
              <span className="text-xl font-extrabold leading-tight group-hover:underline group-hover:underline-offset-4 sm:text-[28px] sm:leading-[1.15]">
                {lead.title}
              </span>
              {lead.excerpt && (
                <span className="hidden sm:block">
                  <span className="text-base text-loom-text-2 line-clamp-4">{lead.excerpt}</span>
                </span>
              )}
              <span className="mt-auto flex items-center justify-between text-sm text-loom-text-muted">
                {formatLongDate(lead.date)}
                <span aria-hidden="true" className="hidden font-bold text-loom-link sm:inline">
                  Lire l'article →
                </span>
              </span>
            </span>
          </Link>

          {/* Vignettes */}
          {others.length > 0 && (
            <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4 sm:gap-5">
              {others.map((article, i) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  className={cn(
                    card,
                    'group flex-1 items-center gap-4 rounded-[18px] p-3.5 text-loom-text no-underline',
                    i > 0 ? 'hidden lg:flex' : 'flex',
                    pageFocus,
                  )}
                >
                  <img
                    src={article.image || FALLBACK_IMAGE}
                    alt=""
                    loading="lazy"
                    className="h-[72px] w-[72px] flex-none rounded-xl bg-loom-surface-2 object-cover sm:h-[120px] sm:w-[120px]"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {categoryName(article) && <span className={cn(chip, 'hidden self-start sm:inline-flex')}>{categoryName(article)}</span>}
                    <span className="text-base font-extrabold leading-tight group-hover:underline group-hover:underline-offset-4 sm:text-lg">
                      {article.title}
                    </span>
                    <span className="text-sm text-loom-text-muted">
                      <span className="sm:hidden">{categoryName(article) ? `${categoryName(article)} · ` : ''}</span>
                      {formatLongDate(article.date)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
