import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { DEFAULT_REGULAR_MEETUPS, MAX_REGULAR_MEETUPS, meetupWhen, parseRegularMeetups, type RegularMeetup } from "@/lib/regularMeetups";

const DAY_SUGGESTIONS = ["1ᵉʳ vendredi", "2ᵉ vendredi", "3ᵉ vendredi", "4ᵉ vendredi", "Dernier vendredi", "1ᵉʳ samedi", "3ᵉ samedi", "1ᵉʳ jeudi", "3ᵉ jeudi"];

const EMPTY: RegularMeetup = { day: "", time: "19:00", title: "", text: "" };

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/**
 * « Rendez-vous réguliers » (admin Événements) : les apéros mensuels affichés
 * dans les encadrés de l'accueil et de l'agenda (site_settings.regular_meetups).
 */
export default function RegularMeetupsDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const [items, setItems] = useState<RegularMeetup[]>([]);
  const [saving, setSaving] = useState(false);

  // Repartir de ce qui est publié à chaque ouverture (pas à chaque rechargement des
  // réglages : un retour sur l'onglet ne doit pas effacer la saisie en cours)
  useEffect(() => {
    if (open) setItems(parseRegularMeetups(settings?.regular_meetups));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const update = (i: number, key: keyof RegularMeetup, value: string) => setItems((prev) => prev.map((m, j) => (j === i ? { ...m, [key]: value } : m)));
  const move = (i: number, delta: number) =>
    setItems((prev) => {
      const next = [...prev];
      const [m] = next.splice(i, 1);
      next.splice(i + delta, 0, m);
      return next;
    });

  const incomplete = items.some((m) => !m.title.trim() || !m.day.trim());

  const save = async () => {
    if (incomplete) {
      toast.error("Chaque rendez-vous doit avoir un jour et un nom.");
      return;
    }
    setSaving(true);
    try {
      const value = items.map((m) => ({ day: m.day.trim(), time: m.time.trim(), title: m.title.trim(), text: m.text.trim() }));
      const { error } = await db.from("site_settings").update({ regular_meetups: value }).eq("id", 1);
      if (error) {
        // Colonne absente : la migration n'a pas encore été appliquée
        if (error.code === "42703" || error.code === "PGRST204") throw new Error("La base n'est pas encore à jour (migration regular_meetups à appliquer).");
        throw new Error(error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      toast.success("Rendez-vous réguliers enregistrés");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rendez-vous réguliers</DialogTitle>
          <DialogDescription>
            Les apéros mensuels en entrée libre, affichés dans l'encadré « Nos rendez-vous réguliers » de l'accueil et de l'agenda. Ils ne sont pas créés comme
            événements.
          </DialogDescription>
        </DialogHeader>

        <datalist id="meetup-days">
          {DAY_SUGGESTIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <ol className="flex flex-col gap-3">
          {items.map((m, i) => (
            <li key={i} className="flex flex-col gap-3 rounded-xl border border-loom-border bg-loom-surface-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-loom-text-muted">
                  Rendez-vous {i + 1}
                  {m.day && <span className="font-normal"> · {meetupWhen(m)}</span>}
                </span>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Monter le rendez-vous ${i + 1}`}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Descendre le rendez-vous ${i + 1}`}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Supprimer le rendez-vous ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`meetup-day-${i}`}>Jour du mois</Label>
                  <Input id={`meetup-day-${i}`} list="meetup-days" value={m.day} onChange={(e) => update(i, "day", e.target.value)} placeholder="1ᵉʳ vendredi" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`meetup-time-${i}`}>Heure</Label>
                  <Input id={`meetup-time-${i}`} type="time" value={m.time} onChange={(e) => update(i, "time", e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor={`meetup-title-${i}`}>Nom et lieu</Label>
                  <Input id={`meetup-title-${i}`} value={m.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="Apérours au Coxx" />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor={`meetup-text-${i}`}>Précision (facultatif)</Label>
                  <Input id={`meetup-text-${i}`} value={m.text} onChange={(e) => update(i, "text", e.target.value)} placeholder="Happy hour prolongée sur présentation de la carte." />
                  <span className="text-xs text-loom-text-muted">Affichée sur ordinateur, sous le nom.</span>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {items.length === 0 && <p className="text-sm text-loom-text-muted">Aucun rendez-vous : l'encadré sera masqué sur le site.</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={items.length >= MAX_REGULAR_MEETUPS} onClick={() => setItems((prev) => [...prev, { ...EMPTY }])}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un rendez-vous
          </Button>
          <Button type="button" variant="ghost" onClick={() => setItems(DEFAULT_REGULAR_MEETUPS)}>
            Revenir aux valeurs d'origine
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving} onClick={save}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
