import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CalendarDays, ShoppingBag, Users, Image, Heart, ExternalLink, ArrowRight, Newspaper, Handshake, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { db } from '@/db/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SectionHeading from '@/components/SectionHeading';
import ArticleCard from '@/components/ArticleCard';
import EventCard from '@/components/EventCard';
import Button from '@/components/Button';
import { Tables } from '@/db/types';
import useSEO from '@/hooks/useSEO';
import { SEOHomePage } from '@/components/SEOPage';
import { InternalLinks } from '@/components/InternalLinks';

const Index = () => {
  // SEO Configuration avec composant dédié
  const seoDescription = 'Rejoignez LOOM, l\'association Bear fondée en 2017 à Montpellier. Plus de 150 membres, 50+ événements par an. Découvrez notre communauté dynamique et nos activités.';
  
  // SEO Configuration (hook existant maintenu pour compatibilité)
  useSEO({
    title: 'LOOM - Les Ours Occitanie Méditerranée | Communauté Bear de Montpellier',
    description: seoDescription,
    keywords: ['LOOM', 'Bears', 'Ours', 'Montpellier', 'Occitanie', 'Méditerranée', 'Association', 'Communauté', 'LGBTQ+', 'événements', 'Bear community'],
    type: 'website'
  });

  // Animation on scroll
  const [isVisible, setIsVisible] = useState(false);
  const partnersRef = useRef<HTMLDivElement>(null);
  // Fetch latest articles
  const { data: latestArticles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ['latestArticles'],
    queryFn: async () => {
      const { data, error } = await db
        .from('articles')
        .select('*')
        .eq('published', true)
        .order('date', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as Tables<'articles'>[];
    }
  });

  // Fetch upcoming events
  const { data: upcomingEventsRaw = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('published', true)
        .order('date', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data as Tables<'events'>[];
    }
  });
  // Filter upcoming events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = (upcomingEventsRaw || []).filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  }).slice(0, 4);

  // Partners automatic scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 100) {
        setIsVisible(true);
      }
    };

    // Set initially
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Partners automatic scroll animation
  useEffect(() => {
    const partnersContainer = partnersRef.current;
    if (!partnersContainer) return;

    const scrollWidth = partnersContainer.scrollWidth;
    const clientWidth = partnersContainer.clientWidth;
    
    if (scrollWidth <= clientWidth) return; // No need to scroll if all items fit

    let scrollPosition = 0;
    const speed = 1; // pixels per frame
    
    const scroll = () => {
      if (!partnersContainer) return;
      
      scrollPosition += speed;
      
      // Reset position when we've scrolled the full width
      if (scrollPosition >= scrollWidth / 2) {
        scrollPosition = 0;
      }
      
      partnersContainer.scrollLeft = scrollPosition;
      requestAnimationFrame(scroll);
    };
    
    const animationId = requestAnimationFrame(scroll);
    
    return () => cancelAnimationFrame(animationId);
  }, [isVisible]);

  // Partners data
  const partners = [
    { id: 1, name: "Community Center Paris", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+1" },
    { id: 2, name: "Rainbow Foundation", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+2" },
    { id: 3, name: "Local Bistro", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+3" },
    { id: 4, name: "Inclusive Spaces Co.", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+4" },
    { id: 5, name: "City of Paris", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+5" },
    { id: 6, name: "Pride Alliance", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+6" },
    { id: 7, name: "Global Diversity Fund", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+7" },
    { id: 8, name: "Tech for All", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+8" },
    { id: 9, name: "Eco Friends", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+9" },
    { id: 10, name: "Youth Support Network", logo: "https://via.placeholder.com/200x100/f3f4f6/666666?text=Partner+10" }
  ];

  // HelloAsso URLs
  const SHOP_URL = "https://www.helloasso.com/associations/your-association/boutiques/shop";
  const MEMBERSHIP_URL = "https://www.helloasso.com/associations/association-les-ours-occitanie-mediterranee-loom/adhesions/adhesion-2024-2025";
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      {/* SEO optimisé pour la page d'accueil */}
      <SEOHomePage 
        title="Communauté Bear de Montpellier"
        description={seoDescription}
      />
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-tan/30 blur-3xl opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-orange/10 blur-3xl opacity-40"></div>
        </div>

        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:w-1/2 space-y-8"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-orange/20 shadow-sm text-orange-dark text-sm font-medium">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange"></span>
                </span>
                Bienvenue chez Loom !
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-gray-900 tracking-tight">
                Les <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brown to-orange">Ours<br />Occitanie<br />Montpellier</span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-xl leading-relaxed">
                Association Bear fondée en 2017. Un espace inclusif pour les Bears et tous ceux qui aiment les Ours, les poils et la convivialité, du XS au XXXXXL.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  className="bg-brown hover:bg-brown-dark text-white px-8 py-6 rounded-full text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                  onClick={() => window.open(MEMBERSHIP_URL, '_blank', 'noopener,noreferrer')}
                >
                  Nous Rejoindre
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-brown/20 text-brown hover:bg-brown/5 px-8 py-6 rounded-full text-lg"
                >
                  <Link to="/about">En Savoir Plus</Link>
                </Button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:w-1/2 relative"
            >
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white/50 backdrop-blur-sm">
                <img 
                  src="/gallery/MONTPELL'BEAR 2025 Samedi soir 28 juin/0.9173911621794534.JPG"
                  alt="Community gathering" 
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brown/40 via-transparent to-transparent"></div>
              </div>
              
              {/* Floating Stats Cards */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-8 -left-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 hidden md:flex items-center gap-4"
              >
                <div className="bg-orange/10 rounded-xl p-3">
                  <Users size={28} className="text-orange" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Membres Actifs</p>
                  <p className="text-gray-900 font-bold text-2xl">150+</p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -top-8 -right-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 hidden md:flex items-center gap-4"
              >
                <div className="bg-yellow/10 rounded-xl p-3">
                  <CalendarDays size={28} className="text-yellow-dark" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Événements / an</p>
                  <p className="text-gray-900 font-bold text-2xl">50+</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Latest Articles Section */}
      <section className={`py-16 md:py-24 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="container mx-auto px-4">
          <SectionHeading 
            title="Nos derniers Articles" 
          />
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {isLoadingArticles ? (
              // Loading state
              Array(3).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse bg-white rounded-2xl p-6 h-96 shadow-sm">
                  <div className="w-full h-48 bg-gray-200 rounded-xl mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))
            ) : latestArticles.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500">Aucun Article Disponible pour le moment</p>
              </div>
            ) : (
              latestArticles.map((article) => (
                <motion.div key={article.id} variants={itemVariants}>
                  <ArticleCard 
                    title={article.title}
                    excerpt={article.excerpt}
                    date={article.date}
                    image={article.image}
                    category={article.category}
                    slug={article.slug}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
          
          <div className="mt-12 text-center">
            <Link to="/articles">
              <Button variant="outline" rightIcon={<ChevronRight size={18} />} className="rounded-full px-8 hover:bg-tan/20 border-brown/20 text-brown">
                Voir Tous les Articles
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Upcoming Events Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-tan/20 to-white/50 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden -z-10 opacity-30">
          <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-orange/10 blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4">
          <SectionHeading 
            title="Nos prochains événements" 
          />
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {isLoadingEvents ? (
              // Loading state
              Array(2).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse bg-white rounded-2xl p-6 h-96 shadow-sm">
                  <div className="w-full h-48 bg-gray-200 rounded-xl mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))
            ) : upcomingEvents.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500">Aucun Évènement Disponible pour le moment</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <motion.div key={event.id} variants={itemVariants}>
                  <EventCard 
                    title={event.title}
                    description={event.description}
                    date={event.date}
                    time={event.time}
                    location={event.location}
                    image={event.image}
                    slug={event.slug}
                    registrationUrl={event.registration_url}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
          
          <div className="mt-12 text-center">
            <Link to="/events">
              <Button rightIcon={<CalendarDays size={18} />} className="rounded-full px-8 bg-brown hover:bg-brown-dark shadow-lg hover:shadow-xl transition-all">
                Voir tout le calendrier
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Monsieur Ours Spotlight */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-[2.5rem] overflow-hidden bg-brown text-white relative shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('/gallery/images/election_2025_vainqueurs.jpg')] bg-cover bg-center hidden md:block opacity-90 mix-blend-overlay">
              <div className="absolute inset-0 bg-transparent"></div>
            </div>
            
            <div className="md:w-3/5 lg:w-1/2 p-10 md:p-16 lg:p-20 relative z-10">
              <div className="inline-block mb-6">
                <div className="w-16 h-1.5 bg-orange rounded-full mb-2"></div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Monsieur Ours</h2>
              <p className="text-tan/90 text-xl mb-10 leading-relaxed">
               Chaque année, lors de la Montpell Bear's, Monsieur Ours et ses oursons sont élus par la communauté Bear présente lors de cet événement.
              </p>
              <Link to="/monsieur-ours">
                <Button 
                  variant="secondary" 
                  rightIcon={<ChevronRight size={18} />}
                  className="bg-white text-brown hover:bg-tan hover:text-brown-dark border-none rounded-full px-8 py-6 text-lg shadow-lg transition-all transform hover:scale-105"
                >
                  En savoir plus
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <SectionHeading 
            title="Notre communauté" 
            centered
          />
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16"
          >
            {/* Feature 1 */}
            <motion.div variants={itemVariants} className="bg-gray-50 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 group">
              <div className="rounded-2xl bg-brown/10 w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-brown group-hover:text-white transition-colors duration-300">
                <Users size={32} className="text-brown group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Une communauté active</h3>
              <p className="text-gray-600 leading-relaxed">
                Rejoignez une communauté dynamique de plus de 150 personnes !
              </p>
            </motion.div>
            
            {/* Feature 2 */}
            <motion.div variants={itemVariants} className="bg-gray-50 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 group">
              <div className="rounded-2xl bg-orange/10 w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-orange group-hover:text-white transition-colors duration-300">
                <CalendarDays size={32} className="text-orange group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">De nombreux événements</h3>
              <p className="text-gray-600 leading-relaxed">
                Rejoignez la communauté et participez à nos événements tout au long de l'année!
              </p>
            </motion.div>
            
            {/* Feature 3 */}
            <motion.div variants={itemVariants} className="bg-gray-50 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 group">
              <div className="rounded-2xl bg-yellow/10 w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-yellow group-hover:text-brown-dark transition-colors duration-300">
                <ShoppingBag size={32} className="text-yellow-dark group-hover:text-brown-dark transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Boutique Communautaire</h3>
              <p className="text-gray-600 leading-relaxed">
                Aidez nous en achetant nos produits dérivés et nos goodies!
              </p>
            </motion.div>
            
            {/* Feature 4 */}
            <motion.div variants={itemVariants} className="bg-gray-50 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 group">
              <div className="rounded-2xl bg-tan/30 w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-tan group-hover:text-brown-dark transition-colors duration-300">
                <Image size={32} className="text-brown group-hover:text-brown-dark transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Galerie Photo</h3>
              <p className="text-gray-600 leading-relaxed">
                Explorez notre galerie photo pour revivre les moments forts de nos événements.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Navigation rapide et SEO - Section de liens internes */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-tan/20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[-5%] w-[300px] h-[300px] rounded-full bg-orange/5 blur-3xl"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-brown/5 blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeading 
            title="Explorez LOOM" 
            subtitle="Plongez au cœur de notre univers et découvrez tout ce que nous avons à offrir"
            centered
          />
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { path: '/about', name: 'À propos', icon: <Users className="w-6 h-6" />, description: 'Découvrez notre histoire, nos valeurs et l\'équipe qui fait vivre l\'association.' },
              { path: '/articles', name: 'Actualités', icon: <Newspaper className="w-6 h-6" />, description: 'Restez informés des dernières nouvelles et des sujets qui animent la communauté.' },
              { path: '/events', name: 'Événements', icon: <CalendarDays className="w-6 h-6" />, description: 'Apéros, sorties, repas... Participez à nos prochaines rencontres conviviales.' },
              { path: '/gallery', name: 'Galerie', icon: <Image className="w-6 h-6" />, description: 'Retour en images sur nos moments forts et nos plus beaux souvenirs ensemble.' },
              { path: '/partners', name: 'Partenaires', icon: <Handshake className="w-6 h-6" />, description: 'Ils nous soutiennent et nous permettent de vous proposer le meilleur.' },
              { path: '/monsieur-ours', name: 'Monsieur Ours', icon: <Crown className="w-6 h-6" />, description: 'Rencontrez la mascotte emblématique élue chaque année par la communauté.' },
            ].map((link, index) => (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={link.path} className="block h-full">
                  <div className="bg-white rounded-2xl p-6 h-full shadow-sm hover:shadow-lg border border-tan/20 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-xl bg-tan/20 text-brown group-hover:bg-brown group-hover:text-white transition-colors duration-300">
                        {link.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brown transition-colors">{link.name}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{link.description}</p>
                      </div>
                      <div className="text-tan group-hover:text-brown transition-colors self-center">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Section liens rapides pour le SEO (conservée mais stylisée plus discrètement) */}
          <div className="mt-16 text-center opacity-80">
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Accès Rapide</p>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <Link to="/articles" className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors">
                📰 Dernières actualités
              </Link>
              <Link to="/events" className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors">
                🎉 Événements à venir
              </Link>
              <Link to="/gallery" className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors">
                📸 Photos de nos sorties
              </Link>
              <Link to="/partners" className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors">
                🤝 Nos partenaires
              </Link>
              <Link to="/monsieur-ours" className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors">
                🐻 Monsieur Ours
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section - Updated to only have "Become a Member" button */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-brown via-brown-dark to-black text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-orange/20 blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-tan/10 blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 max-w-4xl mx-auto leading-tight tracking-tight">
              Rejoignez notre communauté et <span className="text-orange">devenez membre</span> de Loom !
            </h2>
            <p className="text-tan/80 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              En devenant membre, vous soutenez nos initiatives et participez à la construction d'un espace inclusif et accueillant pour tous !
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.open(MEMBERSHIP_URL, '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center justify-center bg-gradient-to-r from-orange to-orange-dark hover:from-orange-light hover:to-orange text-white py-4 px-10 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Nous rejoindre !
              <ArrowRight className="ml-2 h-5 w-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>      <Footer />
    </div>
  );
};

export default Index;
