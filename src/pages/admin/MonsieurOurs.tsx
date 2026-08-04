import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Tables } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ImageUpload from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { ImageIcon, Trash2, Edit, Plus, Search, MoreHorizontal, Crown } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TimelineEntry = Tables<'monsieur_ours_timeline'>;

export default function AdminMonsieurOurs() {
  const queryClient = useQueryClient();

  // --- Hero image (site_settings.monsieur_ours_hero_image) ---
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroImage, setHeroImage] = useState<string>('');

  useEffect(() => {
    fetchHeroImage();
  }, []);

  async function fetchHeroImage() {
    setHeroLoading(true);
    const { data, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (error) {
      console.error("Error fetching site settings:", error);
      toast.error("Erreur lors du chargement des réglages");
    }
    setHeroImage(data?.monsieur_ours_hero_image || '');
    setHeroLoading(false);
  }

  const handleSaveHeroImage = async () => {
    setHeroSaving(true);
    try {
      const { error } = await db.from('site_settings').upsert({ id: 1, monsieur_ours_hero_image: heroImage });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success("Image d'en-tête enregistrée");
    } catch (error: any) {
      console.error("Error saving hero image:", error);
      toast.error("Erreur lors de l'enregistrement: " + error.message);
    } finally {
      setHeroSaving(false);
    }
  };

  // --- Timeline entries (monsieur_ours_timeline) ---
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimelineEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const [form, setForm] = useState<Partial<TimelineEntry>>({});

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredEntries(
        entries.filter(
          (e) =>
            e.title.toLowerCase().includes(lowerQuery) ||
            String(e.year).includes(lowerQuery)
        )
      );
    } else {
      setFilteredEntries(entries);
    }
  }, [searchQuery, entries]);

  async function fetchEntries() {
    setEntriesLoading(true);
    const { data, error } = await db
      .from('monsieur_ours_timeline')
      .select('*')
      .order('year', { ascending: false });
    if (error) {
      console.error("Error fetching timeline entries:", error);
      toast.error("Erreur lors du chargement");
    }
    setEntries(data || []);
    setFilteredEntries(data || []);
    setEntriesLoading(false);
  }

  const openCreateDialog = () => {
    setForm({});
    setSelectedEntry(null);
    setIsCreating(true);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: TimelineEntry) => {
    setForm(entry);
    setSelectedEntry(entry);
    setIsCreating(false);
    setDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'year' ? Number(value) : value }));
  };

  const handleSubmit = async () => {
    if (!form.year) return toast.error("L'année est requise");
    if (!form.title) return toast.error("Le nom est requis");

    try {
      if (isCreating) {
        const { error } = await db.from('monsieur_ours_timeline').insert([
          { year: form.year, title: form.title, description: form.description || null, image: form.image || null },
        ]);
        if (error) throw error;
        toast.success("Card ajoutée avec succès");
      } else if (selectedEntry) {
        const { error } = await db.from('monsieur_ours_timeline').update(form).eq('id', selectedEntry.id);
        if (error) throw error;
        toast.success("Card modifiée avec succès");
      }
      setDialogOpen(false);
      setForm({});
      setSelectedEntry(null);
      fetchEntries();
    } catch (error: any) {
      console.error("Error saving timeline entry:", error);
      toast.error("Erreur lors de l'enregistrement: " + error.message);
    }
  };

  const confirmDelete = (entry: TimelineEntry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    try {
      const { error } = await db.from('monsieur_ours_timeline').delete().eq('id', selectedEntry.id);
      if (error) throw error;
      toast.success("Card supprimée avec succès");
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      fetchEntries();
    } catch (error: any) {
      console.error("Error deleting timeline entry:", error);
      toast.error("Erreur lors de la suppression: " + error.message);
    }
  };

  return (
    <AdminLayout title="Timeline Mr Ours">
      <div className="space-y-6">
        {/* Hero Image */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Image d'en-tête</CardTitle>
            <CardDescription>
              Image de fond affichée en haut de la page publique "Monsieur Ours".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {heroLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-4">
                  {heroImage ? (
                    <div className="relative w-full max-w-md aspect-video bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <img src={heroImage} alt="Aperçu" className="h-full w-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full"
                        onClick={() => setHeroImage('')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-4">Aucune image sélectionnée</p>
                    </div>
                  )}
                  <ImageUpload onUploadComplete={(url) => setHeroImage(url)} />
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={handleSaveHeroImage}
                    disabled={heroSaving}
                  >
                    {heroSaving ? "Enregistrement..." : "Enregistrer l'image d'en-tête"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline entries */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une card..."
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle card
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {entriesLoading ? (
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
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune card</h3>
              <p className="text-gray-500 mb-6">Commencez par ajouter le premier lauréat.</p>
              <Button onClick={openCreateDialog} variant="outline">
                Ajouter une card
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Année</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {entry.image ? (
                              <img src={entry.image} alt={entry.title} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-300" />
                            )}
                          </div>
                          <span className="font-semibold text-gray-900">{entry.year}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{entry.title}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-gray-500" title={entry.description || undefined}>
                          {entry.description || '-'}
                        </div>
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
                            <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => confirmDelete(entry)}
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
              {isCreating ? "Ajouter une card" : "Modifier la card"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Année</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  value={form.year ?? ''}
                  onChange={handleInputChange}
                  placeholder="Ex: 2027"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Nom</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: Jean Dupont"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description || ''}
                onChange={handleInputChange}
                className="min-h-[100px]"
                placeholder="Ex: Monsieur Ours élu en 2027"
              />
            </div>

            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-4">
                {form.image ? (
                  <div className="relative h-32 w-32 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <img src={form.image} alt="Aperçu" className="h-full w-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => setForm((f) => ({ ...f, image: '' }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-4">Aucune photo sélectionnée</p>
                  </div>
                )}
                <ImageUpload onUploadComplete={(url) => setForm((f) => ({ ...f, image: url }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSubmit}>
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
            Êtes-vous sûr de vouloir supprimer la card{' '}
            <span className="font-semibold">"{selectedEntry?.title} ({selectedEntry?.year})"</span> ?
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
    </AdminLayout>
  );
}
