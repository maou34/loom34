import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HISTORY_BODY_MAX, useHistoryEntries, type HistoryEntry } from "@/lib/asso";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const NO_MONTH = "none";

type FormState = { year: string; month_label: string; sort_month: string; title: string; body: string };
const EMPTY: FormState = { year: String(new Date().getFullYear()), month_label: "", sort_month: NO_MONTH, title: "", body: "" };

/**
 * Admin « Historique » : les dates de la frise « Notre histoire » (page L'asso).
 * Tri chronologique automatique (année, puis mois facultatif).
 */
export default function AdminHistory() {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useHistoryEntries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HistoryEntry | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [toDelete, setToDelete] = useState<HistoryEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["historyEntries"] });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };
  const openEdit = (entry: HistoryEntry) => {
    setEditing(entry);
    setForm({
      year: String(entry.year),
      month_label: entry.month_label ?? "",
      sort_month: entry.sort_month ? String(entry.sort_month) : NO_MONTH,
      title: entry.title,
      body: entry.body,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const year = Number(form.year);
    if (!Number.isInteger(year) || year < 1990 || year > 2100) return toast.error("Année invalide");
    if (!form.title.trim() || !form.body.trim()) return toast.error("Le titre et le texte sont obligatoires");
    if (form.body.length > HISTORY_BODY_MAX) return toast.error(`Le texte dépasse ${HISTORY_BODY_MAX} caractères`);
    const row = {
      year,
      month_label: form.month_label.trim() || null,
      sort_month: form.sort_month === NO_MONTH ? null : Number(form.sort_month),
      title: form.title.trim(),
      body: form.body.trim(),
    };
    setSaving(true);
    const { error } = editing
      ? await db.from("history_entries").update(row).eq("id", editing.id)
      : await db.from("history_entries").insert(row);
    setSaving(false);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success(editing ? "Date modifiée" : "Date ajoutée");
    setDialogOpen(false);
    refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await db.from("history_entries").delete().eq("id", toDelete.id);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success("Date supprimée");
    setToDelete(null);
    refresh();
  };

  return (
    <AdminLayout title="Historique">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Les dates de la frise « Notre histoire » (page L'asso), triées automatiquement par année puis par mois.
          </p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter une date
          </Button>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Chargement…</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500">Aucune date pour l'instant.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-4 rounded-xl border bg-white p-4">
                <span className="w-16 flex-none text-2xl font-extrabold text-amber-900">{entry.year}</span>
                <div className="min-w-0 flex-1">
                  {entry.month_label && <p className="text-xs font-bold uppercase tracking-wide text-orange-800">{entry.month_label}</p>}
                  <p className="font-bold">{entry.title}</p>
                  <p className="text-sm text-gray-600">{entry.body}</p>
                </div>
                <div className="flex flex-none gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(entry)} aria-label={`Modifier « ${entry.title} »`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-600" onClick={() => setToDelete(entry)} aria-label={`Supprimer « ${entry.title} »`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la date" : "Ajouter une date"}</DialogTitle>
            <DialogDescription>L'ordre de la frise est automatique : année, puis mois si renseigné.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="h-year">Année</Label>
              <Input id="h-year" type="number" min={1990} max={2100} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h-month">Mois (pour le tri)</Label>
              <Select value={form.sort_month} onValueChange={(v) => setForm({ ...form, sort_month: v })}>
                <SelectTrigger id="h-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MONTH}>Non précisé</SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="h-label">Date affichée (facultatif)</Label>
              <Input id="h-label" value={form.month_label} onChange={(e) => setForm({ ...form, month_label: e.target.value })} placeholder="9 novembre, Juin, Aujourd'hui…" />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="h-title">Titre</Label>
              <Input id="h-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="La genèse" />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <div className="flex justify-between">
                <Label htmlFor="h-body">Texte</Label>
                <span className={`text-xs ${form.body.length > HISTORY_BODY_MAX ? "font-bold text-red-600" : "text-gray-500"}`} aria-live="polite">
                  {form.body.length}/{HISTORY_BODY_MAX}
                </span>
              </div>
              <Textarea id="h-body" rows={3} maxLength={HISTORY_BODY_MAX} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
          </div>

          {/* Aperçu de la carte de la frise */}
          <div className="rounded-xl border bg-amber-50/50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Aperçu</p>
            <p className="text-2xl font-extrabold text-amber-900">{form.year || "—"}</p>
            <div className="mt-2 max-w-[280px] rounded-2xl border bg-white p-4">
              {form.month_label && <p className="text-xs font-bold uppercase tracking-wide text-orange-800">{form.month_label}</p>}
              <p className="font-bold">{form.title || "Titre"}</p>
              <p className="text-sm text-gray-600">{form.body || "Texte de la date"}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving} onClick={save}>
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette date ?</DialogTitle>
            <DialogDescription>
              « {toDelete?.year} · {toDelete?.title} » disparaîtra de la frise. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={remove}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
