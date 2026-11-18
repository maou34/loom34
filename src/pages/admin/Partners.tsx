import { useEffect, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ExternalLink, Search, Globe, ImageIcon, MoreHorizontal } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminPartners() {
  const [partners, setPartners] = useState<Tables<'partners'>[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Tables<'partners'>[]>([]);
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

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = partners.filter(partner => 
        (partner.name?.toLowerCase() || '').includes(lowerQuery) ||
        (partner.type?.toLowerCase() || '').includes(lowerQuery) ||
        (partner.city?.toLowerCase() || '').includes(lowerQuery)
      );
      setFilteredPartners(filtered);
    } else {
      setFilteredPartners(partners);
    }
  }, [searchQuery, partners]);

  async function fetchPartners() {
    setLoading(true);
    const { data, error } = await db.from('partners').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching partners:", error);
      toast.error("Erreur lors du chargement");
    }
    setPartners(data || []);
    setFilteredPartners(data || []);
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
    <AdminLayout title="Partenaires">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Rechercher un partenaire..." 
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCategoriesOpen(true)}>
              <Tags className="h-4 w-4 mr-2" />
              Gérer les catégories
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto" 
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau partenaire
            </Button>
          </div>
        </div>

        {/* Partners List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun partenaire trouvé</h3>
              <p className="text-gray-500 mb-6">Commencez par ajouter votre premier partenaire.</p>
              <Button onClick={openCreateDialog} variant="outline">
                Ajouter un partenaire
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Catégorie · type</TableHead>
                    <TableHead>Avantage adhérent</TableHead>
                    <TableHead>Site Web</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((partner) => (
                    <TableRow key={partner.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {partner.logo ? (
                              <img src={partner.logo} alt={partner.name} className="h-full w-full object-contain p-1" />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-300" />
                            )}
                          </div>
                          <div className="font-medium text-gray-900">{partner.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${partner.category_id ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-500"}`}>
                            {categoryName(partner.category_id) ?? "Sans catégorie"}
                          </span>
                          <span className="text-xs text-gray-500">{[partner.type, partner.city].filter(Boolean).join(" · ") || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-gray-500" title={partner.description || undefined}>
                          {partner.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {partner.website ? (
                          <a 
                            href={partner.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Visiter
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Ouvrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(partner)}>
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => confirmDelete(partner)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
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
              className="bg-orange-600 hover:bg-orange-700 text-white"
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
