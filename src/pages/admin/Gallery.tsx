import { useState, useEffect, useRef } from "react";
import { uploadAuthHeaders } from "@/lib/uploadAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  Folder,
  FolderOpen,
  MoreHorizontal,
  Trash2,
  Search,
  Upload,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/db/client";
import { prepareImageForUpload } from "@/lib/prepareImage";
import AlbumInfoDialog from "@/components/admin/gallery/AlbumInfoDialog";
import { Info } from "lucide-react";

import { UPLOAD_URL, getImageUrl } from "@/config";

// Types based on filesystem API
type GalleryAlbum = {
  id: string;
  title: string;
  cover_image: string | null;
  image_count?: number;
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

/**
 * Nom de dossier d'un nouvel album : espaces en trop retirés (un espace final avait
 * créé un doublon invisible) et « / » ou « \ » remplacés, sinon le serveur ne
 * gardait que la fin du nom (« Soirée 21/11/2026 » devenait l'album « 2026 »).
 */
function cleanAlbumName(raw: string) {
  return raw.replace(/[\\/]+/g, "-").replace(/\s+/g, " ").trim();
}

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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
    } else {
      // Aucun album ouvert d'office : l'admin choisit (ou crée) l'album avant d'importer.
      // Album inconnu (supprimé, adresse ancienne) = rien de sélectionné, et l'import est
      // alors indisponible : jamais de photos envoyées dans un album par défaut à son insu.
      setSelectedAlbum(visibleAlbums.find((a) => a.id === albumId) ?? null);
      setViewUnclassified(false);
    }
  }, [searchParams, visibleAlbums]);

  /** Album où partira un import ; null = aucun choisi */
  const uploadTarget = viewUnclassified ? "unclassified" : selectedAlbum?.id ?? null;

  // Filter images based on search
  const filteredImages = images.filter((img) =>
    (img.title?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // --- Mutations ---

  const createAlbumMutation = useMutation({
    mutationFn: async (rawTitle: string): Promise<{ id: string; title: string }> => {
      const title = cleanAlbumName(rawTitle);
      if (!title) throw new Error("Le nom de l'album est vide.");
      if (albums.some((a) => a.id.trim().toLowerCase() === title.toLowerCase())) {
        throw new Error(`Un album « ${title} » existe déjà.`);
      }
      const res = await fetch(uploadEndpoint("/upload/albums"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await uploadAuthHeaders()) },
        body: JSON.stringify({ title }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ? `${body.error} (HTTP ${res.status})` : `Création impossible (HTTP ${res.status})`);
      }
      return res.json();
    },
    onSuccess: async (album) => {
      await queryClient.invalidateQueries({ queryKey: ["galleryAlbums"] });
      setIsCreateAlbumOpen(false);
      setAlbumForm({ title: "" });
      // On ouvre le nouvel album, prêt à recevoir les photos
      setSearchParams({ albumId: album.id });
      toast({ title: `Album « ${album.title} » créé`, description: "Vous pouvez maintenant y importer les photos." });
    },
    onError: (err: Error) =>
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
    onError: (err: Error) =>
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
      queryClient.invalidateQueries({ queryKey: ["galleryAlbums"] });
      setIsImageDetailsOpen(false);
      toast({ title: "Image supprimée" });
    },
    onError: (err: Error) =>
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
    if (!uploadTarget) {
      toast({ title: "Choisissez d'abord un album", description: "Les photos sont importées dans l'album affiché.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadFeedback(`Import de ${files.length} photo${files.length > 1 ? "s" : ""} en cours…`);
    try {
      // Photos préparées une par une (iPhone : envoi tronqué sinon, cf. lib/prepareImage.ts)
      const form = new FormData();
      for (const file of Array.from(files)) {
        if (file.type?.startsWith("image/") || /\.(heic|heif)$/i.test(file.name)) form.append("files", await prepareImageForUpload(file));
      }

      const albumId = uploadTarget;

      // FIX CORS: slash final AVANT le ?
      const url = uploadEndpoint(`/upload/?albumId=${encodeURIComponent(albumId)}`);

      const res = await fetch(url, {
        method: "POST",
        headers: await uploadAuthHeaders(),
        body: form,
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Upload échoué (HTTP ${res.status})`);
      }

      setUploadFeedback("Import terminé !");
      queryClient.invalidateQueries({ queryKey: ["galleryImages"] });
      queryClient.invalidateQueries({ queryKey: ["galleryAlbums"] });
      setTimeout(() => setUploadFeedback(null), 2500);
    } catch (e: unknown) {
      console.error("Erreur upload", e);
      setUploadFeedback(null);
      toast({ title: "Import échoué", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setIsUploading(false);
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

  const currentTitle = viewUnclassified ? "Non classées" : selectedAlbum?.title ?? "Aucun album choisi";
  const photoCount = (n: number) => `${n} photo${n > 1 ? "s" : ""}`;
  const unclassifiedCount = albums.find((a) => a.id === "unclassified")?.image_count ?? 0;
  const albumEntries = [
    { key: "unclassified", title: "Non classées", count: unclassifiedCount, active: viewUnclassified, select: handleUnclassifiedSelect, album: null as GalleryAlbum | null },
    ...visibleAlbums.map((album) => ({
      key: album.id,
      title: album.title,
      count: album.image_count ?? 0,
      active: !viewUnclassified && selectedAlbum?.id === album.id,
      select: () => handleAlbumSelect(album),
      album,
    })),
  ];
  const openCreateAlbum = () => {
    setAlbumForm({ title: "" });
    setIsCreateAlbumOpen(true);
  };

  return (
    <AdminLayout
      title="Galerie photos"
      actions={
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !uploadTarget}
          title={uploadTarget ? undefined : "Choisissez d'abord un album"}
        >
          <Upload className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Importer des photos</span>
        </Button>
      }
    >
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleDropFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Albums : colonne sur grand écran, liste déroulante sur mobile */}
        <aside aria-labelledby="h-albums" className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-6 lg:w-64 lg:flex-none">
          <h2 id="h-albums" className="text-xs font-bold uppercase tracking-[0.06em] text-loom-text-muted">
            Albums
          </h2>
          {isLoadingAlbums ? (
            <div className="flex gap-2 lg:flex-col">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-[10px]" />
              ))}
            </div>
          ) : (
            <>
            {/* Mobile : liste déroulante native + bouton de création toujours visible */}
            <div className="flex gap-2 lg:hidden">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Album affiché</span>
                <select
                  value={viewUnclassified ? "unclassified" : selectedAlbum?.id ?? ""}
                  onChange={(e) => {
                    const entry = albumEntries.find((a) => a.key === e.target.value);
                    entry?.select();
                  }}
                  className="h-11 w-full rounded-[10px] border border-loom-border-strong bg-loom-surface px-3 text-sm font-semibold text-loom-text"
                >
                  <option value="" disabled>
                    Choisir un album…
                  </option>
                  {albumEntries.map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {entry.title} ({entry.count})
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="outline" className="h-11 flex-none" onClick={openCreateAlbum}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="sr-only sm:not-sr-only">Nouvel album</span>
              </Button>
            </div>
            <ul id="albums-list" className="hidden lg:flex lg:max-h-[calc(100vh-220px)] lg:flex-col lg:gap-1 lg:overflow-y-auto">
              {albumEntries.map((entry) => (
                <li key={entry.key}>
                  <button
                    type="button"
                    aria-current={entry.active ? "page" : undefined}
                    onClick={entry.select}
                    className={cn(
                      "relative flex h-10 w-full items-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-left text-sm",
                      entry.active ? "bg-loom-chip-bg font-bold text-loom-chip-fg" : "hover:bg-loom-surface-2",
                    )}
                  >
                    {entry.active ? <FolderOpen aria-hidden="true" className="h-4 w-4 flex-none" /> : <Folder aria-hidden="true" className="h-4 w-4 flex-none text-loom-text-muted" />}
                    <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                    <span className="text-xs text-loom-text-muted">
                      {entry.count}
                      <span className="sr-only"> photos</span>
                    </span>
                  </button>
                </li>
              ))}
              <li className="mt-2">
                <Button variant="outline" className="h-10 w-full justify-start" onClick={openCreateAlbum}>
                  <Plus className="mr-2 h-4 w-4" /> Nouvel album
                </Button>
              </li>
            </ul>
            </>
          )}
        </aside>

        {/* Album sélectionné */}
        <section aria-labelledby="h-album" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Mobile : titre sur sa propre ligne (les boutons le tronquaient en « Soi… ») */}
            <div className="flex w-full min-w-0 items-baseline gap-2 sm:w-auto sm:flex-1">
              <h2 id="h-album" className="truncate text-xl font-bold">
                {currentTitle}
              </h2>
              {uploadTarget && <span className="flex-none text-sm text-loom-text-muted">{photoCount(images.length)}</span>}
            </div>
            {images.length > 8 && (
              <label className="relative w-full sm:w-56">
                <span className="sr-only">Rechercher une photo</span>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-loom-text-muted" />
                <Input type="search" placeholder="Rechercher…" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </label>
            )}
            {selectedAlbum && !viewUnclassified && (
              <div className="flex gap-2">
                <Button onClick={() => setIsAlbumInfoOpen(true)} variant="outline">
                  <Info className="mr-2 h-4 w-4" /> Infos de l'album
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-10 w-10 p-0" aria-label={`Actions pour l'album « ${selectedAlbum.title} »`}>
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => {
                        setAlbumToDelete(selectedAlbum);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'album
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {!uploadTarget ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-loom-border bg-loom-surface-2 px-4 py-12 text-center">
              <FolderOpen aria-hidden="true" className="h-8 w-8 text-loom-text-muted" />
              <p className="font-bold">Choisissez un album pour voir ses photos ou en importer</p>
              <p className="max-w-md text-sm text-loom-text-muted">
                <span className="lg:hidden">Utilisez la liste ci-dessus</span>
                <span className="hidden lg:inline">Cliquez sur un album dans la colonne de gauche</span>, ou créez-en un pour une nouvelle soirée.
              </p>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openCreateAlbum}>
                <Plus className="mr-2 h-4 w-4" /> Créer un album
              </Button>
            </div>
          ) : (
          /* Zone de dépôt (compacte quand l'album a des photos) */
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 text-center transition-colors",
              images.length === 0 ? "py-12" : "py-5",
              isDragOver ? "border-primary bg-loom-chip-bg" : "border-loom-border-strong bg-loom-surface-2",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files?.length) handleDropFiles(e.dataTransfer.files);
            }}
          >
            {uploadFeedback ? (
              <p role="status" className="flex items-center gap-2 font-semibold">
                {isUploading ? <Upload aria-hidden="true" className="h-5 w-5 animate-bounce" /> : <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-green-700" />}
                {uploadFeedback}
              </p>
            ) : (
              <>
                <Upload aria-hidden="true" className="h-7 w-7 text-loom-text-muted" />
                <span className="font-bold">
                  <span className="hidden sm:inline">Glissez vos photos ici</span>
                  <span className="sm:hidden">Ajouter des photos</span>
                </span>
                <span className="text-sm text-loom-text-muted">
                  <span className="hidden sm:inline">ou </span>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="font-semibold text-loom-accent-text underline">
                    parcourez vos fichiers
                  </button>{" "}
                  · JPG, PNG, WebP · dans « {currentTitle} »
                </span>
              </>
            )}
          </div>
          )}

          {filteredImages.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 xl:grid-cols-6">
              {filteredImages.map((img) => (
                <li key={img.id}>
                  <button
                    type="button"
                    onClick={() => openImageDetails(img)}
                    className="group relative block aspect-square w-full overflow-hidden rounded-lg border border-loom-border bg-loom-surface-2"
                  >
                    <img src={getImageUrl(img.image_url)} alt={img.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {images.length > 0 && filteredImages.length === 0 && <p className="text-sm text-loom-text-muted">Aucune photo ne correspond.</p>}

          <p className="text-xs text-loom-text-muted">
            Astuce : créez un album par soirée pour retrouver les photos facilement, puis reliez-le à l'événement dans « Infos de l'album ».
          </p>
        </section>
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
              <Label htmlFor="new-album-name">Nom de l'album</Label>
              <Input
                id="new-album-name"
                autoFocus
                value={albumForm.title}
                onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cleanAlbumName(albumForm.title) && !createAlbumMutation.isPending) createAlbumMutation.mutate(albumForm.title);
                }}
                placeholder="Ex : Aper'Ours au Coxx 5 décembre 2026"
              />
              <p className="text-xs text-loom-text-muted">Le nom de l'album sur le site ; mettez la date et le lieu pour s'y retrouver.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAlbumOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => createAlbumMutation.mutate(albumForm.title)}
              disabled={!cleanAlbumName(albumForm.title) || createAlbumMutation.isPending}
            >
              {createAlbumMutation.isPending ? "Création…" : "Créer"}
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
                  if (selectedImage && confirm("Supprimer cette image ?")) deleteImageMutation.mutate(selectedImage);
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