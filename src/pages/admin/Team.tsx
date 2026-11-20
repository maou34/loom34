import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Edit, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { db } from "@/db/client";
import type { Tables } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials, useTeam } from "@/lib/asso";

type Member = Tables<"team_members">;
type MemberForm = { name: string; role: string; photo: string; group_id: string };

/**
 * Admin « La Tanière » : sections (titre, ordre) et membres du bureau (nom, rôle,
 * photo, section, ordre). Réordonner avec les flèches (accessibles au clavier).
 */
export default function AdminTeam() {
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading } = useTeam();
  const [busy, setBusy] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [memberDialog, setMemberDialog] = useState<{ open: boolean; editing: Member | null }>({ open: false, editing: null });
  const [form, setForm] = useState<MemberForm>({ name: "", role: "", photo: "", group_id: "" });
  const [toDelete, setToDelete] = useState<Member | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team"] });

  const run = async (action: () => PromiseLike<{ error: { message: string } | null } | void>, success: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result && result.error) throw new Error(result.error.message);
      toast.success(success);
      await refresh();
      return true;
    } catch (e) {
      toast.error(`Erreur : ${(e as Error).message}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Réécrit les positions 1..n d'une liste après un échange (fonctionne même si plusieurs valent 0)
  const swap = <T extends { id: string }>(table: "team_groups" | "team_members", list: T[], index: number, delta: -1 | 1) => {
    const ids = list.map((x) => x.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    return run(async () => {
      for (const [i, id] of ids.entries()) {
        const { error } = await db.from(table).update({ position: i + 1 }).eq("id", id);
        if (error) return { error };
      }
    }, "Ordre mis à jour");
  };

  // --- Sections ---
  const addGroup = () => {
    const title = newGroup.trim();
    if (!title) return;
    const position = groups.length ? Math.max(...groups.map((g) => g.position)) + 1 : 1;
    run(() => db.from("team_groups").insert({ title, position }), `Section « ${title} » ajoutée`).then((ok) => ok && setNewGroup(""));
  };
  const renameGroup = (id: string, current: string) => {
    const title = (groupNames[id] ?? current).trim();
    if (!title || title === current) return;
    run(() => db.from("team_groups").update({ title }).eq("id", id), "Section renommée");
  };
  const deleteGroup = (id: string, title: string, count: number) => {
    if (count > 0) return toast.error(`Déplacez ou supprimez d'abord les ${count} membre(s) de « ${title} ».`);
    if (!window.confirm(`Supprimer la section « ${title} » ?`)) return;
    run(() => db.from("team_groups").delete().eq("id", id), "Section supprimée");
  };

  // --- Membres ---
  const openMember = (groupId: string, member: Member | null = null) => {
    setForm(member ? { name: member.name, role: member.role, photo: member.photo ?? "", group_id: member.group_id } : { name: "", role: "", photo: "", group_id: groupId });
    setMemberDialog({ open: true, editing: member });
  };
  const saveMember = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.group_id) return toast.error("Nom, rôle et section sont obligatoires");
    const editing = memberDialog.editing;
    const target = groups.find((g) => g.id === form.group_id);
    const movedOrNew = !editing || editing.group_id !== form.group_id;
    const row = {
      name: form.name.trim(),
      role: form.role.trim(),
      photo: form.photo.trim() || null,
      group_id: form.group_id,
      // Nouveau membre ou changement de section : en fin de section
      ...(movedOrNew && { position: (target?.team_members.length ?? 0) + 1 }),
    };
    const ok = await run(
      () => (editing ? db.from("team_members").update(row).eq("id", editing.id) : db.from("team_members").insert(row)),
      editing ? "Membre modifié" : "Membre ajouté",
    );
    if (ok) setMemberDialog({ open: false, editing: null });
  };
  const deleteMember = async () => {
    if (!toDelete) return;
    const ok = await run(() => db.from("team_members").delete().eq("id", toDelete.id), "Membre retiré");
    if (ok) setToDelete(null);
  };

  return (
    <AdminLayout title="La Tanière">
      <div className="space-y-6">
        <p className="text-sm text-gray-600">Les membres du bureau affichés sur la page L'asso, par section. Sans photo, la carte affiche les initiales.</p>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addGroup();
          }}
        >
          <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="Nouvelle section (ex. Les indispensables)" aria-label="Titre de la nouvelle section" className="max-w-sm bg-white" />
          <Button type="submit" variant="outline" disabled={busy || !newGroup.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter la section
          </Button>
        </form>

        {isLoading ? (
          <p className="text-gray-500">Chargement…</p>
        ) : (
          groups.map((group, gi) => (
            <section key={group.id} className="space-y-3 rounded-xl border bg-white p-4" aria-label={`Section ${group.title}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="icon" disabled={busy || gi === 0} onClick={() => swap("team_groups", groups, gi, -1)} aria-label={`Monter la section « ${group.title} »`}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={busy || gi === groups.length - 1} onClick={() => swap("team_groups", groups, gi, 1)} aria-label={`Descendre la section « ${group.title} »`}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Input
                  className="max-w-xs font-bold"
                  value={groupNames[group.id] ?? group.title}
                  onChange={(e) => setGroupNames((p) => ({ ...p, [group.id]: e.target.value }))}
                  onBlur={() => renameGroup(group.id, group.title)}
                  onKeyDown={(e) => e.key === "Enter" && renameGroup(group.id, group.title)}
                  aria-label={`Titre de la section « ${group.title} »`}
                />
                <div className="ml-auto flex gap-2">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => openMember(group.id)}>
                    <UserPlus className="mr-1 h-4 w-4" /> Ajouter un membre
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteGroup(group.id, group.title, group.team_members.length)} aria-label={`Supprimer la section « ${group.title} »`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ul className="divide-y rounded-lg border">
                {group.team_members.map((member, mi) => (
                  <li key={member.id} className="flex items-center gap-3 p-2">
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={busy || mi === 0} onClick={() => swap("team_members", group.team_members, mi, -1)} aria-label={`Monter ${member.name}`}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={busy || mi === group.team_members.length - 1} onClick={() => swap("team_members", group.team_members, mi, 1)} aria-label={`Descendre ${member.name}`}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {member.photo ? (
                      <img src={member.photo} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 font-extrabold text-amber-900">{initials(member.name)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{member.name}</p>
                      <p className="truncate text-sm text-gray-500">{member.role}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openMember(group.id, member)} aria-label={`Modifier ${member.name}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => setToDelete(member)} aria-label={`Retirer ${member.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
                {group.team_members.length === 0 && <li className="p-3 text-sm text-gray-500">Aucun membre dans cette section.</li>}
              </ul>
            </section>
          ))
        )}
      </div>

      <Dialog open={memberDialog.open} onOpenChange={(open) => setMemberDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{memberDialog.editing ? `Modifier ${memberDialog.editing.name}` : "Ajouter un membre"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="m-name">Prénom</Label>
              <Input id="m-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-role">Rôle</Label>
              <Input id="m-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Communication · Instagram" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-group">Section</Label>
              <Select value={form.group_id} onValueChange={(v) => setForm({ ...form, group_id: v })}>
                <SelectTrigger id="m-group">
                  <SelectValue placeholder="Choisir une section" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Photo (carrée de préférence)</Label>
              <ImageUpload folder="images" onUploadComplete={(url) => setForm((f) => ({ ...f, photo: url }))} />
              {form.photo && (
                <div className="flex items-center gap-3">
                  <img src={form.photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, photo: "" })}>
                    Retirer la photo
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMemberDialog({ open: false, editing: null })}>
              Annuler
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy} onClick={saveMember}>
              {memberDialog.editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer {toDelete?.name} de La Tanière ?</DialogTitle>
            <DialogDescription>La carte disparaîtra de la page L'asso. La photo reste sur le serveur.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={deleteMember}>
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
