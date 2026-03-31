import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, ExternalLink, Handshake, Building2, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import useSEO from '@/hooks/useSEO';
import { db } from '@/db/client';
import { Tables } from '@/db/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const Partners = () => {
  // SEO Configuration
  useSEO({
    title: 'Nos Partenaires - LOOM | Commerces et établissements partenaires',
    description: 'Découvrez les partenaires de LOOM - Les Ours Occitanie Montpellier. Bars, restaurants, saunas et commerces qui soutiennent notre communauté Bear avec des avantages exclusifs.',
    keywords: ['LOOM partenaires', 'commerces gay-friendly', 'bars Bears', 'restaurants Montpellier', 'saunas gay', 'avantages membres'],
    type: 'website'
  });

  const [partners, setPartners] = useState<Tables<'partners'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      setLoading(true);
      const { data, error } = await db.from('partners').select('*');
      if (!error && data) setPartners(data);
      setLoading(false);
    };
    fetchPartners();
  }, []);

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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop" 
            alt="Partners background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-gray-50" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <Handshake className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-100">Ensemble, plus forts</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Nos Partenaires
            </h1>
            <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
              Découvrez les établissements et organisations qui soutiennent la communauté LOOM et offrent des avantages exclusifs à nos membres.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Partners Grid Section */}
      <section className="py-16 -mt-20 relative z-20">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[300px] w-full rounded-2xl" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Aucun partenaire pour le moment</h3>
              <p className="text-gray-500 mt-2">Revenez bientôt pour découvrir nos nouveaux partenaires !</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {partners.map((partner) => (
                <motion.div 
                  key={partner.id} 
                  variants={itemVariants}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full"
                >
                  <div className="relative h-48 bg-gray-50 p-8 flex items-center justify-center overflow-hidden group-hover:bg-orange-50/30 transition-colors">
                    {partner.logo ? (
                      <img 
                        src={partner.logo} 
                        alt={`${partner.name} logo`} 
                        className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Building2 className="w-16 h-16 text-gray-300" />
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm shadow-sm text-orange-600 border-orange-100">
                        {partner.type}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                      {partner.name}
                    </h3>
                    
                    <p className="text-gray-600 mb-6 flex-1 leading-relaxed">
                      {partner.description}
                    </p>
                    
                    <div className="pt-6 border-t border-gray-100 mt-auto flex items-center justify-between">
                      {partner.website ? (
                        <Button 
                          variant="ghost" 
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 -ml-4 group/btn"
                          asChild
                        >
                          <a href={partner.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="w-4 h-4 mr-2" />
                            Visiter le site
                            <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Site web non disponible</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Devenir Partenaire</h2>
              <p className="text-lg text-orange-100 mb-8">
                Vous souhaitez soutenir la communauté LOOM et gagner en visibilité auprès de nos membres ?
                Rejoignez notre réseau de partenaires !
              </p>
              <Button 
                size="lg" 
                variant="secondary" 
                className="bg-white text-orange-600 hover:bg-gray-100 font-bold text-lg px-8 h-14 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                asChild
              >
                <a href="mailto:contact@loom34.fr">
                  Nous contacter <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;
