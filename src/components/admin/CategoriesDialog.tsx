import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/client";
import type { Tables } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = Tables<"article_categories">;

/**
 * Catégories gérées dans l'admin (SPEC § 9, décision 4) : même fenêtre pour les
 * articles et les partenaires. Les deux tables de catégories ont la même forme.
 */
const KINDS = {
  articles: {
    table: "article_categories",
    items: "articles",
    queryKey: ["articleCategories"],
    noun: "article(s)",
    page: "Actualités",
    // Colonne texte historique articles.category, tenue à jour (NOT NULL en base)
    legacyText: true,
  },
  partners: {
    table: "partner_categories",
    items: "partners",
    queryKey: ["partnerCategories"],
    noun: "partenaire(s)",
    page: "Partenaires",
    legacyText: false,
  },
} as const;

type Props = {
  kind: keyof typeof KINDS;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** Nombre d'éléments (articles / partenaires) par catégorie (id → nombre) */
  counts: Record<string, number>;
  /** Appelé après chaque modification (recharger la liste des éléments) */
  onChanged: () => void;
};

/**
 * « Gérer les catégories » : ajouter, renommer, ordonner (ordre des filtres de
 * la page publique), fusionner dans une autre catégorie, supprimer. Les éléments
 * d'une catégorie supprimée deviennent « sans catégorie » (ON DELETE SET NULL).
 */
export default function CategoriesDialog({ kind, open, onOpenChange, categories, counts, onChanged }: Props) {
  const cfg = KINDS[kind];
  // Les deux tables de catégories (et la colonne category_id) ont la même forme
  const categoryTable = () => db.from(cfg.table as "article_categories");
  const itemTable = () => db.from(cfg.items as "articles");
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: [...cfg.queryKey] });
    onChanged();
  };

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await refresh();
    } catch (e) {
      const message = (e as { message?: string }).message ?? String(e);
      toast.error(message.includes("duplicate") ? "Une catégorie porte déjà ce nom" : `Erreur : ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    const position = categories.length ? Math.max(...categories.map((c) => c.position)) + 1 : 0;
    run(async () => {
      const { error } = await categoryTable().insert({ name, position });
      if (error) throw error;
      setNewName("");
    }, `Catégorie « ${name} » ajoutée`);
  };

  const rename = (category: Category) => {
    const name = (names[category.id] ?? category.name).trim();
    if (!name || name === category.name) return;
    run(async () => {
      const { error } = await categoryTable().update({ name }).eq("id", category.id);
      if (error) throw error;
      if (cfg.legacyText) await itemTable().update({ category: name }).eq("category_id", category.id);
    }, `Catégorie renommée en « ${name} »`);
  };

  const move = (index: number, delta: -1 | 1) => {
    const other = categories[index + delta];
    const current = categories[index];
    if (!other) return;
    // Positions renumérotées 0..n pour que l'échange fonctionne même si plusieurs valent 0
    const ordered = categories.map((c) => c.id);
    [ordered[index], ordered[index + delta]] = [ordered[index + delta], ordered[index]];
    run(async () => {
      for (const [position, id] of ordered.entries()) {
        const { error } = await categoryTable().update({ position }).eq("id", id);
        if (error) throw error;
      }
    }, `« ${current.name} » déplacée`);
  };

  const merge = (source: Category, targetId: string) => {
    const target = categories.find((c) => c.id === targetId);
    if (!target) return;
    if (!window.confirm(`Déplacer les ${counts[source.id] ?? 0} ${cfg.noun} de « ${source.name} » vers « ${target.name} », puis supprimer « ${source.name} » ?`)) return;
    run(async () => {
      const { error } = await itemTable()
        .update(cfg.legacyText ? { category_id: target.id, category: target.name } : { category_id: target.id })
        .eq("category_id", source.id);
      if (error) throw error;
      const { error: deleteError } = await categoryTable().delete().eq("id", source.id);
      if (deleteError) throw deleteError;
    }, `« ${source.name} » fusionnée dans « ${target.name} »`);
  };

  const remove = (category: Category) => {
    const n = counts[category.id] ?? 0;
    const warning = n ? ` Ses ${n} ${cfg.noun} deviendront « sans catégorie ».` : "";
    if (!window.confirm(`Supprimer la catégorie « ${category.name} » ?${warning}`)) return;
    run(async () => {
      const { error } = await categoryTable().delete().eq("id", category.id);
      if (error) throw error;
    }, `Catégorie « ${category.name} » supprimée`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kind === "articles" ? "Catégories d'articles" : "Catégories de partenaires"}</DialogTitle>
          <DialogDescription>
            L'ordre ci-dessous est celui des filtres de la page {cfg.page} (seules les catégories utilisées y apparaissent).
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nom de la nouvelle catégorie" />
          <Button type="submit" disabled={busy || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </form>

        <ul className="flex flex-col divide-y rounded-lg border">
          {categories.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Monter « ${category.name} »`}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || index === categories.length - 1} onClick={() => move(index, 1)} aria-label={`Descendre « ${category.name} »`}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <Input
                className="min-w-[160px] flex-1"
                value={names[category.id] ?? category.name}
                onChange={(e) => setNames((prev) => ({ ...prev, [category.id]: e.target.value }))}
                onBlur={() => rename(category)}
                onKeyDown={(e) => e.key === "Enter" && rename(category)}
                aria-label={`Nom de la catégorie « ${category.name} »`}
              />
              <span className="w-24 text-sm text-muted-foreground">{counts[category.id] ?? 0} {cfg.noun}</span>
              <Select value="" onValueChange={(target) => merge(category, target)} disabled={busy || categories.length < 2}>
                <SelectTrigger className="w-[150px]" aria-label={`Fusionner « ${category.name} » dans…`}>
                  <SelectValue placeholder="Fusionner dans…" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.id !== category.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(category)} aria-label={`Supprimer « ${category.name} »`} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {categories.length === 0 && <li className="p-4 text-sm text-muted-foreground">Aucune catégorie pour l'instant.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
