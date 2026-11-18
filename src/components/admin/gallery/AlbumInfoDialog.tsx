import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/db/client";
import { getImageUrl } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateFromAlbumName } from "@/lib/albums";
import { cn } from "@/lib/utils";

const NO_EVENT = "none";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nom du dossier de l'album sur le serveur d'upload */
  albumId: string;
  /** Photos de l'album (chemins relatifs /gallery/…) pour choisir la couverture */
  images: { id: string; image_url: string }[];
};

/**
 * Fiche d'un album (table photo_albums) : titre affiché, date de la soirée,
 * soirée liée, photo de couverture. Le dossier sur le serveur n'est pas renommé.
 */
export default function AlbumInfoDialog({ open, onOpenChange, albumId, images }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [eventId, setEventId] = useState(NO_EVENT);
  const [cover, setCover] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: meta, isLoading } = useQuery({
    queryKey: ["photoAlbumMeta", albumId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await db.from("photo_albums").select("*").eq("album_id", albumId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Soirées proposées : les plus récentes d'abord
  const { data: events = [] } = useQuery({
    queryKey: ["adminEventsForAlbums"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await db.from("events").select("id, title, date").order("date", { ascending: false }).limit(150);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open || isLoading) return;
    const guessed = dateFromAlbumName(albumId);
    setTitle(meta?.title ?? "");
    setDate(meta?.album_date ?? (guessed?.precision === "day" ? toISODate(guessed.date) : ""));
    setEventId(meta?.event_id ?? NO_EVENT);
    setCover(meta?.cover_image ?? "");
  }, [open, isLoading, meta, albumId]);

  const save = async () => {
    setSaving(true);
    const { error } = await db.from("photo_albums").upsert({
      album_id: albumId,
      title: title.trim() || null,
      album_date: date || null,
      event_id: eventId === NO_EVENT ? null : eventId,
      cover_image: cover || null,
    });
    setSaving(false);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success("Infos de l'album enregistrées");
    queryClient.invalidateQueries({ queryKey: ["photoAlbumMeta", albumId] });
    queryClient.invalidateQueries({ queryKey: ["albums"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Infos de l'album</DialogTitle>
          <DialogDescription>Dossier : « {albumId} ». Ces informations s'affichent sur la page Photos du site.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="album-title">Titre affiché</Label>
            <Input id="album-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={albumId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-date">Date de la soirée</Label>
            <Input id="album-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <p className="text-xs text-gray-500">Sert au tri et au filtre par année. Vide : déduite du nom du dossier si possible.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-event">Soirée liée</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger id="album-event">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_EVENT}>Aucune</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.date.slice(0, 10).split("-").reverse().join("/")} · {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">La fiche de la soirée affichera « Les photos de la soirée ».</p>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Photo de couverture</legend>
          <p className="text-xs text-gray-500">Sans choix, c'est la première photo de l'album.</p>
          {images.length === 0 ? (
            <p className="text-sm text-gray-500">L'album ne contient pas encore de photo.</p>
          ) : (
            <div className="grid max-h-[300px] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {images.map((img, i) => {
                const selected = cover ? cover === img.image_url : i === 0;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setCover(img.image_url)}
                    aria-pressed={selected}
                    aria-label={`Choisir la photo ${i + 1} comme couverture`}
                    className={cn("aspect-square overflow-hidden rounded-md ring-offset-2", selected ? "ring-4 ring-orange-500" : "hover:opacity-80")}
                  >
                    <img src={getImageUrl(img.image_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="bg-orange-600 text-white hover:bg-orange-700" disabled={saving || isLoading} onClick={save}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
