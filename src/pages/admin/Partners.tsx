import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Tables } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/admin/ImageUpload";

export default function AdminPartners() {
  const [partners, setPartners] = useState<Tables<'partners'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Tables<'partners'> | null>(null);
  const [form, setForm] = useState<Partial<Tables<'partners'>>>({});

  useEffect(() => { fetchPartners(); }, []);

  async function fetchPartners() {
    setLoading(true);
    const { data, error } = await db.from('partners').select('*').order('created_at', { ascending: false });
    if (error) toast.error("Erreur lors du chargement");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return toast.error("Le nom est requis");
    if (isCreating) {
      const { error } = await db.from('partners').insert([form as Tables<'partners'>]);
      if (error) toast.error("Erreur à l'ajout");
      else toast.success("Ajouté");
    } else if (selectedPartner) {
      const { error } = await db.from('partners').update(form).eq('id', selectedPartner.id);
      if (error) toast.error("Erreur à la modification");
      else toast.success("Modifié");
    }
    setDialogOpen(false);
    setForm({});
    setSelectedPartner(null);
    fetchPartners();
  };

  const [partnerToDelete, setPartnerToDelete] = useState<Tables<'partners'> | null>(null);
  const confirmDelete = (partner: Tables<'partners'>) => {
    setPartnerToDelete(partner);
    setDeleteDialogOpen(true);
  };
  const handleDelete = async () => {
    if (!partnerToDelete) return;
    const { error } = await db.from('partners').delete().eq('id', partnerToDelete.id);
    if (error) toast.error("Erreur à la suppression");
    else toast.success("Supprimé");
    setDeleteDialogOpen(false);
    setPartnerToDelete(null);
    fetchPartners();
  };

  return (
    <AdminLayout title="Partenaires">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des partenaires</h1>
        <Button onClick={openCreateDialog} variant="brown" className="gap-2"><Plus className="w-4 h-4" />Ajouter</Button>
      </div>
      <div className="overflow-x-auto bg-white rounded shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            ) : partners.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center">Aucun partenaire</TableCell></TableRow>
            ) : partners.map(partner => (
              <TableRow key={partner.id}>
                <TableCell>{partner.logo && <img src={partner.logo} alt={partner.name} className="h-10 w-10 object-contain rounded" />}</TableCell>
                <TableCell className="font-semibold">{partner.name}</TableCell>
                <TableCell>{partner.type}</TableCell>
                <TableCell className="max-w-xs truncate" title={partner.description || undefined}>{partner.description}</TableCell>
                <TableCell>{partner.website && <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-brown hover:underline flex items-center gap-1"><ExternalLink className="w-4 h-4" />Site</a>}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => openEditDialog(partner)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="destructive" onClick={() => confirmDelete(partner)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Dialog création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? "Ajouter un partenaire" : `Modifier : ${form.name}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nom</Label>
              <Input id="name" name="name" value={form.name || ''} onChange={handleInputChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Input id="type" name="type" value={form.type || ''} onChange={handleInputChange} className="col-span-3" placeholder="Bar, Restaurant, etc." />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="website" className="text-right">Site web</Label>
              <Input id="website" name="website" value={form.website || ''} onChange={handleInputChange} className="col-span-3" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logo" className="text-right">Logo</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input id="logo" name="logo" value={form.logo || ''} onChange={handleInputChange} placeholder="URL du logo" />
                <ImageUpload onUploadComplete={handleImageUpload} />
                {form.logo && <img src={form.logo} alt="logo" className="h-8 w-8 object-contain rounded" />}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description</Label>
              <textarea id="description" name="description" value={form.description || ''} onChange={handleInputChange} className="col-span-3 border rounded p-2 min-h-[80px]" placeholder="Description du partenaire" />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button variant="brown" type="submit">{isCreating ? "Ajouter" : "Enregistrer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Dialog suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Supprimer le partenaire "{partnerToDelete?.name}" ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
