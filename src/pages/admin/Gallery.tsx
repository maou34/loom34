import { useState, useEffect, useRef } from "react";
import { uploadAuthHeaders } from "@/lib/uploadAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Image as ImageIcon,
  Folder,
  FolderOpen,
  MoreVertical,
  Trash2,
  Search,
  Upload,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/db/client";
import AlbumInfoDialog from "@/components/admin/gallery/AlbumInfoDialog";
import { Info } from "lucide-react";

import { UPLOAD_URL, getImageUrl } from "@/config";

// Types based on filesystem API
type GalleryAlbum = {
  id: string;
  title: string;
  cover_image: string | null;
};

type GalleryImage = {
  id: string;
  image_url: string;
  title: string;
  album_id: string;
};

function baseUploadUrl() {
  // évite les doubles slashes
  return UPLOAD_URL.replace(/\/+$/, "");
}

/**
 * IMPORTANT: toujours utiliser /upload/ (slash final),
 * sinon Cloudflare redirige /upload -> /upload/ (301) et ça casse CORS sur POST.
 */
function uploadEndpoint(pathname: string) {
  const base = baseUploadUrl();
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${p}`;
}

// Albums à masquer dans la sidebar
const HIDDEN_ALBUM_IDS = new Set(["images", "unclassified"]);
const HIDDEN_ALBUM_PREFIXES = ["tip"]; // masquera tip*, tip-2025, tipTest, etc.

function isHiddenAlbumId(id: string) {
  if (HIDDEN_ALBUM_IDS.has(id)) return true;
  return HIDDEN_ALBUM_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // State for dialogs
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAlbumInfoOpen, setIsAlbumInfoOpen] = useState(false);
  const [isImageDetailsOpen, setIsImageDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Selection state
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [viewUnclassified, setViewUnclassified] = useState(false);

  // NEW: album réellement ciblé par la suppression (évite les soucis de state)
  const [albumToDelete, setAlbumToDelete] = useState<GalleryAlbum | null>(null);

  // Form state
  const [albumForm, setAlbumForm] = useState({ title: "" });

  // Upload state
  const [isDropping, setIsDropping] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // --- Queries ---

  const { data: albums = [], isLoading: isLoadingAlbums } = useQuery<GalleryAlbum[]>({
    queryKey: ["galleryAlbums"],
    queryFn: async () => {
      const res = await fetch(uploadEndpoint("/upload/albums"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch albums");
      return res.json();
    },
  });

  const visibleAlbums = albums.filter((a) => !isHiddenAlbumId(a.id));

  const { data: images = [] } = useQuery<GalleryImage[]>({
    queryKey: ["galleryImages", selectedAlbum?.id, viewUnclassified],
    queryFn: async () => {
      const albumId = viewUnclassified ? "unclassified" : selectedAlbum?.id;
      if (!albumId) return [];
      const res = await fetch(uploadEndpoint(`/upload/albums/${albumId}/images`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch images");
      return res.json();
    },
    enabled: !!selectedAlbum || viewUnclassified,
  });

  // Sync URL with state
  useEffect(() => {
    const albumId = searchParams.get("albumId");
    const unclassified = searchParams.get("view") === "unclassified";

    if (unclassified) {
      setViewUnclassified(true);
      setSelectedAlbum(null);
    } else if (albumId && visibleAlbums.length > 0) {
      const album = visibleAlbums.find((a) => a.id === albumId);
      if (album) {
        setSelectedAlbum(album);
        setViewUnclassified(false);
      }
    } else if (!albumId && !unclassified && visibleAlbums.length > 0) {
      // Default to first album if nothing selected
      setSelectedAlbum(visibleAlbums[0]);
      setViewUnclassified(false);
    }
  }, [searchParams, visibleAlbums]);

  // Filter images based on search
  const filteredImages = images.filter((img) =>
    (img.title?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // --- Mutations ---

  const createAlbumMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(uploadEndpoint("/upload/albums"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await uploadAuthHeaders()) },
        body: JSON.stringify({ title }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create album");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryAlbums"] });
      setIsCreateAlbumOpen(false);
      setAlbumForm({ title: "" });
      toast({ title: "Album créé avec succès" });
    },
    onError: (err: any) =>
      toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(uploadEndpoint(`/upload/albums/${id}`), {
        method: "DELETE",
        headers: await uploadAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to delete album (${res.status})`);
      }
      // Fiche de l'album (date, couverture, soirée liée) : supprimée avec le dossier
      await db.from("photo_albums").delete().eq("album_id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryAlbums"] });
      queryClient.invalidateQueries({ queryKey: ["galleryImages"] });

      setIsDeleteDialogOpen(false);

      // si on supprimait l'album en cours, on reset la sélection
      if (selectedAlbum && albumToDelete && selectedAlbum.id === albumToDelete.id) {
        setSelectedAlbum(null);
        setSearchParams({});
      }

      setAlbumToDelete(null);
      toast({ title: "Album supprimé" });
    },
    onError: (err: any) =>
      toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (image: GalleryImage) => {
      const res = await fetch(uploadEndpoint("/upload/images"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(await uploadAuthHeaders()) },
        body: JSON.stringify({ albumId: image.album_id, filename: image.id }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete image");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryImages"] });
      setIsImageDetailsOpen(false);
      toast({ title: "Image supprimée" });
    },
    onError: (err: any) =>
      toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  // --- Handlers ---

  const handleAlbumSelect = (album: GalleryAlbum) => {
    setSelectedAlbum(album);
    setViewUnclassified(false);
    setSearchParams({ albumId: album.id });
  };

  const handleUnclassifiedSelect = () => {
    setViewUnclassified(true);
    setSelectedAlbum(null);
    setSearchParams({ view: "unclassified" });
  };

  const handleDropFiles = async (files: FileList) => {
    setIsDropping(true);
    setUploadFeedback("Import en cours...");
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => {
        if (file.type?.startsWith("image/")) form.append("files", file);
      });

      const albumId = selectedAlbum?.id || "unclassified";

      // FIX CORS: slash final AVANT le ?
      const url = uploadEndpoint(`/upload/?albumId=${encodeURIComponent(albumId)}`);

      const res = await fetch(url, {
        method: "POST",
        headers: await uploadAuthHeaders(),
        body: form,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Upload échoué (${res.status})`);

      setUploadFeedback("Import terminé !");
      queryClient.invalidateQueries({ queryKey: ["galleryImages"] });

      setTimeout(() => {
        setUploadFeedback(null);
        setIsUploadOpen(false);
      }, 1500);
    } catch (e: any) {
      console.error("Erreur upload", e);
      setUploadFeedback(`Erreur: ${e.message}`);
    } finally {
      setIsDropping(false);
    }
  };

  const openImageDetails = (img: GalleryImage) => {
    setSelectedImage(img);
    setIsImageDetailsOpen(true);
  };

  const handleCopyImageLink = async (img: GalleryImage) => {
    try {
      await navigator.clipboard.writeText(getImageUrl(img.image_url));
      toast({ title: "Lien copié dans le presse-papiers" });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="Galerie">
      <div className="flex h-[calc(100vh-120px)] -m-6">
        {/* Sidebar */}
        <div className="w-100 border-r bg-gray-50/50 flex flex-col">
          <div className="p-4">
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setAlbumForm({ title: "" });
                setIsCreateAlbumOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Nouvel Album
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 pb-4">
              <Button
                variant={viewUnclassified ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start font-normal",
                  viewUnclassified && "bg-white shadow-sm"
                )}
                onClick={handleUnclassifiedSelect}
              >
                <FolderOpen className="w-4 h-4 mr-2 text-orange-500" />
                Non classées
              </Button>

              <Separator className="my-2" />

              {isLoadingAlbums ? (
                <div className="space-y-2 px-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                visibleAlbums.map((album) => (
                  <div key={album.id} className="group flex items-center relative">
                    <Button
                      variant={selectedAlbum?.id === album.id ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start font-normal pr-8",
                        selectedAlbum?.id === album.id && "bg-white shadow-sm"
                      )}
                      onClick={() => handleAlbumSelect(album)}
                    >
                      <Folder
                        className={cn(
                          "w-4 h-4 mr-2",
                          selectedAlbum?.id === album.id ? "text-orange-600" : "text-gray-400"
                        )}
                      />
                      <span className="truncate">{album.title}</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-6 w-6 p-0 absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setAlbumToDelete(album);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Toolbar */}
          <div className="h-16 border-b flex items-center justify-between px-6 bg-white">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {viewUnclassified ? "Photos non classées" : selectedAlbum?.title || "Galerie"}
              </h2>
              <Badge variant="outline" className="text-gray-500">
                {filteredImages.length} photos
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-10 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {selectedAlbum && !viewUnclassified && (
                <Button onClick={() => setIsAlbumInfoOpen(true)} variant="outline" className="h-9">
                  <Info className="w-4 h-4 mr-2" /> Infos de l'album
                </Button>
              )}
              <Button onClick={() => setIsUploadOpen(true)} variant="outline" className="h-9">
                <Upload className="w-4 h-4 mr-2" /> Importer
              </Button>
            </div>
          </div>

          {/* Grid */}
          <ScrollArea className="flex-1 p-6">
            {filteredImages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune photo</h3>
                <p className="text-sm text-gray-500 mb-6">Cet album est vide pour le moment.</p>
                <Button onClick={() => setIsUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" /> Ajouter des photos
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => openImageDetails(img)}
                  >
                    <img
                      src={getImageUrl(img.image_url)}
                      alt={img.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-medium truncate">{img.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {selectedAlbum && (
        <AlbumInfoDialog open={isAlbumInfoOpen} onOpenChange={setIsAlbumInfoOpen} albumId={selectedAlbum.id} images={images} />
      )}

      {/* Create Album Dialog */}
      <Dialog open={isCreateAlbumOpen} onOpenChange={setIsCreateAlbumOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouvel album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de l'album</Label>
              <Input
                value={albumForm.title}
                onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                placeholder="Ex: Soirée Halloween 2024"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAlbumOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => createAlbumMutation.mutate(albumForm.title)}
              disabled={!albumForm.title.trim()}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Album Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'album ?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            L'album <strong>{albumToDelete?.title}</strong> sera supprimé. Les photos seront
            définitivement effacées.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setAlbumToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => albumToDelete && deleteAlbumMutation.mutate(albumToDelete.id)}
              disabled={!albumToDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importer des photos</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                isDropping
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 hover:border-orange-400 hover:bg-gray-50",
                uploadFeedback && "border-green-500 bg-green-50"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDropping(true);
              }}
              onDragLeave={() => setIsDropping(false)}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleDropFiles(e.dataTransfer.files);
              }}
            >
              {uploadFeedback ? (
                <div className="flex flex-col items-center text-green-600">
                  <CheckCircle2 className="w-10 h-10 mb-2" />
                  <p className="font-medium">{uploadFeedback}</p>
                </div>
              ) : isDropping ? (
                <div className="flex flex-col items-center text-orange-600">
                  <Upload className="w-10 h-10 mb-2 animate-bounce" />
                  <p className="font-medium">Relâchez pour importer</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <Upload className="w-10 h-10 mb-2" />
                  <p className="font-medium text-gray-900">Glissez vos images ici</p>
                  <p className="text-sm mt-1 mb-4">
                    Destination : {selectedAlbum?.title || "Non classées"}
                  </p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Parcourir les fichiers
                  </Button>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleDropFiles(e.target.files);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Details Dialog */}
      <Dialog open={isImageDetailsOpen} onOpenChange={setIsImageDetailsOpen}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden flex flex-col md:flex-row h-[600px] md:h-[500px]">
          <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
            {selectedImage && (
              <img
                src={getImageUrl(selectedImage.image_url)}
                alt={selectedImage.title}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          <div className="w-full md:w-80 bg-white p-6 flex flex-col border-l">
            <DialogHeader className="mb-4">
              <DialogTitle>Détails de l'image</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <Label>Nom du fichier</Label>
                <div className="p-2 bg-gray-100 rounded text-sm break-all">
                  {selectedImage?.title}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-auto space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => selectedImage && handleCopyImageLink(selectedImage)}
              >
                <Copy className="w-4 h-4 mr-2" /> Copier le lien de l'image
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (confirm("Supprimer cette image ?")) {
                    selectedImage && deleteImageMutation.mutate(selectedImage);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer l'image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}