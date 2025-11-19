import { useState, useEffect } from 'react';
import { db } from '@/db/client';
import { Tables } from '@/db/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminLayout from '@/components/admin/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Eye, 
  Trash2, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type ContactTicket = Tables<'contact_tickets'> & {
  id: number;
  status: string; // 'new' | 'read' | 'replied'
};

export default function Tickets() {
  const [tickets, setTickets] = useState<ContactTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ContactTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ContactTicket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = tickets.filter(ticket => 
        (ticket.name?.toLowerCase() || '').includes(lowerQuery) ||
        (ticket.email?.toLowerCase() || '').includes(lowerQuery) ||
        (ticket.subject?.toLowerCase() || '').includes(lowerQuery)
      );
      setFilteredTickets(filtered);
    } else {
      setFilteredTickets(tickets);
    }
  }, [searchQuery, tickets]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('contact_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
      setFilteredTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: number, newStatus: string) => {
    try {
      const { error } = await db
        .from('contact_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      const updatedTickets = tickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      );
      
      setTickets(updatedTickets);
      
      // Update selected ticket if open
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }

      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    try {
      const { error } = await db
        .from('contact_tickets')
        .delete()
        .eq('id', selectedTicket.id);
        
      if (error) throw error;
      
      setTickets(tickets.filter(t => t.id !== selectedTicket.id));
      toast.success('Ticket supprimé avec succès');
      setDeleteDialogOpen(false);
      setDetailsDialogOpen(false); // Close details if open
    } catch (error) {
      console.error('Erreur lors de la suppression du ticket:', error);
      toast.error('Erreur lors de la suppression du ticket');
    }
  };

  const openDetails = (ticket: ContactTicket) => {
    setSelectedTicket(ticket);
    setDetailsDialogOpen(true);
    // Optionally mark as read if it's new
    if (ticket.status === 'new') {
      updateTicketStatus(ticket.id, 'read');
    }
  };

  const confirmDelete = (ticket: ContactTicket) => {
    setSelectedTicket(ticket);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><AlertCircle className="w-3 h-3 mr-1" /> Nouveau</Badge>;
      case 'read':
        return <Badge variant="outline" className="text-gray-600 border-gray-200"><Clock className="w-3 h-3 mr-1" /> Lu</Badge>;
      case 'replied':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Répondu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Tickets de contact">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Rechercher un ticket..." 
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun ticket trouvé</h3>
              <p className="text-gray-500">Votre boîte de réception est vide.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expéditeur</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => openDetails(ticket)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(ticket.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{ticket.name}</span>
                          <span className="text-xs text-gray-500 flex items-center mt-0.5">
                            <Mail className="w-3 h-3 mr-1" /> {ticket.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-700 max-w-xs truncate">
                          {ticket.subject}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate mt-0.5">
                          {ticket.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Ouvrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDetails(ticket)}>
                              <Eye className="mr-2 h-4 w-4" /> Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => confirmDelete(ticket)}
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

      {/* Ticket Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Détails du ticket</span>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Expéditeur</Label>
                  <div className="font-medium mt-1">{selectedTicket.name}</div>
                  <div className="text-sm text-gray-600 flex items-center mt-1">
                    <Mail className="w-3 h-3 mr-1" /> 
                    <a href={`mailto:${selectedTicket.email}`} className="hover:underline text-blue-600">
                      {selectedTicket.email}
                    </a>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Date</Label>
                  <div className="font-medium mt-1">
                    {format(new Date(selectedTicket.created_at), 'PPP à HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Sujet</Label>
                <div className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Message</Label>
                <div className="p-4 bg-white border rounded-lg text-gray-700 whitespace-pre-wrap min-h-[150px]">
                  {selectedTicket.message}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label>Changer le statut :</Label>
                  <Select 
                    value={selectedTicket.status} 
                    onValueChange={(val) => updateTicketStatus(selectedTicket.id, val)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nouveau</SelectItem>
                      <SelectItem value="read">Lu</SelectItem>
                      <SelectItem value="replied">Répondu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                    Fermer
                  </Button>
                  <Button variant="default" asChild>
                    <a href={`mailto:${selectedTicket.email}?subject=RE: ${selectedTicket.subject}`}>
                      <Mail className="w-4 h-4 mr-2" /> Répondre
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce ticket de <span className="font-semibold">{selectedTicket?.name}</span> ? 
            Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteTicket}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}