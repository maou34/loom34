import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, CalendarDays, ImageIcon, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PhotoAlbum from 'react-photo-album';
import "react-photo-album/rows.css";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import useSEO from '@/hooks/useSEO';

import { UPLOAD_URL, getImageUrl } from '@/config';

const AlbumDetail = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  // Fetch album
  const { data: album, isLoading: isLoadingAlbum } = useQuery({
    queryKey: ['galleryAlbum', albumId],
    queryFn: async () => {
      const res = await fetch(`${UPLOAD_URL}/upload/albums`);
      if (!res.ok) throw new Error('Failed to fetch albums');
      const albums = await res.json();
      const found = albums.find((a: any) => a.id === albumId);
      if (!found) throw new Error('Album not found');
      return found;
    },
    enabled: !!albumId
  });

  // Fetch images
  const { data: images = [], isLoading: isLoadingImages } = useQuery({
    queryKey: ['galleryImages', albumId],
    queryFn: async () => {
      const res = await fetch(`${UPLOAD_URL}/upload/albums/${albumId}/images`);
      if (!res.ok) throw new Error('Failed to fetch images');
      return res.json();
    },
    enabled: !!albumId
  });

  // SEO
  useSEO({
    title: album ? `${album.title} - Galerie LOOM` : 'Album - LOOM',
    description: album?.description || 'Album photo de la communauté LOOM',
    image: album?.cover_image ? getImageUrl(album.cover_image) : undefined,
    type: 'article'
  });

  if (isLoadingAlbum || isLoadingImages) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-32">
           <Skeleton className="h-[400px] w-full rounded-2xl mb-8" />
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {[...Array(8)].map((_, i) => (
               <Skeleton key={i} className="h-48 w-full rounded-lg" />
             ))}
           </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!album) {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Navbar />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Album introuvable</h2>
                    <Button onClick={() => navigate('/gallery')}>Retour à la galerie</Button>
                </div>
            </div>
            <Footer />
        </div>
    );
  }

  // Determine cover image
  let coverImage = album.cover_image ? getImageUrl(album.cover_image) : null;
  if (!coverImage && images.length > 0) {
    coverImage = getImageUrl(images[0].image_url);
  }
  const CUTE_BEAR_IMAGE = 'https://images.unsplash.com/photo-1585672913188-927d727d65b8?q=80&w=800&auto=format&fit=crop';
  if (!coverImage) {
    coverImage = CUTE_BEAR_IMAGE;
  }

  // Transform images for React Photo Album
  const photos = images.map((image, index) => ({
    src: getImageUrl(image.image_url),
    width: 800, // Idealement, stocker width/height en DB
    height: 600,
    alt: image.title || `Photo ${index + 1}`,
    key: image.id,
    title: image.title,
    description: image.description,
    originalImage: image
  }));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[500px] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={coverImage} 
            alt={album.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
                e.currentTarget.src = CUTE_BEAR_IMAGE;
            }}
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
              onClick={() => navigate('/gallery')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la galerie
            </Button>
            
            <div className="flex items-center gap-3 text-orange-300 mb-4 font-medium">
                <CalendarDays className="w-5 h-5" />
                <span>{format(new Date(album.date), 'd MMMM yyyy', { locale: fr })}</span>
                <span className="text-white/50">•</span>
                <ImageIcon className="w-5 h-5" />
                <span>{images.length} photos</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight max-w-4xl">
              {album.title}
            </h1>
            
            {album.description && (
                <p className="text-lg text-gray-200 max-w-2xl leading-relaxed">
                    {album.description}
                </p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 -mt-10 relative z-20">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 min-h-[400px]"
        >
            {photos.length > 0 ? (
                <PhotoAlbum
                    layout="rows"
                    photos={photos}
                    targetRowHeight={250}
                    onClick={({ photo }) => setSelectedImage(photo.originalImage)}
                    renderPhoto={({ photo, wrapperStyle, renderDefaultPhoto }) => (
                        <motion.div 
                            style={wrapperStyle}
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                            className="cursor-pointer overflow-hidden rounded-lg"
                        >
                            {renderDefaultPhoto({ wrapped: true })}
                        </motion.div>
                    )}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                    <p>Cet album ne contient pas encore de photos.</p>
                </div>
            )}
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <div className="absolute top-4 right-4 z-10 flex gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                    e.stopPropagation();
                    // Download logic
                    const link = document.createElement('a');
                    link.href = selectedImage.image_url;
                    link.download = `loom-${selectedImage.id}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }}
                title="Télécharger"
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <div 
              className="max-w-7xl max-h-[90vh] w-full flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={selectedImage.image_url} 
                alt={selectedImage.title || 'Photo'} 
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              
              {(selectedImage.title || selectedImage.description) && (
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mt-6 bg-black/50 backdrop-blur-md text-white p-6 rounded-xl max-w-2xl text-center border border-white/10"
                >
                  {selectedImage.title && (
                    <h3 className="text-xl font-bold mb-2">{selectedImage.title}</h3>
                  )}
                  {selectedImage.description && (
                    <p className="text-gray-300">{selectedImage.description}</p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default AlbumDetail; 