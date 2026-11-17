import { useState, useMemo } from 'react';
import { db } from '@/db/client';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Search, Filter, X, Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tables } from '@/db/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import useSEO from '@/hooks/useSEO';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventCard from '@/components/EventCard';

const Events = () => {
  // SEO Configuration
  useSEO({
    title: 'Événements - LOOM | Calendrier des activités de la communauté Bear',
    description: 'Découvrez tous les événements de LOOM - Les Ours Occitanie Montpellier. Soirées, activités, rencontres et moments de convivialité de notre communauté Bear.',
    keywords: ['LOOM événements', 'activités Bears', 'soirées Bear', 'Montpellier', 'calendrier LGBTQ+', 'rencontres Bears'],
    type: 'website'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hideExpired, setHideExpired] = useState(true);

  // Fetch events from database
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('published', true)
        .order('date', { ascending: true });
      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }
      return data as Tables<'events'>[];
    }
  });

  // Get unique locations from events
  const locations = useMemo(() => {
    const locs = Array.from(new Set(events.map(e => e.location).filter(Boolean)));
    return locs.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [events]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(event => {
      const matchesSearch = searchQuery === '' || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = locationFilter === 'all' || event.location === locationFilter;
      const notExpired = !hideExpired || new Date(event.date) >= new Date(new Date().setHours(0,0,0,0));
      return matchesSearch && matchesLocation && notExpired;
    });
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return filtered;
  }, [events, searchQuery, locationFilter, sortOrder, hideExpired]);

  const isFiltered = searchQuery !== '' || locationFilter !== 'all';

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
              <Calendar className="w-4 h-4" />
              Agenda
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
              Nos <span className="text-transparent bg-clip-text bg-gradient-to-r from-brown to-orange">Événements</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Découvrez tous nos événements à venir et passés. Rejoignez-nous pour des moments inoubliables !
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Search & Filters Bar - Floating Glass */}
      <section className="sticky top-20 z-30 py-4 pointer-events-none">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl p-4 max-w-5xl mx-auto pointer-events-auto"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher un événement..."
                  className="pl-10 bg-white/50 border-gray-200 focus:border-orange focus:ring-orange/20 transition-all duration-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center md:justify-end">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white/50 border-gray-200 focus:ring-orange/20 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <SelectValue placeholder="Lieu" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20 shadow-xl">
                    <SelectItem value="all" className="cursor-pointer hover:bg-orange/10 focus:bg-orange/10 focus:text-orange">Tous les lieux</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc} className="cursor-pointer hover:bg-orange/10 focus:bg-orange/10 focus:text-orange">{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={sortOrder === 'asc' ? 'default' : 'outline'}
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`transition-all duration-300 ${sortOrder === 'asc' ? 'bg-brown hover:bg-brown-light text-white' : 'bg-white/50 hover:bg-white/80'}`}
                >
                  Date {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
                
                <Button
                  variant={hideExpired ? 'default' : 'outline'}
                  onClick={() => setHideExpired(v => !v)}
                  className={`transition-all duration-300 ${hideExpired ? 'bg-orange hover:bg-orange-light text-white' : 'bg-white/50 hover:bg-white/80'}`}
                >
                  {hideExpired ? 'À venir' : 'Tous'}
                </Button>

                {isFiltered && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setSearchQuery('');
                      setLocationFilter('all');
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
      
      {/* Events Grid */}
      <section className="py-12 pb-24">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array(6).fill(0).map((_, index) => (
                <Skeleton key={index} className="h-[400px] rounded-xl" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarDays size={32} className="text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun événement trouvé</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {searchQuery ? 
                  `Aucun événement ne correspond à votre recherche "${searchQuery}".` : 
                  "Il n'y a pas encore d'événements à afficher."}
              </p>
              {(searchQuery || locationFilter !== 'all' || hideExpired) && (
                <Button 
                  variant="link" 
                  onClick={() => {
                    setSearchQuery('');
                    setLocationFilter('all');
                    setHideExpired(false);
                  }}
                  className="mt-4 text-orange hover:text-orange-dark"
                >
                  Réinitialiser tous les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={!isFiltered && index === 0 ? "md:col-span-2 lg:col-span-2" : ""}
                >
                  <EventCard
                    title={event.title}
                    description={event.description}
                    date={event.date}
                    time={event.time}
                    location={event.location}
                    image={event.image}
                    slug={event.slug}
                    registrationUrl={event.registration_url}
                    ticketing={event}
                    featured={!isFiltered && index === 0}
                    className="h-full"
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Events;
