import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, MoreHorizontal, Plus, ShieldCheck, ShieldOff, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { type AdminAccount, accountInitials, accountName, callAdminUsers, useAdminAccounts } from "@/lib/adminUsers";

const formatDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

const formatMonth = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

/** Action sensible en attente de confirmation */
type Pending = { kind: "revoke" | "delete"; account: AdminAccount } | null;

function Avatar({ account }: { account: AdminAccount }) {
  return (
    <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-loom-chip-bg text-sm font-bold text-loom-chip-fg">
      {accountInitials(account)}
    </span>
  );
}

/**
 * Admin « Administrateurs » (maquette admin/Administrateurs) : les comptes qui
 * peuvent se connecter à l'administration. Tout passe par l'Edge Function
 * admin-users (service role) : invitation par e-mail, retrait de l'accès,
 * réinitialisation du mot de passe, suppression des comptes sans accès.
 */
export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminAccounts();
  const admins = data?.admins ?? [];
  const others = data?.others ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ full_name: "", email: "" });
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      await queryClient.invalidateQueries({ queryKey: ["admin", "accounts"] });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    setBusy(true);
    try {
      const { status } = await callAdminUsers<{ status: "invited" | "promoted" }>({ action: "invite", ...invite });
      toast.success(status === "promoted" ? "Ce compte existait déjà : il est maintenant administrateur" : `Invitation envoyée à ${invite.email.trim()}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "accounts"] });
      setInviteOpen(false);
      setInvite({ full_name: "", email: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = (a: AdminAccount) =>
    run(`Lien de réinitialisation envoyé à ${a.email}`, () => callAdminUsers({ action: "reset", userId: a.id }));

  const restore = (a: AdminAccount) => run(`${accountName(a)} est de nouveau administrateur`, () => callAdminUsers({ action: "restore", userId: a.id }));

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, account } = pending;
    const ok =
      kind === "revoke"
        ? await run(`${accountName(account)} n'a plus accès à l'administration`, () => callAdminUsers({ action: "revoke", userId: account.id }))
        : await run("Compte supprimé", () => callAdminUsers({ action: "delete", userId: account.id }));
    if (ok) setPending(null);
  };

  const inviteValid = invite.full_name.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email.trim());

  return (
    <AdminLayout
      title="Administrateurs"
      actions={
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Ajouter un administrateur</span>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-sm text-loom-text-muted">Les personnes qui peuvent se connecter à cette administration.</p>

        {error ? (
          <p role="alert" className="rounded-xl border border-loom-border bg-loom-surface-2 p-4 text-sm">
            Impossible de charger les comptes : {error instanceof Error ? error.message : String(error)}
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <section aria-labelledby="h-admins" className="flex flex-col">
            <h2 id="h-admins" className="sr-only">
              Administrateurs
            </h2>
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_8rem_2.75rem] gap-4 border-b border-loom-border px-3 pb-2 text-xs font-bold uppercase tracking-[0.06em] text-loom-text-muted md:grid">
              <span>Personne</span>
              <span>Rôle</span>
              <span>Ajouté le</span>
              <span>Dernière connexion</span>
              <span />
            </div>
            <ul className="flex flex-col">
              {admins.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border-b border-loom-border px-1 py-3 md:grid md:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem_2.75rem] md:gap-4 md:px-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar account={a} />
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{accountName(a)}</span>
                        {a.is_me && <span className="flex-none rounded-full bg-loom-surface-2 px-2 py-0.5 text-xs font-semibold text-loom-text-2">Vous</span>}
                      </span>
                      <span className="truncate text-sm text-loom-text-muted">
                        <span className="hidden md:inline">{a.email}</span>
                        <span className="md:hidden">
                          {a.invited_pending ? "Invitation envoyée" : "Administrateur"} · depuis {formatMonth(a.created_at)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="hidden md:block">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.invited_pending ? "bg-loom-surface-2 text-loom-text-2" : "bg-loom-chip-bg text-loom-chip-fg"}`}>
                      {a.invited_pending ? "Invitation envoyée" : "Administrateur"}
                    </span>
                  </span>
                  <span className="hidden text-sm text-loom-text-muted md:block">{formatDay(a.created_at)}</span>
                  <span className="hidden text-sm text-loom-text-muted md:block">{a.last_sign_in_at ? formatDay(a.last_sign_in_at) : "Jamais"}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-11 w-11 flex-none p-0" aria-label={`Actions pour ${accountName(a)} : réinitialiser le mot de passe, retirer l'accès`}>
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={busy || !a.email} onClick={() => resetPassword(a)}>
                        <KeyRound className="mr-2 h-4 w-4" /> {a.invited_pending ? "Renvoyer un lien de connexion" : "Réinitialiser le mot de passe"}
                      </DropdownMenuItem>
                      {!a.is_me && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setPending({ kind: "revoke", account: a })}>
                            <ShieldOff className="mr-2 h-4 w-4" /> Retirer l'accès
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </section>
        )}

        {others.length > 0 && (
          <details className="group rounded-2xl border border-loom-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
              <span>
                Comptes sans accès <span className="text-loom-text-muted">({others.length})</span>
              </span>
              <span className="text-sm font-normal text-loom-text-muted group-open:hidden">Afficher</span>
              <span className="hidden text-sm font-normal text-loom-text-muted group-open:inline">Masquer</span>
            </summary>
            <p className="px-4 text-sm text-loom-text-muted">
              Comptes qui existent mais ne peuvent pas entrer dans l'administration : accès retiré, ou comptes bloqués.
            </p>
            <ul className="flex flex-col px-3 pb-2">
              {others.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-b border-loom-border py-3 last:border-b-0">
                  <Avatar account={a} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{accountName(a)}</span>
                      {a.banned && <span className="flex-none rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Bloqué</span>}
                    </span>
                    <span className="truncate text-sm text-loom-text-muted">
                      {a.email} · créé le {formatDay(a.created_at)}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-11 w-11 flex-none p-0" aria-label={`Actions pour ${accountName(a)}`}>
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!a.banned && (
                        <DropdownMenuItem disabled={busy} onClick={() => restore(a)}>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Redonner l'accès
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setPending({ kind: "delete", account: a })}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer le compte
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Invitation */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
            <DialogDescription>
              La personne reçoit un e-mail d'invitation et choisit elle-même son mot de passe. Si un compte existe déjà avec cette adresse, il devient
              administrateur.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (inviteValid && !busy) sendInvite();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="invite-name">Nom</Label>
              <Input id="invite-name" autoComplete="off" value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} placeholder="Prénom Nom" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Adresse e-mail</Label>
              <Input id="invite-email" type="email" autoComplete="off" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="prenom@exemple.fr" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={!inviteValid || busy}>
                Envoyer l'invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation : retirer l'accès / supprimer */}
      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{pending?.kind === "revoke" ? "Retirer l'accès ?" : "Supprimer le compte ?"}</DialogTitle>
            <DialogDescription>
              {pending?.kind === "revoke"
                ? `${pending ? accountName(pending.account) : ""} ne pourra plus entrer dans l'administration. Le compte est conservé : vous pourrez lui redonner l'accès.`
                : `Le compte ${pending?.account.email ?? ""} sera supprimé définitivement. Cette action est irréversible.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Annuler
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirmPending}>
              {pending?.kind === "revoke" ? (
                <>
                  <UserX className="mr-2 h-4 w-4" /> Retirer l'accès
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
