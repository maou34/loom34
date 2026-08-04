import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Crown, Calendar, Trophy, Expand } from "lucide-react";
import useSEO from '@/hooks/useSEO';
import { motion } from "framer-motion";
import { db } from "@/db/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_HERO_IMAGE = "/gallery/images/election_2025_vainqueurs.jpg";

const MonsieurOurs = () => {
  // SEO Configuration
  useSEO({
    title: 'Monsieur Ours - LOOM | Concours et représentants de notre communauté',
    description: 'Découvrez les Monsieur Ours élus de LOOM depuis 2018. Histoire du concours, galerie des lauréats et informations sur ce titre emblématique de notre communauté Bear.',
    keywords: ['Monsieur Ours', 'LOOM concours', 'représentant Bear', 'lauréats', 'communauté Bear', 'élection', 'titre'],
    type: 'website'
  });

  const MEMBERSHIP_URL = "https://www.helloasso.com/associations/les-ours-occitanie-montpellier/adhesions/adhesion-2025-2026";

  const { data: siteSettings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: timelineItems = [], isLoading: timelineLoading } = useQuery({
    queryKey: ['monsieurOursTimeline'],
    queryFn: async () => {
      const { data, error } = await db
        .from('monsieur_ours_timeline')
        .select('*')
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const heroImage = siteSettings?.monsieur_ours_hero_image || DEFAULT_HERO_IMAGE;

  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string } | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative h-[70vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Monsieur Ours Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-gray-50" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white mb-8">
              <Crown className="w-5 h-5 mr-2 text-yellow-400" />
              <span className="font-medium tracking-wide">Élection Annuelle</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Monsieur <span className="text-orange">Ours</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed">
              Chaque année en juin, la communauté élit son représentant lors de la Monpell' Bears. Découvrez l'histoire et les visages de nos ambassadeurs.
            </p>

            <Button 
              size="lg" 
              className="bg-orange hover:bg-orange-dark text-white rounded-full px-8 h-14 text-lg shadow-lg shadow-orange/20"
              onClick={() => document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Découvrir les lauréats
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Timeline Section */}
      <section id="timeline" className="py-24 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] bg-orange/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-brown/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Le Hall of Fame</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Ils ont porté l'écharpe et représenté notre association avec fierté.
            </p>
          </motion.div>

          <div className="relative max-w-5xl mx-auto">
            {/* Central Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-orange/20 via-orange/50 to-orange/20 hidden md:block" />

            <div className="space-y-12 md:space-y-24">
              {timelineLoading ? (
                <div className="space-y-8">
                  <Skeleton className="h-64 w-full max-w-lg mx-auto rounded-2xl" />
                  <Skeleton className="h-64 w-full max-w-lg mx-auto rounded-2xl" />
                </div>
              ) : (
                timelineItems.map((item, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className={`flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''} gap-8 md:gap-0`}
                    >
                      {/* Content Card */}
                      <div className="w-full md:w-1/2 px-4 md:px-12">
                        <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy className="w-24 h-24 text-orange" />
                          </div>

                          <span className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-orange/10 text-orange font-bold text-lg mb-4">
                            <Calendar className="w-4 h-4 mr-2" />
                            {item.year}
                          </span>

                          <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {item.description}
                          </p>

                          {item.image && (
                            <button
                              type="button"
                              onClick={() => setExpandedImage({ url: item.image!, alt: item.title })}
                              className="group/image relative block w-full overflow-hidden rounded-xl border border-gray-100"
                            >
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full aspect-video object-cover transition-transform duration-500 group-hover/image:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/30 transition-colors flex items-center justify-center">
                                <Expand className="w-6 h-6 text-white opacity-0 group-hover/image:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Center Dot */}
                      <div className="relative flex items-center justify-center w-12 h-12 z-20">
                        <div className="w-4 h-4 bg-orange rounded-full ring-4 ring-white shadow-md" />
                        <div className="absolute w-12 h-12 bg-orange/20 rounded-full animate-pulse" />
                      </div>

                      {/* Empty space for the other side */}
                      <div className="w-full md:w-1/2 hidden md:block" />
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-brown relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-50" />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <Heart className="w-16 h-16 text-orange mx-auto mb-8" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Rejoignez la communauté</h2>
            <p className="text-white/80 text-xl mb-10 leading-relaxed">
              Devenez membre de notre communauté et participez à nos événements, ateliers et activités. Ensemble, nous faisons la différence !
            </p>
            <Button
              onClick={() => window.open(MEMBERSHIP_URL, '_blank', 'noopener,noreferrer')}
              className="bg-orange hover:bg-orange-dark text-white h-14 px-10 rounded-full text-lg font-semibold shadow-xl shadow-black/20 transition-transform hover:scale-105"
            >
              Devenir membre
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Lightbox */}
      <Dialog open={!!expandedImage} onOpenChange={(open) => !open && setExpandedImage(null)}>
        <DialogContent className="max-w-4xl bg-black border-none shadow-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">{expandedImage?.alt}</DialogTitle>
          {expandedImage && (
            <img
              src={expandedImage.url}
              alt={expandedImage.alt}
              className="w-full max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default MonsieurOurs;
