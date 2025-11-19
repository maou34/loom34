import { useState, useEffect, memo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from '@/db/client';
import { Plus, ImageIcon, FolderOpen, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/db/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from "framer-motion";
// Upload supprimé: on utilise des chemins relatifs vers /public/gallery
import PhotoAlbum from 'react-photo-album';
import "react-photo-album/rows.css";

type GalleryAlbum = Tables<'gallery_albums'>;
type GalleryImage = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  album_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function Gallery() {
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  // Upload feedback state
  const [dropFeedback, setDropFeedback] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Ajout par chemin relatif
  const [newImagePath, setNewImagePath] = useState("");
  const [newImageTitle, setNewImageTitle] = useState("");

  // Upload server URL
  const UPLOAD_URL = (import.meta as any).env?.VITE_UPLOAD_URL || "";

  // Récupérer les paramètres depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const albumIdFromUrl = urlParams.get('albumId');
  const showUnclassified = urlParams.get('view') === 'unclassified';

  // Fetch albums from database
  const { data: albums = [], isLoading: isLoadingAlbums, refetch } = useQuery<GalleryAlbum[]>({
    queryKey: ['galleryAlbums'],
    queryFn: async () => {
      const { data, error } = await db
        .from('gallery_albums')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all images for sidebar counters
  const { data: allImages = [] } = useQuery<GalleryImage[]>({
    queryKey: ['galleryImages', 'all'],
    queryFn: async () => {
      const { data, error } = await db
        .from('gallery_images')
        .select('id, image_url, title, description, album_id, created_at, updated_at');
      if (error) throw error;
      return data || [];
    },
  });

  // Trouver l'album sélectionné à partir de l'URL
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);

  // Mettre à jour selectedAlbum quand les albums ou l'URL changent
  useEffect(() => {
    if (albumIdFromUrl && albums.length > 0) {
      const album = albums.find(album => album.id === albumIdFromUrl);
      setSelectedAlbum(album || null);
    } else {
      setSelectedAlbum(null);
    }
  }, [albums, albumIdFromUrl]);

  // Fetch images
  const { data: images = [], isLoading: isLoadingImages, error: imagesError } = useQuery<GalleryImage[]>({
    queryKey: ['galleryImages', selectedAlbum?.id, showUnclassified],
    queryFn: async () => {
      let query = db
        .from('gallery_images')
        .select('id, image_url, title, description, album_id, created_at, updated_at');

      // Afficher toutes les images si aucun album ni unclassified n'est sélectionné
      if (showUnclassified) {
        query = query.is('album_id', null);
      } else if (selectedAlbum) {
        query = query.eq('album_id', String(selectedAlbum.id));
      } // sinon, ne filtre pas : toutes les images

      const { data, error } = await query;
        
      if (error) {
        console.error('Error fetching images:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: true, // Toujours activer la requête
  });

  if (imagesError) {
    return (
      <AdminLayout title="Galerie">
        <div className="text-red-600 font-bold p-8">Erreur lors du chargement des images : {imagesError.message}</div>
      </AdminLayout>
    );
  }

  const createAlbumMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await db
        .from('gallery_albums')
        .insert({
          title,
          description: '',
          cover_image: '',
          date: new Date().toISOString()
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      setNewAlbumName("");
      setIsCreatingAlbum(false);
      toast({
        title: "Album créé",
        description: "L'album a été créé avec succès.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de l'album: " + error.message,
        variant: "destructive",
      });
    }
  });

  const updateAlbumMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; description?: string }) => {
      const { error } = await db
        .from('gallery_albums')
        .update({
          title: data.title,
          description: data.description
        })
        .eq('id', data.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      setNewAlbumName("");
      toast({
        title: "Album modifié",
        description: "L'album a été modifié avec succès.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de l'album: " + error.message,
        variant: "destructive",
      });
    }
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: async (albumId: string) => {
      // D'abord, mettre à jour toutes les images de l'album pour les mettre en non classées
      const { error: updateError } = await db
        .from('gallery_images')
        .update({ album_id: null })
        .eq('album_id', albumId);
        
      if (updateError) throw updateError;

      // Ensuite, supprimer l'album
      const { error: deleteError } = await db
        .from('gallery_albums')
        .delete()
        .eq('id', albumId);
        
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      setSelectedAlbum(null);
      toast({
        title: "Album supprimé",
        description: "L'album a été supprimé avec succès.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de l'album: " + error.message,
        variant: "destructive",
      });
    }
  });

  const updateImageMutation = useMutation({
    mutationFn: async (data: { id: string; title?: string; description?: string; album_id?: string | null }) => {
      const { error } = await db
        .from('gallery_images')
        .update({
          title: data.title,
          description: data.description,
          album_id: data.album_id
        })
        .eq('id', data.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      queryClient.invalidateQueries({ queryKey: ['galleryAlbums'] });
      toast({
        title: "Photo modifiée",
        description: "La photo a été modifiée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de la photo: " + error.message,
        variant: "destructive",
      });
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await db
        .from('gallery_images')
        .delete()
        .eq('id', imageId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      queryClient.invalidateQueries({ queryKey: ['galleryAlbums'] });
      toast({
        title: "Photo supprimée",
        description: "La photo a été supprimée avec succès.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la photo: " + error.message,
        variant: "destructive",
      });
    }
  });

  const addImageByPathMutation = useMutation({
    mutationFn: async ({ path, albumId, title }: { path: string; albumId: string | null; title: string }) => {
      const normalized = path.startsWith('/') ? path : `/${path}`;
      const { error: insertError } = await db
        .from('gallery_images')
        .insert({
          image_url: normalized,
          album_id: albumId,
          title: title || normalized.split('/').pop() || 'Image',
          description: '',
          category: ''
        });
      if (insertError) throw insertError;
      if (albumId) {
        const { error: coverErr } = await db
          .from('gallery_albums')
          .update({ cover_image: normalized })
          .eq('id', albumId);
        if (coverErr) console.error('Erreur mise à jour couverture:', coverErr);
      }
    },
    onSuccess: () => {
      setNewImagePath("");
      setNewImageTitle("");
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      queryClient.invalidateQueries({ queryKey: ['galleryAlbums'] });
      toast({ title: 'Photo ajoutée', description: 'Enregistrement ajouté avec succès.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  const handleDropFiles = async (files: FileList) => {
    setIsDropping(true);
    setDropFeedback('Import en cours...');
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => {
        if (file.type?.startsWith('image/')) form.append('files', file);
      });
      const albumId = selectedAlbum?.id || '';
      const res = await fetch(`${UPLOAD_URL}/upload?albumId=${encodeURIComponent(albumId)}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload échoué (${res.status})`);
      }
      const json = await res.json().catch(() => ({ items: [] }));
      const items: Array<{ relativePath: string; filename: string }> = json.items || [];
      for (const it of items) {
        const title = (it.filename || '').replace(/\.[^.]+$/, '') || 'Image';
        await addImageByPathMutation.mutateAsync({ path: it.relativePath, albumId: selectedAlbum?.id || null, title });
      }
      setDropFeedback('Import terminé ✅');
      setTimeout(() => setDropFeedback(null), 3000);
    } catch (e: any) {
      console.error('Erreur upload', e);
      setDropFeedback(`Erreur: ${e.message || 'upload'}`);
    } finally {
      setIsDropping(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files || !e.dataTransfer.files.length) return;
    await handleDropFiles(e.dataTransfer.files);
  };

  const moveImageMutation = useMutation({
    mutationFn: async ({ imageId, newAlbumId }: { imageId: string, newAlbumId: string | null }) => {
      const { error } = await db
        .from('gallery_images')
        .update({ album_id: newAlbumId })
        .eq('id', imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      queryClient.invalidateQueries({ queryKey: ['galleryAlbums'] });
      toast({
        title: "Image déplacée",
        description: "Image déplacée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] }); // Rafraîchit seulement les images
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors du déplacement de l'image: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Upload supprimé: plus de drag & drop, utilisation d'un champ chemin.

  const handleImageDragStart = (e: React.DragEvent<HTMLDivElement>, image: GalleryImage) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: image.id,
      albumId: image.album_id
    }));
  };

  const handleAlbumClick = (album: GalleryAlbum) => {
    setSelectedAlbum(album);
    setSelectedImage(null);
    window.history.pushState({}, '', `?albumId=${album.id}`);
  };

  const handleUnclassifiedClick = () => {
    setSelectedAlbum(null);
    setSelectedImage(null);
    window.history.pushState({}, '', '?view=unclassified');
  };

  const GalleryImageCell = memo(({ columnIndex, rowIndex, style, data }: any) => {
    const { images, columns, handleImageDragStart, updateImageMutation, deleteImageMutation, setSelectedImage, setNewAlbumName, Dialog, DialogTrigger, Button, Edit, DialogContent, Label, Input, DialogClose, Trash2 } = data;
    const index = rowIndex * columns + columnIndex;
    if (index >= images.length) return null;
    const image = images[index];
    // Utilise uniquement image_url (pas de thumbnail_url)
    const imgSrc = image.image_url;
    return (
      <div style={style} className="relative group aspect-square cursor-move rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow" draggable onDragStart={(e) => handleImageDragStart(e, image)}>
        <img
          src={imgSrc}
          alt={image.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            console.error('Error loading image:', imgSrc);
            (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Image+non+disponible';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <div className="w-full">
            <p className="text-white text-sm font-medium truncate mb-2">{image.title}</p>
            <div className="flex justify-end gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-white bg-white/20 hover:bg-white/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(image);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <div className="space-y-4">
                    <Label>Nom de la photo</Label>
                    <Input
                      defaultValue={image.title}
                      onChange={(e) => {
                        setNewAlbumName(e.target.value);
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button variant="outline">Annuler</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          onClick={() => {
                            if (image.title.trim()) {
                              updateImageMutation.mutate({
                                id: image.id,
                                title: image.title,
                                description: image.description
                              });
                            }
                          }}
                        >
                          Enregistrer
                        </Button>
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-500/20 hover:bg-red-500/30 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) {
                    deleteImageMutation.mutate(image.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  });

  if (isLoadingAlbums) {
    return (
      <AdminLayout title="Galerie">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Galerie">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-72 border-r p-4 space-y-4 bg-gray-50">
          <Dialog open={isCreatingAlbum} onOpenChange={setIsCreatingAlbum}>
            <DialogTrigger asChild>
              <Button variant="brown" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel Album
              </Button>
            </DialogTrigger>
            <DialogContent>
              <div className="space-y-4">
                <Label>Nom de l'album</Label>
                <Input
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Entrez le nom de l'album"
                />
                <Button
                  variant="brown"
                  onClick={() => createAlbumMutation.mutate(newAlbumName)}
                  disabled={!newAlbumName.trim()}
                >
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-2">            <Button 
              variant={showUnclassified ? "default" : "ghost"}
              className="w-full justify-start relative hover:bg-gray-100 transition-colors"
              onClick={handleUnclassifiedClick}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Photos non classées
            </Button>

            {albums.map(album => {
              // Utilise allImages pour le compteur
              const imageCount = Array.isArray(allImages) ? allImages.filter(img => img.album_id === album.id).length : 0;
              return (
                <motion.div 
                  key={album.id} 
                  className="flex items-center gap-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >                  <Button 
                    variant={selectedAlbum?.id === album.id ? "default" : "ghost"}
                    className={`flex-1 justify-start group relative overflow-hidden ${selectedAlbum?.id === album.id ? "text-white" : ""}`}
                    onClick={() => handleAlbumClick(album)}
                  >
                    <div className="relative z-10 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      <span className="truncate block max-w-[110px]" title={album.title}>{album.title}</span>
                      <span className="ml-2 text-xs text-gray-500 bg-gray-200 rounded px-2 py-0.5">{imageCount}</span>
                    </div>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <div className="space-y-4">
                        <Label>Nom de l'album</Label>
                        <Input
                          defaultValue={album.title}
                          onChange={(e) => {
                            setNewAlbumName(e.target.value);
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <DialogClose asChild>
                            <Button variant="outline">Annuler</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button
                              onClick={() => {
                                if (newAlbumName.trim()) {
                                  updateAlbumMutation.mutate({
                                    id: album.id,
                                    title: newAlbumName,
                                    description: album.description
                                  });
                                }
                              }}
                            >
                              Enregistrer
                            </Button>
                          </DialogClose>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm("Êtes-vous sûr de vouloir supprimer cet album ? Les photos seront déplacées dans la section non classée.")) {
                        deleteAlbumMutation.mutate(album.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 bg-white overflow-hidden">
          <div className="rounded-lg border p-6 mb-6 bg-gray-50">
            <h3 className="text-lg font-medium mb-2">Ajouter des images</h3>
            <p className="text-sm text-gray-600 mb-4">
              Glissez simplement vos photos ici. Elles seront ajoutées à l'album sélectionné.
            </p>
            <div className="mb-4 space-y-2">
              <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-md p-6 text-center transition relative ${isDropping ? 'opacity-60' : 'hover:border-brown'} ${dropFeedback?.startsWith('Erreur') ? 'border-red-400' : 'border-gray-300'}`}
              >
                <p className="text-sm mb-1 font-medium">Glissez-déposez vos images depuis votre ordinateur</p>
                <p className="text-xs text-gray-500 mb-2">Cible: sous-dossier <code>{selectedAlbum?.id || 'unclassified'}</code>. Les images sont écrites côté serveur et ajoutées en base.</p>
                {dropFeedback && <p className="text-xs mt-2 text-gray-600">{dropFeedback}</p>}
              </div>
            </div>
            {/* Fallback avancé (optionnel): ajout par chemin direct */}
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer">Ajouter par chemin (option avancée)</summary>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder={`/gallery/${selectedAlbum ? String(selectedAlbum.id) : 'unclassified'}/mon-fichier.jpg`}
                  value={newImagePath}
                  onChange={(e) => setNewImagePath(e.target.value)}
                />
                <Input
                  placeholder="Titre (optionnel)"
                  value={newImageTitle}
                  onChange={(e) => setNewImageTitle(e.target.value)}
                />
                <Button
                  onClick={() => addImageByPathMutation.mutate({ path: newImagePath, albumId: selectedAlbum?.id || null, title: newImageTitle })}
                  disabled={!newImagePath.trim()}
                >
                  Ajouter
                </Button>
              </div>
            </details>
          </div>
          {Array.isArray(images) && images.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <style>{`
                .react-photo-album img {
                  cursor: pointer;
                  transition: all 0.2s ease;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .react-photo-album img:hover {
                  transform: scale(1.02);
                  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }
              `}</style>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedAlbum ? selectedAlbum.title : showUnclassified ? 'Photos non classées' : 'Toutes les photos'} 
                  <span className="text-sm text-gray-500 ml-2">({images.length} image{images.length > 1 ? 's' : ''})</span>
                </h3>
              </div>
                <PhotoAlbum
                layout="rows"
                photos={images.map((image, index) => ({
                  src: image.image_url,
                  width: 800,
                  height: 600,
                  alt: image.title || `Image ${index + 1}`,
                  key: image.id,
                  title: image.title,
                  description: image.description,
                  originalImage: image
                }))}
                targetRowHeight={250}
                spacing={10}
                onClick={({ photo }) => setSelectedImage(photo.originalImage)}
              />
              
              {/* Image controls modal */}
              {selectedImage && (
                <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                  <DialogContent className="max-w-md">
                    <div className="space-y-4">
                      <div className="text-center">
                        <img 
                          src={selectedImage.image_url} 
                          alt={selectedImage.title} 
                          className="max-w-full h-40 object-cover rounded-lg mx-auto mb-4"
                        />
                      </div>
                      <div>
                        <Label>Nom de la photo</Label>
                        <Input
                          defaultValue={selectedImage.title}
                          onChange={(e) => {
                            setNewAlbumName(e.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Déplacer vers l'album</Label>
                        <select
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brown focus:border-brown"
                          defaultValue={selectedImage.album_id || ''}
                          onChange={(e) => {
                            const newAlbumId = e.target.value || null;
                            moveImageMutation.mutate({
                              imageId: selectedImage.id,
                              newAlbumId: newAlbumId
                            });
                            toast({
                              title: "Image déplacée",
                              description: `Image déplacée vers ${newAlbumId ? albums.find(a => a.id === newAlbumId)?.title : 'Non classé'}`,
                            });
                          }}
                        >
                          <option value="">📁 Non classé</option>
                          {albums.map(album => (
                            <option key={album.id} value={album.id}>
                              📸 {album.title}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Album actuel : {selectedAlbum ? selectedAlbum.title : 'Non classé'}
                        </p>
                      </div>
                      <div className="flex justify-between gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) {
                              deleteImageMutation.mutate(selectedImage.id);
                              setSelectedImage(null);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setSelectedImage(null)}>
                            Fermer
                          </Button>
                          <Button
                            onClick={() => {
                              if (newAlbumName.trim()) {
                                updateImageMutation.mutate({
                                  id: selectedImage.id,
                                  title: newAlbumName,
                                  description: selectedImage.description || ''
                                });
                              }
                              setSelectedImage(null);
                            }}
                          >
                            Enregistrer le nom
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>                </Dialog>
              )}            </div>
          )}
          
          {Array.isArray(images) && images.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <div className="text-gray-400 mb-4">
                <ImageIcon className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  {selectedAlbum ? `Aucune image dans "${selectedAlbum.title}"` : 
                   showUnclassified ? 'Aucune photo non classée' : 
                   'Aucune image dans la galerie'}
                </h3>
                <p className="text-gray-500">
                  Ajoutez des fichiers dans /public/gallery puis utilisez le formulaire ci-dessus.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
