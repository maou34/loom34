import { useState } from 'react';
import { db } from '@/db/client';
import { useQuery } from '@tanstack/react-query';
import { Search, ImageIcon, Camera, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tables } from '@/db/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useSEO from '@/hooks/useSEO';

type GalleryAlbum = Tables<'gallery_albums'>;

const Gallery = () => {
  // SEO Configuration
  useSEO({
    title: 'Galerie Photos - LOOM | Souvenirs et moments de notre communauté Bear',
    description: 'Découvrez la galerie photos de LOOM - Les Ours Occitanie Méditerranée. Revivez nos événements, soirées et moments de convivialité en images.',
    keywords: ['LOOM photos', 'galerie Bears', 'événements photos', 'souvenirs LOOM', 'communauté Bear', 'Montpellier'],
    type: 'website'
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch albums
  const { data: albums = [], isLoading: isLoadingAlbums, error: albumsError } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const { data, error } = await db
        .from('gallery_albums')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  // Fetch images (needed for covers)
  const { data: images = [], isLoading: isLoadingImages, error: imagesError } = useQuery({
    queryKey: ['images'],
    queryFn: async () => {
      const { data, error } = await db
        .from('gallery_images')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const isLoading = isLoadingAlbums || isLoadingImages;
  const error = albumsError || imagesError;

  // Filter albums based on search
  const filteredAlbums = albums.filter(album => {
    const matchesSearch = searchQuery === '' || 
      album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (album.description && album.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[400px] w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-red-500 mb-4">Une erreur est survenue lors du chargement de la galerie</p>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-orange/20 to-brown/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/20 to-gray-50" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-brown-dark mb-6 shadow-sm">
              <Camera className="w-5 h-5 mr-2" />
              <span className="font-medium">Souvenirs & Moments</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 tracking-tight">
              Galerie <span className="text-orange">Communautaire</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Explorez les archives photographiques des Ours ! Retrouvez les meilleurs moments de nos événements passés.
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Search Section */}
      <div className="container mx-auto px-4 -mt-8 relative z-20 mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-xl p-2 flex items-center border border-gray-100">
            <div className="pl-4 text-gray-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Rechercher un album, un événement..."
              className="w-full h-12 px-4 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>
      </div>
      
      {/* Albums Grid */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {filteredAlbums.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-orange/10 flex items-center justify-center">
                <ImageIcon size={32} className="text-orange" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun album trouvé</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchQuery ? 
                  `Aucun résultat pour "${searchQuery}". Essayez d'autres termes.` : 
                  "La galerie est vide pour le moment."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAlbums.map((album, index) => {
                const albumImages = images.filter(img => img.album_id === album.id);
                let cover = album.cover_image;
                if (!cover && albumImages.length > 0) {
                  cover = albumImages[albumImages.length - 1].image_url;
                }
                
                // Image d'un petit ours mignon par défaut
                const CUTE_BEAR_IMAGE = 'https://www.shutterstock.com/image-vector/bears-face-symbol-logo-design-600nw-2162265087.jpg';

                // Fallback image
                if (!cover) {
                  cover = CUTE_BEAR_IMAGE;
                }

                return (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="group"
                  >
                    <Link to={`/gallery/${album.id}`} className="block h-full">
                      <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full border border-gray-100 flex flex-col">
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                          <img
                            src={cover}
                            alt={album.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = CUTE_BEAR_IMAGE;
                              e.currentTarget.onerror = null;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                          
                          <div className="absolute bottom-4 left-4 right-4 text-white">
                            <div className="inline-flex items-center px-2 py-1 rounded-md bg-black/30 backdrop-blur-sm text-xs font-medium mb-2 border border-white/10">
                              <ImageIcon className="w-3 h-3 mr-1" />
                              {albumImages.length} photos
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="text-sm text-orange font-medium mb-2">
                            {format(new Date(album.date), 'd MMMM yyyy', { locale: fr })}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange transition-colors line-clamp-1">
                            {album.title}
                          </h3>
                          <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                            {album.description || "Aucune description disponible."}
                          </p>
                          
                          <div className="flex items-center text-brown font-medium text-sm group-hover:translate-x-2 transition-transform">
                            Voir l'album <ArrowRight className="w-4 h-4 ml-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-20 bg-brown relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-50" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <Camera className="w-16 h-16 text-orange mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Vous avez des photos à partager ?</h2>
            <p className="text-white/80 text-lg mb-10 leading-relaxed">
              Si vous avez capturé des moments spéciaux lors de nos événements, nous serions ravis de les voir !
              Partagez vos photos avec nous pour qu'elles apparaissent dans notre galerie communautaire.
            </p>
            <Button 
              asChild
              className="bg-orange hover:bg-orange-dark text-white h-14 px-8 rounded-full text-lg shadow-xl shadow-black/20"
            >
              <a href="mailto:contactloom34@gmail.com">
                Envoyer vos photos
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Gallery;
