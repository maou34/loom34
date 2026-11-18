import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSlugRedirect } from '@/lib/slug';
import { db } from '@/db/client';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ArrowLeft, Tag, Share2, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tables } from '@/db/types';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useSEO from '@/hooks/useSEO';
import { generateArticleStructuredData } from '@/lib/seo';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch article details
  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', slug],
    // Adresse inconnue (PGRST116) : inutile de réessayer, on passe tout de suite à la redirection / 404
    retry: (count, err) => (err as { code?: string })?.code !== 'PGRST116' && count < 3,
    queryFn: async () => {
      const { data, error } = await db
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single();
        
      if (error) throw error;
      return data as Tables<'articles'>;
    }
  });

  // SEO Configuration
  useSEO({
    title: article ? `${article.title} - LOOM` : 'Article - LOOM',
    description: article?.excerpt || 'Découvrez cet article de LOOM - Les Ours Occitanie Montpellier',
    keywords: article?.category ? ['LOOM', 'Bears', article.category, 'article', 'communauté'] : ['LOOM', 'Bears', 'article'],
    image: article?.image,
    type: 'article',
    publishedTime: article?.date,
    author: 'LOOM'
  });

  // Generate structured data for article
  useEffect(() => {
    if (article) {
      generateArticleStructuredData({
        title: article.title,
        description: article.excerpt,
        image: article.image,
        publishedTime: article.date,
        modifiedTime: article.updated_at,
        author: 'LOOM',
        url: window.location.href
      });
    }
  }, [article]);

  // Adresse inconnue : contenu renommé ? (slug_redirects) — sinon page 404
  const { data: movedTo, isFetched: redirectChecked } = useSlugRedirect('articles', slug, !!error);
  useEffect(() => {
    if (!error || !redirectChecked) return;
    if (movedTo) navigate(`/articles/${movedTo}${location.search}${location.hash}`, { replace: true });
    else navigate('/404');
  }, [error, redirectChecked, movedTo, navigate, location.search, location.hash]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-32">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-[400px] w-full rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="lg:col-span-1">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return null;
  }

  const formattedDate = new Date(article.date).toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero with Background Image Blur */}
      <div className="relative h-[60vh] min-h-[500px] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={article.image} 
            alt={article.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 hover:text-white mb-8 -ml-4" 
              onClick={() => navigate('/articles')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux articles
            </Button>
            
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 leading-tight max-w-4xl">
              {article.title}
            </h1>
            
            <div className="flex flex-wrap gap-6 text-lg md:text-xl font-medium text-white/90">
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                <CalendarDays className="w-5 h-5" /> 
                <span className="capitalize">{formattedDate}</span>
              </span>
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                <Tag className="w-5 h-5" /> 
                {article.category}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100"
            >
              <div className="prose prose-lg prose-orange max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({node, ...props}) => (
                      <img {...props} className="rounded-xl shadow-md my-8 w-full" />
                    ),
                    blockquote: ({node, ...props}) => (
                      <blockquote {...props} className="border-l-4 border-orange bg-orange/5 p-4 rounded-r-lg not-italic" />
                    )
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-6 sticky top-24"
            >
              {/* Details Card */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6 text-lg">Infos article</h3>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <div className="bg-orange/10 p-3 rounded-xl text-orange">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Publié le</p>
                      <p className="text-gray-600 capitalize">{formattedDate}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="bg-orange/10 p-3 rounded-xl text-orange">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Catégorie</p>
                      <p className="text-gray-600">{article.category}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="bg-orange/10 p-3 rounded-xl text-orange">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Temps de lecture</p>
                      <p className="text-gray-600">~5 min</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Share Card */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-orange" />
                  Partager
                </h3>
                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}>
                    Copier le lien
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
                  }}>
                    Facebook
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`, '_blank');
                  }}>
                    Twitter / X
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ArticleDetail;
