import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Eye, CalendarDays, Search, MapPin, Clock, CheckCircle2, XCircle, MoreHorizontal, Copy, Ticket, Repeat } from "lucide-react";
import RegularMeetupsDialog from "@/components/admin/RegularMeetupsDialog";
import PublishToggle from "@/components/admin/PublishToggle";
import { ClearFiltersButton, FilterSelect } from "@/components/admin/ListFilters";
import { ALL, useUrlFilters } from "@/lib/urlFilters";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
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
import { eventCity, sortCities } from "@/lib/eventPlace";
import { geocodeAddress } from "@/lib/geocode";
import { dateBlockParts, eventDay, formatCountdown, isRecurringApero, todayISO } from "@/lib/eventDates";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCATION_EXAMPLE = "« Le Marvelous, 3 rue Saint-Ravy, 34000 Montpellier »";

type ListTab = "upcoming" | "past" | "drafts";
const LIST_TABS: { id: ListTab; label: string }[] = [
  { id: "upcoming", label: "À venir" },
  { id: "past", label: "Passés" },
  { id: "drafts", label: "Brouillons" },
];

const FILTER_KEYS = ["ville", "type", "annee"] as const;
const NO_CITY = "aucune";
const TYPE_OPTIONS = [
  { value: "billetterie", label: "Billetterie HelloAsso" },
  { value: "sans-billetterie", label: "Sans billetterie" },
  { value: "aperos", label: "Apéros" },
];

/** Regroupe des événements déjà triés par mois (« Novembre 2026 »). */
function groupEventsByMonth<T extends { date: string }>(events: T[]) {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const event of events) {
    const key = event.date.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label = eventDay(event.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      group = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      groups.push(group);
    }
    group.items.push(event);
  }
  return groups;
}

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
  const [meetupsOpen, setMeetupsOpen] = useState(false);
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

  // Onglets de la liste : À venir (publiés), Passés, Brouillons (à venir non publiés)
  const [searchParams, setSearchParams] = useSearchParams();
  const listTab = (searchParams.get("onglet") as ListTab) || "upcoming";
  const setListTab = (tab: ListTab) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "upcoming") next.delete("onglet");
        else next.set("onglet", tab);
        return next;
      },
      { replace: true },
    );
  const today = todayISO();
  const inTab = (e: Event, tab: ListTab) =>
    tab === "past" ? e.date.slice(0, 10) < today : e.date.slice(0, 10) >= today && (tab === "upcoming" ? e.published : !e.published);
  const tabCounts = {
    upcoming: events.filter((e) => inTab(e, "upcoming")).length,
    past: events.filter((e) => inTab(e, "past")).length,
    drafts: events.filter((e) => inTab(e, "drafts")).length,
  };

  // Filtres Ville / Type / Année (options tirées des événements de l'onglet)
  const { values: filters, setFilter, clearFilters, activeCount } = useUrlFilters(FILTER_KEYS);
  const tabEvents = events.filter((e) => inTab(e, listTab));
  const cityOptions = [
    ...sortCities([...new Set(tabEvents.map((e) => eventCity(e.location)).filter((c): c is string => !!c))]).map((c) => ({ value: c, label: c })),
    ...(tabEvents.some((e) => !eventCity(e.location)) ? [{ value: NO_CITY, label: "Ville non reconnue" }] : []),
  ];
  const yearOptions = [...new Set(tabEvents.map((e) => e.date.slice(0, 4)))]
    .sort((a, b) => b.localeCompare(a))
    .map((y) => ({ value: y, label: y }));
  const matchesFilters = (e: Event) => {
    if (filters.ville !== ALL && (eventCity(e.location) ?? NO_CITY) !== filters.ville) return false;
    if (filters.annee !== ALL && e.date.slice(0, 4) !== filters.annee) return false;
    if (filters.type === "billetterie" && !e.helloasso_form_slug) return false;
    if (filters.type === "sans-billetterie" && e.helloasso_form_slug) return false;
    if (filters.type === "aperos" && !isRecurringApero(e.title)) return false;
    return true;
  };

  const monthGroups = groupEventsByMonth(
    filteredEvents.filter((e) => inTab(e, listTab) && matchesFilters(e)).sort((x, y) => (listTab === "past" ? y.date.localeCompare(x.date) : x.date.localeCompare(y.date))),
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
    
    // Adresse calculée depuis le titre à la création ou tant que le contenu n'est pas
    
    // publié ; une fois publié, son adresse ne change plus toute seule (liens partagés).
    
    if (name === "title" && (isCreating || !selectedEvent?.published)) {
    
      setEventForm(prev => ({ ...prev, slug: slugify(value) }));
    
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

  // « Créer » depuis le tableau de bord : /admin/…?nouveau=1 ouvre directement le formulaire
  useEffect(() => {
    if (!searchParams.has("nouveau")) return;
    resetForm();
    setSearchParams(
      (params) => {
        params.delete("nouveau");
        return params;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      toast.success(published ? `« ${event.title} » est publié` : `« ${event.title} » est repassé en brouillon`, {
        action: { label: "Annuler", onClick: () => togglePublished({ ...event, published }) },
      });
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
    <AdminLayout
      title="Événements"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMeetupsOpen(true)}>
            <Repeat className="h-4 w-4 sm:mr-2" />
            <span className="sr-only sm:not-sr-only">Rendez-vous réguliers</span>
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={resetForm}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="sr-only sm:not-sr-only">Nouvel événement</span>
          </Button>
        </div>
      }
    >
      <RegularMeetupsDialog open={meetupsOpen} onOpenChange={setMeetupsOpen} />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filtrer les événements" className="flex gap-1 rounded-xl bg-loom-surface-2 p-1 ring-1 ring-loom-border">
            {LIST_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={listTab === t.id}
                onClick={() => setListTab(t.id)}
                className={`h-9 rounded-[9px] px-3.5 text-sm ${listTab === t.id ? "bg-loom-surface font-bold shadow-sm" : "text-loom-text-2 hover:text-loom-text"}`}
              >
                {t.label} <span className="text-loom-text-muted">({tabCounts[t.id]})</span>
              </button>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Rechercher un événement</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-loom-text-muted" />
              <Input type="search" placeholder="Rechercher un événement…" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </label>
            {missingMaps.length > 0 && (
              <Button variant="outline" onClick={fillMissingMaps} disabled={geocodingProgress !== null}>
                <MapPin className="h-4 w-4 mr-2" />
                {geocodingProgress !== null
                  ? `Plans : ${geocodingProgress}/${missingMaps.length}…`
                  : `Calculer les plans manquants (${missingMaps.length})`}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect label="Filtrer par ville" allLabel="Toutes les villes" value={filters.ville} options={cityOptions} onChange={(v) => setFilter("ville", v)} />
          <FilterSelect label="Filtrer par type" allLabel="Tous les types" value={filters.type} options={TYPE_OPTIONS} onChange={(v) => setFilter("type", v)} />
          <FilterSelect label="Filtrer par année" allLabel="Toutes les années" value={filters.annee} options={yearOptions} onChange={(v) => setFilter("annee", v)} />
          <ClearFiltersButton count={activeCount} onClick={clearFilters} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : monthGroups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-loom-border-strong px-4 py-12 text-center">
            <CalendarDays aria-hidden="true" className="h-8 w-8 text-loom-text-muted" />
            <p className="font-bold">{searchQuery || activeCount > 0 ? "Aucun événement ne correspond" : listTab === "drafts" ? "Aucun brouillon" : "Aucun événement"}</p>
            {listTab === "upcoming" && !searchQuery && activeCount === 0 && (
              <Button onClick={resetForm} variant="outline" className="mt-2">
                Créer un événement
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {monthGroups.map((group) => (
              <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-loom-text-muted">{group.label}</h2>
                <ul className="flex flex-col gap-2">
                  {group.items.map((event) => {
                    const day = dateBlockParts(event.date);
                    const countdown = formatCountdown(event.date);
                    const saleNote = event.helloasso_form_slug ? describeSalePeriod(event) : null;
                    return (
                      <li key={event.id} className="flex items-center gap-3 rounded-xl border border-loom-border bg-loom-surface p-2.5 pr-1.5 sm:gap-4 sm:p-3">
                        <span aria-hidden="true" className="flex w-12 flex-none flex-col items-center rounded-lg bg-loom-surface-2 py-1.5">
                          <span className="text-lg font-extrabold leading-tight">{day.day}</span>
                          <span className="text-[11px] font-bold text-loom-accent-text">{day.weekday}</span>
                        </span>
                        <button type="button" onClick={() => editEvent(event)} className="flex min-w-0 flex-1 flex-col text-left">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <span className="sr-only">{day.full} : </span>
                            <span className="truncate">{event.title}</span>
                            {event.helloasso_form_slug && <Ticket className="h-3.5 w-3.5 flex-none text-loom-accent-text" aria-label="Billetterie HelloAsso" />}
                          </span>
                          <span className="truncate text-sm text-loom-text-muted">
                            {[event.time, event.location].filter(Boolean).join(" · ")}
                          </span>
                          {event.helloasso_form_slug && (event.tickets_sold !== null || saleNote) && (
                            <span className="truncate text-xs text-loom-text-muted">
                              {event.tickets_sold !== null &&
                                `${event.tickets_sold}${getCapacity(event) ? `/${getCapacity(event)}` : ""} inscrit${event.tickets_sold > 1 ? "s" : ""}${
                                  (event.tickets_sold_discounted ?? 0) > 0 ? ` · dont ${event.tickets_sold_discounted} au tarif réduit` : ""
                                }`}
                              {event.tickets_sold !== null && saleNote && " · "}
                              {saleNote}
                            </span>
                          )}
                        </button>
                        {countdown && listTab !== "past" && (
                          <span className="hidden w-16 flex-none text-right text-xs text-loom-text-muted md:block">{countdown.replace(" jours", " j")}</span>
                        )}
                        <PublishToggle id={event.id} title={event.title} published={event.published} disabled={togglingId === event.id} onToggle={() => togglePublished(event)} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-11 w-11 flex-none p-0" aria-label={`Actions pour « ${event.title} » : modifier, dupliquer, voir sur le site, supprimer`}>
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editEvent(event)}>
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateEvent(event)}>
                              <Copy className="mr-2 h-4 w-4" /> Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/events/${event.slug}`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" /> Voir sur le site
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublished(event)} disabled={togglingId === event.id}>
                              {event.published ? (
                                <><XCircle className="mr-2 h-4 w-4" /> Mettre en brouillon</>
                              ) : (
                                <><CheckCircle2 className="mr-2 h-4 w-4" /> Publier</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmDelete(event)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <p className="text-xs text-loom-text-muted">
              Cliquer sur un événement ouvre l'édition. L'interrupteur publie ou repasse en brouillon d'un clic. Le menu ⋯ propose Dupliquer (pratique pour les apéros), Voir sur le site et Supprimer.
            </p>
          </div>
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
                  onBlur={() => setEventForm(prev => ({ ...prev, slug: slugify(prev.slug) }))}
                  placeholder="url-de-l-evenement"
                />
                <p className="text-xs text-gray-500">
                  lgbt-loom.fr/events/<span className="font-medium">{eventForm.slug || "…"}</span> — remplie
                  depuis le titre tant que l'événement n'est pas publié ; la changer ensuite garde l'ancienne adresse en redirection.
                  À ne pas confondre avec la billetterie HelloAsso plus bas.
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
              <p className="text-sm text-muted-foreground">
                Format paysage recommandé : <strong>1200 × 628 px</strong> (comme une couverture d'événement Facebook). Sur le site, elle est affichée
                sur 420 px de haut au maximum ; une image plus haute est réduite avec des bandes sur les côtés.
              </p>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <ImageUpload onUploadComplete={(url) => setEventForm(prev => ({ ...prev, image: url }))} />
                {eventForm.image && (
                  <div className="mt-4 relative aspect-[1200/628] w-full max-w-md mx-auto overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
                    <img src={eventForm.image} alt="Aperçu de l'image de couverture" className="w-full h-full object-contain" />
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
