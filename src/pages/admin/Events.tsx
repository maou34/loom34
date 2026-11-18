import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, CalendarDays, Search, MapPin, Clock, CheckCircle2, XCircle, MoreHorizontal, Copy, Ticket } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
import { getCapacity, isSaleEnded, normalizeHelloAssoSlug } from "@/lib/ticketing";
import { eventCity } from "@/lib/eventPlace";
import { geocodeAddress } from "@/lib/geocode";
import { todayISO } from "@/lib/eventDates";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCATION_EXAMPLE = "« Le Marvelous, 3 rue Saint-Ravy, 34000 Montpellier »";

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// 23505 = violation d'unicité (index events_helloasso_form_slug_key, entre autres).
const describeSaveError = (error: { code?: string; message: string }) => {
  if (error.code === '23505' && error.message.includes('helloasso_form_slug')) {
    return "ce formulaire HelloAsso est déjà rattaché à un autre événement";
  }
  return error.message;
};

// "" → null (pas de jauge) ; entier > 0 → nombre ; sinon undefined (invalide).
const parseCapacity = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : undefined;
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
  helloasso_form_slug: string | null;
  ticket_capacity: number | null;
  helloasso_capacity: number | null;
  ticket_member_discount: boolean;
  tickets_sold: number | null;
  tickets_sold_discounted: number | null;
  helloasso_sale_start_date: string | null;
  helloasso_sale_end_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Coordonnées du lieu pour le plan OpenStreetMap de la fiche, recalculées
 * seulement si le lieu a changé (ou n'a pas encore de coordonnées).
 * Adresse introuvable : on enregistre quand même, sans plan.
 */
const coordinatesFor = async (location: string, previous?: Event | null) => {
  if (previous && previous.location === location && previous.latitude !== null && previous.longitude !== null) return {};
  const found = await geocodeAddress(location);
  if (!found) {
    toast.warning("Adresse introuvable sur OpenStreetMap : la fiche affichera le lien d'itinéraire, sans plan.");
  }
  return found ?? { latitude: null, longitude: null };
};

const formatShortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Période de vente HelloAsso résumée pour la liste : publication programmée ou fin des inscriptions. */
const describeSalePeriod = (event: Event): string | null => {
  const now = new Date();
  if (event.helloasso_sale_end_date && isSaleEnded(event, now)) return "Inscriptions closes";
  if (!event.published && event.helloasso_sale_start_date && new Date(event.helloasso_sale_start_date) > now) {
    return `Publication auto le ${formatShortDateTime(event.helloasso_sale_start_date)}`;
  }
  if (event.helloasso_sale_end_date) return `Inscriptions jusqu'au ${formatShortDateTime(event.helloasso_sale_end_date)}`;
  return null;
};

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;
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
    registration_url: "",
    helloasso_form_slug: "",
    ticket_capacity: "",
    ticket_member_discount: false
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

  // Revenir à la première page seulement quand la recherche change (pas quand
  // un événement est publié/dépublié depuis la liste).
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage
  );

  // Événements à venir sans coordonnées (créés avant le plan OpenStreetMap, ou
  // adresse introuvable) : un clic les géocode un par un (1 requête / s, Nominatim).
  const [geocodingProgress, setGeocodingProgress] = useState<number | null>(null);
  const missingMaps = events.filter((e) => e.date >= todayISO() && e.latitude === null && e.location.trim());
  const fillMissingMaps = async () => {
    let found = 0;
    setGeocodingProgress(0);
    for (const [i, event] of missingMaps.entries()) {
      const coords = await geocodeAddress(event.location);
      if (coords) {
        const { error } = await db.from('events').update(coords).eq('id', event.id);
        if (!error) found++;
      }
      setGeocodingProgress(i + 1);
      await new Promise((r) => setTimeout(r, 1100));
    }
    setGeocodingProgress(null);
    const missed = missingMaps.length - found;
    if (missed > 0) {
      toast.warning(`${found} plan(s) ajouté(s), ${missed} adresse(s) introuvable(s) : complétez le lieu (n° et rue) puis réessayez.`);
    } else {
      toast.success(`${found} plan(s) ajouté(s)`);
    }
    fetchEvents();
  };

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('events')
        .select('id, title, location, date, time, published, slug, description, image, registration_url, helloasso_form_slug, ticket_capacity, helloasso_capacity, ticket_member_discount, tickets_sold, tickets_sold_discounted, helloasso_sale_start_date, helloasso_sale_end_date, latitude, longitude')
        .order('date', { ascending: false });

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
      registration_url: "",
      helloasso_form_slug: "",
      ticket_capacity: "",
      ticket_member_discount: false
    });
    setIsCreating(true);
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleCreateEvent = async () => {
    try {
      const { title, location, date, time, description, image, published, slug, registration_url, helloasso_form_slug, ticket_capacity, ticket_member_discount } = eventForm;
      
      if (!title || !location || !date || !time || !description || !slug) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }

      // Filtre par ville de l'agenda : la ville doit être lisible dans le lieu.
      // Pas exigé pour les événements passés (anciens lieux saisis sans ville).
      if (date >= todayISO() && !eventCity(location)) {
        toast.error(`Indiquez l'adresse complète du lieu, avec le code postal et la ville (ex. ${LOCATION_EXAMPLE})`);
        return;
      }

      const capacity = parseCapacity(ticket_capacity);
      if (capacity === undefined) {
        toast.error("La jauge doit être un nombre entier de places supérieur à 0");
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
        helloasso_form_slug: normalizeHelloAssoSlug(helloasso_form_slug),
        ticket_capacity: capacity,
        ticket_member_discount,
        author_id: user?.id,
        ...(await coordinatesFor(location)),
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
      toast.error("Erreur lors de la création de l'événement: " + describeSaveError(error));
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      const { title, location, date, time, description, image, published, slug, registration_url, helloasso_form_slug, ticket_capacity, ticket_member_discount } = eventForm;
      
      if (!title || !location || !date || !time || !description || !slug) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }

      // Filtre par ville de l'agenda : la ville doit être lisible dans le lieu.
      // Pas exigé pour les événements passés (anciens lieux saisis sans ville).
      if (date >= todayISO() && !eventCity(location)) {
        toast.error(`Indiquez l'adresse complète du lieu, avec le code postal et la ville (ex. ${LOCATION_EXAMPLE})`);
        return;
      }

      const capacity = parseCapacity(ticket_capacity);
      if (capacity === undefined) {
        toast.error("La jauge doit être un nombre entier de places supérieur à 0");
        return;
      }
      
      const newFormSlug = normalizeHelloAssoSlug(helloasso_form_slug);
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
        helloasso_form_slug: newFormSlug,
        ticket_capacity: capacity,
        ticket_member_discount,
        updated_at: new Date().toISOString(),
        ...(await coordinatesFor(location, selectedEvent)),
        // Formulaire HelloAsso changé ou retiré : les données synchronisées
        // concernent l'ancien formulaire, on les vide jusqu'à la prochaine
        // synchro (sync-events). La jauge, saisie ici, est conservée.
        ...(newFormSlug !== selectedEvent.helloasso_form_slug && {
          tickets_sold: null,
          tickets_sold_discounted: null,
          ticket_prices: null,
          helloasso_synced_at: null,
          // Nouvelle billetterie : sa date d'ouverture pourra de nouveau publier l'événement.
          helloasso_sale_start_date: null,
          helloasso_sale_end_date: null,
          helloasso_auto_published_at: null,
        }),
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
      toast.error("Erreur lors de la mise à jour de l'événement: " + describeSaveError(error));
    }
  };

  const [togglingId, setTogglingId] = useState<string | null>(null);

  /** Publier / mettre en brouillon directement depuis la liste. */
  const togglePublished = async (event: Event) => {
    const published = !event.published;
    const setPublished = (value: boolean) =>
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, published: value } : e)));

    setTogglingId(event.id);
    setPublished(published); // affichage immédiat, annulé en cas d'erreur
    try {
      const { error } = await db
        .from('events')
        .update({ published, updated_at: new Date().toISOString() })
        .eq('id', event.id);
      if (error) throw error;
      toast.success(published ? `« ${event.title} » est publié` : `« ${event.title} » est repassé en brouillon`);
    } catch (error: unknown) {
      setPublished(event.published);
      console.error("Error toggling event publication:", error);
      toast.error("Erreur lors du changement de statut : " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTogglingId(null);
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
      registration_url: event.registration_url || "",
      helloasso_form_slug: event.helloasso_form_slug || "",
      ticket_capacity: event.ticket_capacity?.toString() ?? "",
      ticket_member_discount: event.ticket_member_discount
    });
    setIsCreating(false);
    setDialogOpen(true);
  };

  const confirmDelete = (event: Event) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const duplicateEvent = (event: Event) => {
    setSelectedEvent(null);
    setEventForm({
      title: event.title,
      location: event.location,
      date: "",
      time: event.time,
      description: event.description,
      image: event.image,
      published: false,
      slug: `${event.slug}-copie-${Date.now().toString(36)}`,
      registration_url: event.registration_url || "",
      // Un formulaire HelloAsso ne peut être rattaché qu'à un seul événement
      helloasso_form_slug: "",
      ticket_capacity: event.ticket_capacity?.toString() ?? "",
      ticket_member_discount: event.ticket_member_discount
    });
    setIsCreating(true);
    setDialogOpen(true);
    toast.info("Événement dupliqué : il ne reste qu'à définir la nouvelle date");
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {missingMaps.length > 0 && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={fillMissingMaps} disabled={geocodingProgress !== null}>
                <MapPin className="h-4 w-4 mr-2" />
                {geocodingProgress !== null
                  ? `Plans : ${geocodingProgress}/${missingMaps.length}…`
                  : `Calculer les plans manquants (${missingMaps.length})`}
              </Button>
            )}
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto" 
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel événement
            </Button>
          </div>
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
                  {paginatedEvents.map((event) => (
                    <TableRow key={event.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-10 w-10 rounded-lg bg-cover bg-center flex-shrink-0 border border-gray-200"
                            style={{ backgroundImage: `url(${event.image})` }}
                          />
                          <div>
                            <div className="font-medium text-gray-900 line-clamp-1">{event.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-1 flex items-center gap-1">
                              {event.helloasso_form_slug && (
                                <Ticket className="h-3 w-3 text-orange-600 flex-shrink-0" aria-label="Billetterie HelloAsso" />
                              )}
                              {event.slug}
                            </div>
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
                        <label className="inline-flex items-center gap-2 cursor-pointer whitespace-nowrap">
                          <Switch
                            checked={event.published}
                            onCheckedChange={() => togglePublished(event)}
                            disabled={togglingId === event.id}
                            aria-label={event.published ? `Mettre « ${event.title} » en brouillon` : `Publier « ${event.title} »`}
                            className="data-[state=checked]:bg-green-600"
                          />
                          <span className={event.published ? "text-sm font-medium text-green-700" : "text-sm text-gray-500"}>
                            {event.published ? "Publié" : "Brouillon"}
                          </span>
                        </label>
                        {event.helloasso_form_slug && event.tickets_sold !== null && (
                          <div className="mt-1 text-xs text-gray-500 whitespace-nowrap">
                            {event.tickets_sold}
                            {getCapacity(event) ? `/${getCapacity(event)}` : ""} inscrit{event.tickets_sold > 1 ? "s" : ""}
                            {(event.tickets_sold_discounted ?? 0) > 0 && ` · dont ${event.tickets_sold_discounted} au tarif réduit`}
                          </div>
                        )}
                        {event.helloasso_form_slug && (() => {
                          const saleNote = describeSalePeriod(event);
                          return saleNote && <div className="mt-1 text-xs text-gray-500 whitespace-nowrap">{saleNote}</div>;
                        })()}
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
                            <DropdownMenuItem onClick={() => duplicateEvent(event)}>
                              <Copy className="mr-2 h-4 w-4" /> Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublished(event)} disabled={togglingId === event.id}>
                              {event.published ? (
                                <><XCircle className="mr-2 h-4 w-4" /> Mettre en brouillon</>
                              ) : (
                                <><CheckCircle2 className="mr-2 h-4 w-4" /> Publier</>
                              )}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
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
                <Label htmlFor="slug">Adresse de la page sur le site</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={eventForm.slug}
                  onChange={handleInputChange}
                  placeholder="url-de-l-evenement"
                />
                <p className="text-xs text-gray-500">
                  lgbt-loom.fr/events/<span className="font-medium">{eventForm.slug || "…"}</span> — rempli
                  automatiquement depuis le titre. À ne pas confondre avec la billetterie HelloAsso plus bas.
                </p>
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
                <Label htmlFor="location">Lieu (adresse complète)</Label>
                <Input
                  id="location"
                  name="location"
                  value={eventForm.location}
                  onChange={handleInputChange}
                  placeholder="Le Marvelous, 3 rue Saint-Ravy, 34000 Montpellier"
                  aria-describedby="location-help"
                />
                <p id="location-help" className="text-xs text-muted-foreground">
                  Nom du lieu, adresse, code postal et ville : la ville sert au filtre de l'agenda, l'adresse à l'itinéraire.
                </p>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="helloasso_form_slug">Billetterie HelloAsso (Optionnel)</Label>
                <Input
                  id="helloasso_form_slug"
                  name="helloasso_form_slug"
                  value={eventForm.helloasso_form_slug}
                  onChange={handleInputChange}
                  placeholder="Lien ou slug du formulaire, ex : loom-fete-son-anniversaire"
                />
                <p className="text-xs text-gray-500">
                  Rempli automatiquement pour les billetteries créées sur HelloAsso (import toutes les
                  15 min). Sinon, colle le lien de la billetterie ou juste son slug. Le lien
                  d'inscription ci-dessus est alors ignoré.
                </p>
                {eventForm.helloasso_form_slug && (
                  <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-2 py-1.5">
                    HelloAsso fait foi : titre, date, heure, lieu, description et image sont recopiés
                    depuis la billetterie à chaque synchro (et, en production, la publication suit
                    l'état HelloAsso). Modifie-les sur HelloAsso, pas ici, sinon tes changements
                    seront écrasés. La jauge et le tarif réduit restent à régler ici.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket_capacity">Jauge (facultatif)</Label>
                <Input
                  id="ticket_capacity"
                  name="ticket_capacity"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={eventForm.ticket_capacity}
                  onChange={handleInputChange}
                  placeholder={
                    !isCreating && selectedEvent?.helloasso_capacity
                      ? `${selectedEvent.helloasso_capacity} (HelloAsso)`
                      : "ex : 30"
                  }
                />
                <p className="text-xs text-gray-500">
                  {!isCreating && selectedEvent?.helloasso_capacity
                    ? `HelloAsso : ${selectedEvent.helloasso_capacity} places (limite du tarif). Ne remplir que pour la remplacer.`
                    : "Reprise automatiquement de la limite du tarif HelloAsso. À remplir seulement si la limite n'est réglée qu'au niveau global chez HelloAsso, qui ne la transmet pas."}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 border rounded-lg p-3 bg-gray-50">
              <Switch
                id="ticket_member_discount"
                checked={eventForm.ticket_member_discount}
                onCheckedChange={(checked) => setEventForm(prev => ({ ...prev, ticket_member_discount: checked }))}
              />
              <div className="space-y-1">
                <Label htmlFor="ticket_member_discount" className="cursor-pointer font-medium">
                  Tarif réduit adhérent avec code promo
                </Label>
                <p className="text-xs text-gray-500">
                  Affiche « Tarif réduit pour les adhérents, avec le code promo LOOM » sous le prix.
                  HelloAsso ne permet pas de savoir si un code promo existe : coche si tu en as créé un.
                  Le nombre de billets vendus avec un code promo est compté automatiquement.
                </p>
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
