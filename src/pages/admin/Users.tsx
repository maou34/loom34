import { useEffect, useState } from "react";
import { db } from "@/db/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Users as UsersIcon,
  Search,
  Shield,
  ShieldAlert,
  MoreHorizontal,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  email?: string;
  created_at: string;
}

type FormDataState = {
  username: string;
  full_name: string;
  email: string;
  password: string;
  is_admin: boolean;
};

export default function Users() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormDataState>({
    username: "",
    full_name: "",
    email: "",
    password: "",
    is_admin: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          (user.username?.toLowerCase() || "").includes(lowerQuery) ||
          (user.full_name?.toLowerCase() || "").includes(lowerQuery) ||
          (user.email?.toLowerCase() || "").includes(lowerQuery)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((s) => ({ ...s, is_admin: checked }));
  };

  const resetForm = () => {
    setFormData({
      username: "",
      full_name: "",
      email: "",
      password: "",
      is_admin: false,
    });
    setIsCreating(true);
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || "",
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      is_admin: user.is_admin,
    });
    setIsCreating(false);
    setDialogOpen(true);
  };

  const handleCreateUser = async () => {
    try {
      if (!formData.username || !formData.full_name || !formData.email || !formData.password) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }

      // 1) Create user in Supabase Auth
      // IMPORTANT: on envoie seulement username/full_name dans user_metadata.
      // is_admin ne doit PAS venir du client (sécurité).
      const { data: authData, error: authError } = await db.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      // 2) Le trigger (auth.users -> profiles) doit créer le profile automatiquement.
      //    Si tu veux appliquer le statut admin à la création, on le fait ici via UPDATE profiles
      //    (nécessite une policy RLS qui autorise les admins à modifier is_admin).
      if (authData.user && formData.is_admin) {
        const { error: updateErr } = await db
          .from("profiles")
          .update({
            is_admin: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authData.user.id);

        if (updateErr) throw updateErr;
      }

      toast.success("Utilisateur créé avec succès");
      setDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error("Erreur lors de la création: " + (error?.message || "inconnue"));
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await db
        .from("profiles")
        .update({
          username: formData.username,
          full_name: formData.full_name,
          is_admin: formData.is_admin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("Utilisateur mis à jour avec succès");
      setDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Erreur lors de la mise à jour: " + (error?.message || "inconnue"));
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      // RPC SQL delete_user(user_id uuid) que tu as déjà dans Supabase
      // @ts-expect-error: Allow custom RPC function name
      const { error } = await db.rpc("delete_user", { user_id: selectedUser.id });

      if (error) throw error;

      toast.success("Utilisateur supprimé avec succès");
      setDeleteDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Erreur lors de la suppression: " + (error?.message || "inconnue"));
    }
  };

  const confirmDelete = (user: Profile) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout title="Utilisateurs">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un utilisateur..."
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
            Nouvel utilisateur
          </Button>
        </div>

        {/* Users List */}
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
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun utilisateur trouvé</h3>
              <p className="text-gray-500 mb-6">Commencez par créer un compte utilisateur.</p>
              <Button onClick={resetForm} variant="outline">
                Créer un utilisateur
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-gray-200">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-orange-50 text-orange-700">
                              {user.username?.substring(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{user.username}</div>
                            {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-gray-600">{user.full_name || "-"}</div>
                      </TableCell>

                      <TableCell>
                        {user.is_admin ? (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">
                            <Shield className="w-3 h-3 mr-1" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 border-gray-200">
                            <User className="w-3 h-3 mr-1" /> Utilisateur
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        </span>
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
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => confirmDelete(user)}
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

      {/* User Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isCreating ? "Créer un utilisateur" : "Modifier l'utilisateur"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="jdupont"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Jean Dupont"
              />
            </div>

            {isCreating && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="jean@exemple.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between border rounded-lg p-4 bg-gray-50">
              <div className="space-y-0.5">
                <Label className="text-base">Privilèges Administrateur</Label>
                <p className="text-sm text-gray-500">Accès complet à toutes les fonctionnalités</p>
              </div>
              <Switch checked={formData.is_admin} onCheckedChange={handleSwitchChange} />
            </div>

            {isCreating && (
              <p className="text-xs text-gray-500">
                Note : le profil est créé automatiquement par un trigger Supabase. Le statut Admin est appliqué via
                une mise à jour du profil (requiert les permissions/RLS adéquates).
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={isCreating ? handleCreateUser : handleUpdateUser}
            >
              {isCreating ? "Créer l'utilisateur" : "Enregistrer"}
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
          <div className="py-4">
            <div className="flex items-center gap-4 p-4 bg-red-50 text-red-900 rounded-lg mb-4">
              <ShieldAlert className="h-6 w-6 flex-shrink-0" />
              <p className="text-sm">
                Cette action supprimera définitivement le compte de{" "}
                <strong>{selectedUser?.username}</strong> et toutes ses données associées.
              </p>
            </div>
            <p className="text-gray-600">Êtes-vous sûr de vouloir continuer ?</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}