import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoriesDialog from "@/components/admin/CategoriesDialog";
import { usePartnerCategories } from "@/lib/partners";
import { Tags } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Tables } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, ExternalLink, Search, MoreHorizontal, Store, Globe, ImageIcon } from "lucide-react";
import { getImageUrl } from "@/config";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Nombre de cartes avant « Voir les N autres » */
const INITIAL_COUNT = 12;

/** Initiales affichées quand le partenaire n'a pas de logo */
function initials(name: string) {
  const words = name.replace(/['’]/g, " ").split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

export default function AdminPartners() {
  const [partners, setPartners] = useState<Tables<'partners'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Tables<'partners'> | null>(null);
  const [form, setForm] = useState<Partial<Tables<'partners'>>>({});
  const queryClient = useQueryClient();
  const { data: categories = [] } = usePartnerCategories();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoryName = (id: string | null | undefined) => categories.find((c) => c.id === id)?.name;
  const categoryCounts = partners.reduce<Record<string, number>>((acc, p) => {
    if (p.category_id) acc[p.category_id] = (acc[p.category_id] ?? 0) + 1;
    return acc;
  }, {});

  useEffect(() => { 
    fetchPartners(); 
  }, []);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [categoryFilter, searchQuery]);

  const uncategorized = partners.filter((p) => !p.category_id).length;
  const filterChips = [
    { id: "all", label: "Tous", count: partners.length },
    ...categories.filter((c) => categoryCounts[c.id]).map((c) => ({ id: c.id, label: c.name, count: categoryCounts[c.id] })),
    ...(uncategorized ? [{ id: "none", label: "Sans catégorie", count: uncategorized }] : []),
  ];

  const visiblePartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return partners.filter((p) => {
      if (categoryFilter === "none" && p.category_id) return false;
      if (categoryFilter !== "all" && categoryFilter !== "none" && p.category_id !== categoryFilter) return false;
      return !q || [p.name, p.type, p.city, p.description].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [partners, categoryFilter, searchQuery]);
  const shownPartners = showAll ? visiblePartners : visiblePartners.slice(0, INITIAL_COUNT);

  async function fetchPartners() {
    setLoading(true);
    const { data, error } = await db.from('partners').select('*').order('name', { ascending: true });
    if (error) {
      console.error("Error fetching partners:", error);
      toast.error("Erreur lors du chargement");
    }
    setPartners(data || []);
    setLoading(false);
  }

  const openCreateDialog = () => {
    setForm({});
    setSelectedPartner(null);
    setIsCreating(true);
    setDialogOpen(true);
  };

  const openEditDialog = (partner: Tables<'partners'>) => {
    setForm(partner);
    setSelectedPartner(partner);
    setIsCreating(false);
    setDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (url: string) => {
    setForm(f => ({ ...f, logo: url }));
  };

  const handleSubmit = async () => {
    if (!form.name) return toast.error("Le nom est requis");
    
    try {
      if (isCreating) {
        const { error } = await db.from('partners').insert([form as Tables<'partners'>]);
        if (error) throw error;
        toast.success("Partenaire ajouté avec succès");
      } else if (selectedPartner) {
        const { error } = await db.from('partners').update(form).eq('id', selectedPartner.id);
        if (error) throw error;
        toast.success("Partenaire modifié avec succès");
      }
      setDialogOpen(false);
      setForm({});
      setSelectedPartner(null);
      fetchPartners();
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    } catch (error: any) {
      console.error("Error saving partner:", error);
      toast.error("Erreur lors de l'enregistrement: " + error.message);
    }
  };

  const confirmDelete = (partner: Tables<'partners'>) => {
    setSelectedPartner(partner);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedPartner) return;
    try {
      const { error } = await db.from('partners').delete().eq('id', selectedPartner.id);
      if (error) throw error;
      toast.success("Partenaire supprimé avec succès");
      setDeleteDialogOpen(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error: any) {
      console.error("Error deleting partner:", error);
      toast.error("Erreur lors de la suppression: " + error.message);
    }
  };

  return (
    <AdminLayout
      title="Partenaires"
      actions={
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Nouveau partenaire</span>
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div role="group" aria-label="Filtrer par catégorie" className="flex gap-2 overflow-x-auto pb-1 xl:flex-wrap xl:overflow-visible xl:pb-0">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={categoryFilter === chip.id}
                onClick={() => setCategoryFilter(chip.id)}
                className={`h-9 flex-none whitespace-nowrap rounded-full border px-3.5 text-sm ${
                  categoryFilter === chip.id
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-loom-border-strong bg-loom-surface font-medium text-loom-text-2 hover:bg-loom-surface-2"
                }`}
              >
                {chip.label} <span className={categoryFilter === chip.id ? "opacity-80" : "text-loom-text-muted"}>· {chip.count}</span>
              </button>
            ))}
          </div>
          <label className="relative w-full xl:w-72 xl:flex-none">
            <span className="sr-only">Rechercher un partenaire</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-loom-text-muted" />
            <Input type="search" placeholder="Rechercher un partenaire…" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : visiblePartners.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-loom-border-strong px-4 py-12 text-center">
            <Store aria-hidden="true" className="h-8 w-8 text-loom-text-muted" />
            <p className="font-bold">{partners.length ? "Aucun partenaire ne correspond" : "Aucun partenaire"}</p>
            {!partners.length && (
              <Button onClick={openCreateDialog} variant="outline" className="mt-2">
                Ajouter un partenaire
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shownPartners.map((partner) => (
                <li key={partner.id} className="flex flex-col gap-3 rounded-2xl border border-loom-border bg-loom-surface p-4">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl border border-loom-border bg-white text-sm font-bold text-[#623804]">
                      {partner.logo ? <img src={getImageUrl(partner.logo)} alt="" loading="lazy" className="h-full w-full object-contain p-1" /> : initials(partner.name)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <button type="button" onClick={() => openEditDialog(partner)} className="truncate text-left font-bold hover:underline">
                        {partner.name}
                      </button>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-loom-text-muted">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${partner.category_id ? "bg-loom-chip-bg text-loom-chip-fg" : "bg-loom-surface-2 text-loom-text-muted"}`}>
                          {categoryName(partner.category_id) ?? "Sans catégorie"}
                        </span>
                        {[partner.type, partner.city].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="-mr-2 -mt-2 h-11 w-11 flex-none p-0" aria-label={`Actions pour « ${partner.name} » : modifier, supprimer`}>
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(partner)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmDelete(partner)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {partner.description ? (
                    <p className="line-clamp-2 text-sm">{partner.description}</p>
                  ) : (
                    <p className="text-sm italic text-loom-text-muted">Avantage adhérent non renseigné</p>
                  )}
                  {(partner.website || !partner.city) && (
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {partner.website && (
                        <a href={partner.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-loom-accent-text hover:underline">
                          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> Site web
                        </a>
                      )}
                      {!partner.city && <span className="text-xs font-semibold text-loom-danger">Ville à renseigner</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-loom-text-muted">
              <span>
                {shownPartners.length} sur {visiblePartners.length} partenaire{visiblePartners.length > 1 ? "s" : ""}
                {shownPartners.length < visiblePartners.length && (
                  <>
                    {" · "}
                    <button type="button" onClick={() => setShowAll(true)} className="font-semibold text-loom-accent-text hover:underline">
                      Voir les {visiblePartners.length - shownPartners.length} autres
                    </button>
                  </>
                )}
              </span>
            </div>
          </>
        )}

        <button type="button" onClick={() => setCategoriesOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-loom-accent-text hover:underline">
          <Tags aria-hidden="true" className="h-4 w-4" /> Gérer les catégories →
        </button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isCreating ? "Ajouter un partenaire" : "Modifier le partenaire"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du partenaire</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={form.name || ''} 
                  onChange={handleInputChange} 
                  placeholder="Ex: Le Coxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type d'établissement</Label>
                <Input 
                  id="type" 
                  name="type" 
                  value={form.type || ''} 
                  onChange={handleInputChange} 
                  placeholder="Ex: Bar, Restaurant..." 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie (filtre de la page)</Label>
                <Select value={form.category_id ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" name="city" value={form.city || ''} onChange={handleInputChange} placeholder="Montpellier" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse (facultatif)</Label>
              <Input id="address" name="address" value={form.address || ''} onChange={handleInputChange} placeholder="3 rue Saint-Ravy, 34000 Montpellier" aria-describedby="address-help" />
              <p id="address-help" className="text-xs text-gray-500">Affiche le lien « Itinéraire ». À laisser vide pour une boutique en ligne ou un service sans adresse.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  id="website" 
                  name="website" 
                  value={form.website || ''} 
                  onChange={handleInputChange} 
                  className="pl-10"
                  placeholder="https://..." 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-4">
                {form.logo ? (
                  <div className="relative h-32 w-32 bg-white rounded-lg border border-gray-200 p-2">
                    <img src={form.logo} alt="Preview" className="h-full w-full object-contain" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => setForm(f => ({ ...f, logo: '' }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-4">Aucun logo sélectionné</p>
                  </div>
                )}
                <ImageUpload onUploadComplete={handleImageUpload} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Avantage adhérent</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={form.description || ''} 
                onChange={handleInputChange} 
                className="min-h-[100px]"
                placeholder="10 % de remise sur l'addition, sur présentation de la carte LOOM" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSubmit}
            >
              {isCreating ? "Ajouter" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer le partenaire <span className="font-semibold">"{selectedPartner?.name}"</span> ? 
            Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CategoriesDialog
        kind="partners"
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        counts={categoryCounts}
        onChanged={fetchPartners}
      />
    </AdminLayout>
  );
}
