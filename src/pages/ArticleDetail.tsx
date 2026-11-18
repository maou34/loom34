import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, Share2 } from 'lucide-react';
import { db } from '@/db/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { btnSecondary, card, chip, container, pageFocus, strongLink } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { generateArticleStructuredData } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { formatLongDate } from '@/lib/eventDates';
import { shareLink } from '@/lib/share';
import { ARTICLE_LIST_SELECT, categoryName, readingTime, type ArticleListItem } from '@/lib/articles';

type ArticleRow = ArticleListItem & { updated_at: string };

/** Page d'un article (non maquettée : même charte que la fiche événement, colonne de lecture unique). */
const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const { data, error } = await db.from('articles').select(`${ARTICLE_LIST_SELECT}, updated_at`).eq('slug', slug).single();
      if (error) throw error;
      return data as unknown as ArticleRow;
    },
  });

  const { data: others = [] } = useQuery({
    queryKey: ['article', slug, 'others'],
    enabled: !!article,
    queryFn: async () => {
      const { data, error } = await db
        .from('articles')
        .select('id, title, slug, image, date')
        .eq('published', true)
        .neq('slug', slug!)
        .order('date', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const category = article ? categoryName(article) : null;

  useSEO({
    title: article ? `${article.title} - LOOM` : 'Article - LOOM',
    description: article?.excerpt || 'Découvrez cet article de LOOM - Les Ours Occitanie Montpellier',
    keywords: category ? ['LOOM', 'Bears', category, 'article', 'communauté'] : ['LOOM', 'Bears', 'article'],
    image: article?.image,
    type: 'article',
    publishedTime: article?.date,
    author: 'LOOM',
  });

  useEffect(() => {
    if (article) {
      generateArticleStructuredData({
        title: article.title,
        description: article.excerpt,
        image: article.image,
        publishedTime: article.date,
        modifiedTime: article.updated_at,
        author: 'LOOM',
        url: window.location.href,
      });
    }
  }, [article]);

  useEffect(() => {
    if (error) navigate('/404');
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-loom-bg">
        <Navbar />
        <div className={cn(container, 'flex max-w-[800px] flex-1 flex-col gap-5 py-10')} aria-hidden="true">
          <div className="h-10 w-3/4 animate-pulse rounded bg-loom-surface-2" />
          <div className="h-[360px] animate-pulse rounded-[22px] bg-loom-surface-2" />
          <div className="h-32 animate-pulse rounded bg-loom-surface-2" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className="flex-1">
        <article aria-labelledby="article-title" className={cn(container, 'flex max-w-[800px] flex-col gap-6 pb-14 pt-4 sm:pt-8')}>
          <nav aria-label="Fil d'Ariane" className="hidden text-sm text-loom-text-muted sm:block">
            <Link to="/articles" className={cn(strongLink, 'font-semibold')}>
              Actualités
            </Link>{' '}
            <span aria-hidden="true">›</span> <span aria-current="page">{article.title}</span>
          </nav>
          <Link to="/articles" className={cn('flex min-h-11 items-center gap-1 self-start rounded-lg font-semibold text-loom-link sm:hidden', pageFocus)}>
            <ChevronLeft aria-hidden="true" size={18} /> Actualités
          </Link>

          <header className="flex flex-col gap-3">
            {category && (
              <Link to={`/articles?categorie=${encodeURIComponent(category)}`} className={cn(chip, 'self-start no-underline hover:underline', pageFocus)}>
                {category}
              </Link>
            )}
            <h1 id="article-title" className="text-[30px] font-extrabold leading-tight tracking-[-0.01em] sm:text-[44px]">
              {article.title}
            </h1>
            {article.excerpt && <p className="text-lg text-loom-text-2 sm:text-xl">{article.excerpt}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-loom-text-muted">
              <span>
                {formatLongDate(article.date)} · {readingTime(article.content)}
              </span>
              <button type="button" onClick={() => shareLink(article.title)} className={cn(btnSecondary, 'h-10 px-3.5 text-sm')}>
                <Share2 aria-hidden="true" size={16} /> Partager
              </button>
            </div>
          </header>

          {article.image && (
            <div className="-mx-4 overflow-hidden bg-loom-surface-2 sm:mx-0 sm:rounded-[22px]">
              <img src={article.image} alt="" className="mx-auto block max-h-[560px] w-full object-contain" fetchPriority="high" />
            </div>
          )}

          <div className="prose prose-loom max-w-none sm:prose-lg prose-img:rounded-xl prose-blockquote:not-italic">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </div>
        </article>

        {others.length > 0 && (
          <section aria-labelledby="h-more" className={cn(container, 'flex flex-col gap-4 pb-16')}>
            <h2 id="h-more" className="text-2xl font-extrabold">
              À lire aussi
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {others.map((other) => (
                <Link
                  key={other.id}
                  to={`/articles/${other.slug}`}
                  className={cn(card, 'group flex overflow-hidden rounded-[18px] text-loom-text no-underline sm:flex-col', pageFocus)}
                >
                  <img src={other.image} alt="" loading="lazy" className="h-[88px] w-[88px] flex-none bg-loom-surface-2 object-cover sm:h-[140px] sm:w-full" />
                  <span className="flex min-w-0 flex-col justify-center gap-1 px-4 py-3">
                    <span className="font-extrabold leading-tight group-hover:underline underline-offset-4">{other.title}</span>
                    <span className="text-sm text-loom-text-muted">{formatLongDate(other.date)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ArticleDetail;
