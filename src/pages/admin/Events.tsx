import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, CalendarDays, Search, MapPin, Clock, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "@/components/admin/ImageUpload";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  published: boolean;
  slug: string;
  description: string;
  image: string;
  registration_url: string | null;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  
  // Form state for new/edit event
  const [eventForm, setEventForm] = useState({
    title: "",
    location: "",
    date: "",
    time: "",
    description: "",
    image: "https://placehold.co/600x400?text=Event+Image",
    published: false,
    slug: "",
    registration_url: ""
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = events.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents(events);
    }
  }, [searchQuery, events]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('events')
        .select('id, title, location, date, time, published, slug, description, image, registration_url')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
      setFilteredEvents(data || []);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error("Erreur lors du chargement des événements: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventForm({ ...eventForm, [name]: value });
    
    // Auto-generate slug from title
    if (name === "title") {
      setEventForm(prev => ({
        ...prev,
        slug: value.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setEventForm({ ...eventForm, published: checked });
  };

  const resetForm = () => {
    setEventForm({
      title: "",
      location: "",
      date: "",
      time: "",
      description: "",
      image: "https://placehold.co/600x400?text=Event+Image",
      published: false,
      slug: "",
      registration_url: ""
    });
    setIsCreating(true);
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleCreateEvent = async () => {
    try {
      const { title, location, date, time, description, image, published, slug, registration_url } = eventForm;
      
      if (!title || !location || !date || !time || !description || !slug) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      
      const newEvent = {
        title,
        location,
        date,
        time,
        description,
        image,
        published,
        slug,
        registration_url: registration_url || null,
        author_id: user?.id
      };
      
      const { data, error } = await db
        .from('events')
        .insert(newEvent)
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success("Événement créé avec succès");
      fetchEvents();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error("Erreur lors de la création de l'événement: " + error.message);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      const { title, location, date, time, description, image, published, slug, registration_url } = eventForm;
      
      if (!title || !location || !date || !time || !description || !slug) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      
      const updatedEvent = {
        title,
        location,
        date,
        time,
        description,
        image,
        published,
        slug,
        registration_url: registration_url || null,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await db
        .from('events')
        .update(updatedEvent)
        .eq('id', selectedEvent.id);
        
      if (error) throw error;
      
      toast.success("Événement mis à jour avec succès");
      fetchEvents();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error("Erreur lors de la mise à jour de l'événement: " + error.message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      const { error } = await db
        .from('events')
        .delete()
        .eq('id', selectedEvent.id);
        
      if (error) throw error;
      
      toast.success("Événement supprimé avec succès");
      fetchEvents();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Erreur lors de la suppression de l'événement: " + error.message);
    }
  };

  const editEvent = (event: Event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      location: event.location,
      date: event.date,
      time: event.time,
      description: event.description,
      image: event.image,
      published: event.published,
      slug: event.slug,
      registration_url: event.registration_url || ""
    });
    setIsCreating(false);
    setDialogOpen(true);
  };

  const confirmDelete = (event: Event) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout title="Événements">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Rechercher un événement..." 
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto" 
            onClick={resetForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvel événement
          </Button>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun événement trouvé</h3>
              <p className="text-gray-500 mb-6">Commencez par créer votre premier événement.</p>
              <Button onClick={resetForm} variant="outline">
                Créer un événement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[400px]">Événement</TableHead>
                    <TableHead>Lieu</TableHead>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-10 w-10 rounded-lg bg-cover bg-center flex-shrink-0 border border-gray-200"
                            style={{ backgroundImage: `url(${event.image})` }}
                          />
                          <div>
                            <div className="font-medium text-gray-900 line-clamp-1">{event.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-1">{event.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="mr-2 h-3 w-3 text-gray-400" />
                          {event.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="flex items-center text-gray-900">
                            <CalendarDays className="mr-2 h-3 w-3 text-gray-400" />
                            {formatDate(event.date)}
                          </span>
                          <span className="flex items-center text-gray-500 mt-1">
                            <Clock className="mr-2 h-3 w-3 text-gray-400" />
                            {event.time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.published ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Publié
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 border-gray-200">
                            <XCircle className="w-3 h-3 mr-1" /> Brouillon
                          </Badge>
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
                            <DropdownMenuItem asChild>
                              <Link to={`/events/${event.slug}`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" /> Voir l'événement
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editEvent(event)}>
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => confirmDelete(event)}
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

      {/* Event Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {isCreating ? "Créer un nouvel événement" : "Modifier l'événement"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  name="title"
                  value={eventForm.title}
                  onChange={handleInputChange}
                  placeholder="Titre de l'événement"
                  className="text-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={eventForm.slug}
                  onChange={handleInputChange}
                  placeholder="url-de-l-evenement"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={eventForm.date}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Heure</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  value={eventForm.time}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  name="location"
                  value={eventForm.location}
                  onChange={handleInputChange}
                  placeholder="Ex: Montpellier, Le Coxx..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="registration_url">Lien d'inscription (Optionnel)</Label>
                <Input
                  id="registration_url"
                  name="registration_url"
                  value={eventForm.registration_url}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Statut de publication</Label>
                <div className="flex items-center space-x-4 border rounded-lg p-3 bg-gray-50">
                  <Switch
                    id="published"
                    checked={eventForm.published}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="published" className="cursor-pointer font-medium">
                    {eventForm.published ? (
                      <span className="text-green-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Publié</span>
                    ) : (
                      <span className="text-gray-500 flex items-center"><XCircle className="w-4 h-4 mr-1"/> Brouillon</span>
                    )}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image de couverture</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <ImageUpload onUploadComplete={(url) => setEventForm(prev => ({ ...prev, image: url }))} />
                {eventForm.image && (
                  <div className="mt-4 relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                    <img src={eventForm.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <div className="min-h-[400px] border rounded-lg overflow-hidden">
                <MDEditor
                  value={eventForm.description}
                  onChange={value => setEventForm(prev => ({ ...prev, description: value || '' }))}
                  height={400}
                  preview="edit"
                  visiableDragbar={false}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={isCreating ? handleCreateEvent : handleUpdateEvent}
            >
              {isCreating ? "Créer l'événement" : "Enregistrer les modifications"}
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
            Êtes-vous sûr de vouloir supprimer l'événement <span className="font-semibold">"{selectedEvent?.title}"</span> ? 
            Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
