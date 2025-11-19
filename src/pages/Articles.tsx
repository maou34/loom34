import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import { Search, Filter, Newspaper, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import { Tables } from '@/db/types';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import useSEO from '@/hooks/useSEO';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const Articles = () => {
  // SEO Configuration
  useSEO({
    title: 'Articles - LOOM | Actualités et nouvelles de la communauté Bear',
    description: 'Découvrez les derniers articles de LOOM - Les Ours Occitanie Méditerranée. Actualités, événements passés, témoignages et nouvelles de notre communauté Bear.',
    keywords: ['LOOM articles', 'actualités Bears', 'communauté Bear', 'Montpellier', 'nouvelles LGBTQ+', 'événements Bears'],
    type: 'website'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const articlesPerPage = 9;

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles', searchQuery, categoryFilter],
    queryFn: async () => {
      let query = db
        .from('articles')
        .select('*')
        .eq('published', true)
        .order('date', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Tables<'articles'>[];
    }
  });

  // Get unique categories for filter
  const categories = [...new Set(articles.map(article => article.category))];

  // Calculate pagination
  const totalPages = Math.ceil(articles.length / articlesPerPage);
  const paginatedArticles = articles.slice(
    (currentPage - 1) * articlesPerPage, 
    currentPage * articlesPerPage
  );

  const isFiltered = searchQuery !== '' || (categoryFilter !== '' && categoryFilter !== 'all');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section - Modern & Immersive */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden pt-20">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-orange/10 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ rotate: -360, scale: [1, 1.2, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-brown/10 rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-orange/10 text-orange font-semibold text-sm mb-6 tracking-wider uppercase">
              <Newspaper className="w-4 h-4" />
              Le Journal
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
              L'Actualité <span className="text-transparent bg-clip-text bg-gradient-to-r from-brown to-orange">LOOM</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Plongez dans la vie de l'association : retours sur événements, portraits et nouvelles fraîches.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Search and Filter Bar - Floating Glass */}
      <section className="sticky top-20 z-30 py-4 pointer-events-none">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl p-4 max-w-4xl mx-auto pointer-events-auto"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher un article..."
                  className="pl-10 bg-white/50 border-gray-200 focus:border-orange focus:ring-orange/20 transition-all duration-300"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white/50 border-gray-200 focus:ring-orange/20 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <SelectValue placeholder="Catégorie" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20 shadow-xl">
                    <SelectItem value="all" className="cursor-pointer hover:bg-orange/10 focus:bg-orange/10 focus:text-orange">Toutes les catégories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="cursor-pointer hover:bg-orange/10 focus:bg-orange/10 focus:text-orange">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isFiltered && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                    }}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12 pb-24">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-[400px] bg-gray-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <ArticleCard
                    title={article.title}
                    excerpt={article.excerpt}
                    date={article.date}
                    image={article.image}
                    category={article.category}
                    slug={article.slug}
                    featured={!isFiltered && currentPage === 1 && index === 0}
                    className={!isFiltered && currentPage === 1 && index === 0 ? "md:col-span-2 lg:col-span-2 h-full" : "h-full"}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun article trouvé</h3>
              <p className="text-gray-500">Essayez de modifier vos critères de recherche.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={currentPage === i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Articles;
