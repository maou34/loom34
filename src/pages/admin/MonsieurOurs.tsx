import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Crown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { DEFAULT_CTA, editionStatus, parseSteps, useEditions, type Edition, type Step } from "@/lib/monsieurOurs";

const STATUS_LABEL = {
  complete: { text: "Complet", className: "bg-green-100 text-green-800" },
  photos: { text: "Photos manquantes", className: "bg-amber-100 text-amber-900" },
  todo: { text: "À compléter", className: "bg-gray-100 text-gray-700" },
} as const;

type EditionForm = {
  year: string;
  title: string;
  description: string;
  image: string;
  cub1_name: string;
  cub1_photo: string;
  cub2_name: string;
  cub2_photo: string;
};

const toForm = (e: Edition): EditionForm => ({
  year: String(e.year),
  title: e.title ?? "",
  description: e.description ?? "",
  image: e.image ?? "",
  cub1_name: e.cub1_name ?? "",
  cub1_photo: e.cub1_photo ?? "",
  cub2_name: e.cub2_name ?? "",
  cub2_photo: e.cub2_photo ?? "",
});

/** Champ photo : envoi + aperçu + retrait. */
function PhotoField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        {value ? (
          <img src={value} alt="" className="h-20 w-20 flex-none rounded-lg object-cover" />
        ) : (
          <span className="flex h-20 w-20 flex-none items-center justify-center rounded-lg bg-amber-50 text-xs text-gray-500">Aucune</span>
        )}
        <div className="flex-1 space-y-2">
          <ImageUpload folder="images" onUploadComplete={(url) => onChange(url)} />
          {value && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange("")}>
              Retirer la photo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Monsieur Ours (maquette admin/MonsieurOurs) : photo de groupe de la page,
 * textes de la page, palmarès année par année (lauréat + 2 oursons).
 */
export default function AdminMonsieurOurs() {
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const { data: editions = [], isLoading } = useEditions();

  // --- Photo de groupe + textes (site_settings) ---
  const [groupPhoto, setGroupPhoto] = useState("");
  const [intro, setIntro] = useState("");
  const [photosUrl, setPhotosUrl] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [cta, setCta] = useState("");
  const [savingPage, setSavingPage] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setGroupPhoto(settings.monsieur_ours_hero_image ?? "");
    setIntro(settings.monsieur_ours_intro ?? "");
    setPhotosUrl(settings.monsieur_ours_photos_url ?? "");
    setSteps(parseSteps(settings.monsieur_ours_steps));
    setCta(settings.monsieur_ours_cta ?? DEFAULT_CTA);
  }, [settings]);

  const savePage = async () => {
    setSavingPage(true);
    const { error } = await db
      .from("site_settings")
      .update({
        monsieur_ours_hero_image: groupPhoto || null,
        monsieur_ours_intro: intro.trim() || null,
        monsieur_ours_photos_url: photosUrl.trim() || null,
        monsieur_ours_steps: steps,
        monsieur_ours_cta: cta.trim() || null,
      })
      .eq("id", 1);
    setSavingPage(false);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success("Page Monsieur Ours enregistrée");
    queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
  };

  // --- Palmarès ---
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = editions.find((e) => e.id === selectedId) ?? editions[0] ?? null;
  const [form, setForm] = useState<EditionForm | null>(null);
  const [savingYear, setSavingYear] = useState(false);
  const [toDelete, setToDelete] = useState<Edition | null>(null);

  useEffect(() => {
    setForm(selected ? toForm(selected) : null);
  }, [selected?.id, selected?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshEditions = () => queryClient.invalidateQueries({ queryKey: ["monsieurOursEditions"] });

  const saveYear = async () => {
    if (!selected || !form) return;
    const year = Number(form.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return toast.error("Année invalide");
    if (!form.title.trim()) return toast.error("Le nom du lauréat est obligatoire");
    setSavingYear(true);
    const clean = (v: string) => v.trim() || null;
    const { error } = await db
      .from("monsieur_ours_timeline")
      .update({
        year,
        title: form.title.trim(),
        description: clean(form.description),
        image: clean(form.image),
        cub1_name: clean(form.cub1_name),
        cub1_photo: clean(form.cub1_photo),
        cub2_name: clean(form.cub2_name),
        cub2_photo: clean(form.cub2_photo),
      })
      .eq("id", selected.id);
    setSavingYear(false);
    if (error) return toast.error(error.code === "23505" ? `L'année ${year} existe déjà` : `Erreur : ${error.message}`);
    toast.success(`Année ${year} enregistrée`);
    refreshEditions();
  };

  const addYear = async () => {
    const year = editions.length ? editions[0].year + 1 : new Date().getFullYear();
    const { data, error } = await db
      .from("monsieur_ours_timeline")
      .insert({ year, title: "À désigner", description: `Élu lors de la Montpell'Bears ${year}` })
      .select("id")
      .single();
    if (error) return toast.error(error.code === "23505" ? `L'année ${year} existe déjà` : `Erreur : ${error.message}`);
    toast.success(`Année ${year} ajoutée : complète le nom et les photos`);
    await refreshEditions();
    setSelectedId(data.id);
  };

  const deleteYear = async () => {
    if (!toDelete) return;
    const { error } = await db.from("monsieur_ours_timeline").delete().eq("id", toDelete.id);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success(`Année ${toDelete.year} supprimée`);
    setToDelete(null);
    setSelectedId(null);
    refreshEditions();
  };

  const updateStep = (i: number, key: keyof Step, value: string) =>
    setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, [key]: value } : s)));

  return (
    <AdminLayout title="Monsieur Ours">
      <div className="space-y-8">
        {/* Palmarès */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Palmarès</CardTitle>
              <CardDescription>Une année = le lauréat et ses deux oursons. L'année la plus récente est « En titre ».</CardDescription>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={addYear}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter une année
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Chargement…</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                <ul className="flex flex-col gap-1" aria-label="Années du palmarès">
                  {editions.map((e, i) => {
                    const status = STATUS_LABEL[editionStatus(e)];
                    const active = selected?.id === e.id;
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(e.id)}
                          aria-current={active ? "true" : undefined}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${active ? "bg-amber-100" : "hover:bg-gray-50"}`}
                        >
                          <span className="w-12 font-extrabold">{e.year}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{e.title}</span>
                            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.text}</span>
                          </span>
                          {i === 0 && <Crown aria-label="En titre" className="h-4 w-4 flex-none text-amber-600" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {selected && form && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                      <div className="space-y-2">
                        <Label htmlFor="mo-year">Année</Label>
                        <Input id="mo-year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mo-name">Monsieur Ours (prénom nom)</Label>
                        <Input id="mo-name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="mo-caption">Légende</Label>
                        <Input id="mo-caption" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Élu lors de la Montpell'Bears 2026" />
                      </div>
                    </div>
                    <PhotoField label="Portrait du lauréat (différent de la photo de groupe)" value={form.image} onChange={(url) => setForm({ ...form, image: url })} />

                    <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
                      {([1, 2] as const).map((n) => (
                        <div key={n} className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`cub${n}-name`}>Ourson {n}</Label>
                            <Input
                              id={`cub${n}-name`}
                              value={form[`cub${n}_name`]}
                              onChange={(e) => setForm({ ...form, [`cub${n}_name`]: e.target.value })}
                              placeholder="Prénom nom"
                            />
                          </div>
                          <PhotoField label={`Photo de l'ourson ${n}`} value={form[`cub${n}_photo`]} onChange={(url) => setForm({ ...form, [`cub${n}_photo`]: url })} />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                      <Button variant="outline" className="text-red-600" onClick={() => setToDelete(selected)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'année
                      </Button>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={savingYear} onClick={saveYear}>
                        Enregistrer l'année
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo de groupe + textes */}
        <Card>
          <CardHeader>
            <CardTitle>La page Monsieur Ours</CardTitle>
            <CardDescription>Photo de groupe de l'en-tête et textes de la page (la page tutoie).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PhotoField label="Photo de groupe (Monsieur Ours + oursons)" value={groupPhoto} onChange={setGroupPhoto} />
            <div className="space-y-2">
              <Label htmlFor="mo-intro">Présentation du lauréat (facultatif)</Label>
              <Textarea id="mo-intro" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Son parcours, ce qu'il veut porter pendant son année…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mo-photos">Lien « Les photos de l'élection »</Label>
              <Input id="mo-photos" value={photosUrl} onChange={(e) => setPhotosUrl(e.target.value)} placeholder="/gallery/MONTPELL'BEAR 2026 … (par défaut : page Photos)" />
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">« Comment ça marche ? »</legend>
              {steps.map((step, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[160px_1fr]">
                  <Input aria-label={`Étape ${i + 1} : quand`} value={step.when} onChange={(e) => updateStep(i, "when", e.target.value)} placeholder="En juin" />
                  <Input aria-label={`Étape ${i + 1} : titre`} value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)} placeholder="Titre" />
                  <Textarea aria-label={`Étape ${i + 1} : texte`} className="sm:col-span-2" rows={2} value={step.text} onChange={(e) => updateStep(i, "text", e.target.value)} />
                </div>
              ))}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="mo-cta">Texte de « Et si c'était toi ? »</Label>
              <Input id="mo-cta" value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={savingPage} onClick={savePage}>
                Enregistrer la page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'année {toDelete?.year} ?</DialogTitle>
            <DialogDescription>
              {toDelete?.title} et ses oursons disparaîtront du palmarès. Les photos restent sur le serveur. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={deleteYear}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
