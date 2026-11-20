import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, FileText, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { dateBlockParts, todayISO } from "@/lib/eventDates";
import { cn } from "@/lib/utils";

type Kind = "event" | "article" | "url";

const KINDS: { id: Kind; label: string; icon: typeof CalendarDays }[] = [
  { id: "event", label: "Un événement", icon: CalendarDays },
  { id: "article", label: "Un article", icon: FileText },
  { id: "url", label: "Lien externe", icon: Link2 },
];

type FormState = {
  kind: Kind;
  eventId: string;
  articleId: string;
  link: string;
  image: string;
  imageWidth: number | null;
  imageHeight: number | null;
};

/**
 * Admin « Page d'accueil » (maquette admin/PageAccueil) : l'élément mis en avant
 * à droite du hero. Événement / article : choisis par id, le lien suit l'élément
 * s'il est renommé ; lien externe : visuel + adresse.
 */
export default function AdminHomeSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSiteSettings();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const today = todayISO();

  const { data: events = [] } = useQuery({
    queryKey: ["admin", "featurableEvents", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("events")
        .select("id, title, date, slug, published")
        .gte("date", today)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const { data: articles = [] } = useQuery({
    queryKey: ["admin", "featurableArticles"],
    queryFn: async () => {
      const { data, error } = await db.from("articles").select("id, title, date, slug, published").order("date", { ascending: false }).limit(60);
      if (error) throw error;
      return data;
    },
  });

  const initial = useMemo<FormState | null>(() => {
    if (!settings) return null;
    const kind = (settings.featured_kind as Kind | null) ?? "event";
    return {
      kind,
      eventId: settings.featured_event_id ?? "",
      articleId: settings.featured_article_id ?? "",
      link: settings.hero_link ?? "",
      image: settings.hero_image ?? "",
      imageWidth: settings.hero_image_width ?? null,
      imageHeight: settings.hero_image_height ?? null,
    };
  }, [settings]);

  useEffect(() => {
    if (initial && !form) setForm(initial);
  }, [initial, form]);

  const dirty = !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial);

  const save = async () => {
    if (!form) return;
    if (form.kind === "event" && !form.eventId) return toast.error("Choisissez un événement");
    if (form.kind === "article" && !form.articleId) return toast.error("Choisissez un article");
    if (form.kind === "url" && (!/^https?:\/\//i.test(form.link) || !form.image)) {
      return toast.error("Pour un lien externe, indiquez une adresse (https://…) et une image");
    }
    setSaving(true);
    const { error } = await db
      .from("site_settings")
      .update({
        featured_kind: form.kind,
        featured_event_id: form.kind === "event" ? form.eventId : null,
        featured_article_id: form.kind === "article" ? form.articleId : null,
        hero_link: form.kind === "url" ? form.link.trim() : null,
        hero_image: form.kind === "url" ? form.image : null,
        hero_image_width: form.kind === "url" ? form.imageWidth : null,
        hero_image_height: form.kind === "url" ? form.imageHeight : null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success("Page d'accueil enregistrée");
    setForm(null); // rechargé depuis les réglages à jour
    queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
  };

  const selectedEvent = events.find((e) => e.id === form?.eventId);
  const selectedArticle = articles.find((a) => a.id === form?.articleId);
  const shortDate = (date: string) => {
    const { day, month } = dateBlockParts(date);
    return `${day} ${month.toLowerCase()}`;
  };

  return (
    <AdminLayout title="Page d'accueil">
      {isLoading || !form ? (
        <p className="text-loom-text-muted">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-loom-text-muted">L'élément mis en avant en haut de la page d'accueil du site, à côté du titre.</p>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-base font-bold">Au clic, la carte mène vers…</legend>
            <div role="radiogroup" aria-label="Type d'élément mis en avant" className="flex flex-wrap gap-2">
              {KINDS.map((k) => {
                const Icon = k.icon;
                const checked = form.kind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setForm({ ...form, kind: k.id })}
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-[10px] border px-4 font-semibold",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-loom-border-strong bg-loom-surface hover:bg-loom-surface-2",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" /> {k.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {form.kind === "event" && (
            <div className="flex max-w-xl flex-col gap-3">
              <Label htmlFor="featured-event">Événement (à venir)</Label>
              <Select value={form.eventId} onValueChange={(v) => setForm({ ...form, eventId: v })}>
                <SelectTrigger id="featured-event">
                  <SelectValue placeholder="Choisir un événement" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} — {shortDate(e.date)}
                      {!e.published && " (brouillon)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEvent && (
                <div className="flex items-center gap-3 rounded-xl border border-loom-border bg-loom-surface-2 p-3">
                  <span className="flex w-12 flex-col items-center rounded-lg bg-loom-surface py-1 text-xs font-bold">
                    <span className="text-lg leading-tight">{dateBlockParts(selectedEvent.date).day}</span>
                    {dateBlockParts(selectedEvent.date).month}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{selectedEvent.title}</span>
                    <span className="truncate text-xs text-loom-text-muted">/events/{selectedEvent.slug}</span>
                  </span>
                </div>
              )}
              <p className="text-xs text-loom-text-muted">
                Le lien suit l'événement : s'il est renommé, rien ne casse sur l'accueil. Une fois passé (ou dépublié), l'accueil montre
                automatiquement la prochaine soirée.
              </p>
            </div>
          )}

          {form.kind === "article" && (
            <div className="flex max-w-xl flex-col gap-3">
              <Label htmlFor="featured-article">Article</Label>
              <Select value={form.articleId} onValueChange={(v) => setForm({ ...form, articleId: v })}>
                <SelectTrigger id="featured-article">
                  <SelectValue placeholder="Choisir un article" />
                </SelectTrigger>
                <SelectContent>
                  {articles.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                      {!a.published && " (brouillon)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedArticle && !selectedArticle.published && (
                <p className="text-sm font-semibold text-loom-danger">Cet article est un brouillon : l'accueil montrera la prochaine soirée tant qu'il n'est pas publié.</p>
              )}
            </div>
          )}

          {form.kind === "url" && (
            <div className="flex max-w-xl flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="featured-link">Adresse du lien</Label>
                <Input id="featured-link" type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Visuel</Label>
                {form.image && (
                  <div className="flex items-start gap-3">
                    <img src={form.image} alt="" className="h-28 w-auto rounded-lg border border-loom-border" />
                    <Button variant="outline" size="sm" onClick={() => setForm({ ...form, image: "", imageWidth: null, imageHeight: null })}>
                      <Trash2 className="mr-1 h-4 w-4" /> Retirer
                    </Button>
                  </div>
                )}
                <ImageUpload
                  onUploadComplete={(url, dims) => setForm({ ...form, image: url, imageWidth: dims?.width ?? null, imageHeight: dims?.height ?? null })}
                />
              </div>
            </div>
          )}

          {/* Barre d'enregistrement */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-loom-border pt-4">
            <span className="text-sm text-loom-text-muted" aria-live="polite">
              {dirty ? "Modifications non enregistrées" : "Tout est enregistré"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={!dirty || saving} onClick={() => setForm(initial)}>
                Annuler
              </Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={!dirty || saving} onClick={save}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
