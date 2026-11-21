import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Inbox, Mail, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import NotifyByEmailToggle from "@/components/admin/NotifyByEmailToggle";
import { db } from "@/db/client";
import type { Tables } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Ticket = Tables<"contact_tickets">;

/**
 * Statuts acceptés par la contrainte CHECK de contact_tickets :
 *   Nouveau     → non lu (compté dans la pastille du menu)
 *   En attente  → lu, reste à traiter
 *   Répondu / Fermé → traité
 */
const TO_HANDLE = ["Nouveau", "En attente"];
const HANDLED = ["Répondu", "Fermé"];

type Tab = "todo" | "done" | "all";
const TABS: { id: Tab; label: string }[] = [
  { id: "todo", label: "À traiter" },
  { id: "done", label: "Traités" },
  { id: "all", label: "Tous" },
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

/** Admin « Messages » (maquette admin/Messages) : messages du formulaire « Nous écrire ». */
export default function Tickets() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("onglet") as Tab) || "todo";
  const selectedId = Number(searchParams.get("message")) || null;
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: async () => {
      const { data, error } = await db.from("contact_tickets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(
    () => ({
      todo: tickets.filter((t) => TO_HANDLE.includes(t.status)).length,
      done: tickets.filter((t) => HANDLED.includes(t.status)).length,
      all: tickets.length,
    }),
    [tickets],
  );

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return tickets.filter((t) => {
      if (tab === "todo" && !TO_HANDLE.includes(t.status)) return false;
      if (tab === "done" && !HANDLED.includes(t.status)) return false;
      return !q || fold(`${t.name} ${t.email} ${t.subject} ${t.message}`).includes(q);
    });
  }, [tickets, tab, query]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "unreadMessages"] });
  };

  const setStatus = async (ticket: Ticket, status: string, success?: string) => {
    const { error } = await db.from("contact_tickets").update({ status }).eq("id", ticket.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return false;
    }
    if (success) toast.success(success);
    refresh();
    return true;
  };

  // Ouvrir un message non lu le passe en « lu, à traiter »
  useEffect(() => {
    if (selected?.status === "Nouveau") setStatus(selected, "En attente");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("message", String(id));
    else next.delete("message");
    setSearchParams(next, { replace: true });
  };
  const selectTab = (t: Tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("onglet", t);
    next.delete("message");
    setSearchParams(next, { replace: true });
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await db.from("contact_tickets").delete().eq("id", toDelete.id);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success("Message supprimé");
    setToDelete(null);
    select(null);
    refresh();
  };

  const replyHref = (t: Ticket) =>
    `mailto:${encodeURIComponent(t.email)}?subject=${encodeURIComponent(`Re : ${t.subject}`)}&body=${encodeURIComponent(
      `Bonjour ${t.name},\n\n\n\n— L'équipe LOOM\n\n> ${t.message.split("\n").join("\n> ")}`,
    )}`;

  return (
    <AdminLayout title="Messages" actions={<NotifyByEmailToggle />}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-loom-text-muted">Les demandes envoyées depuis le formulaire « Nous écrire » du site (page L'asso).</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filtrer les messages" className="flex gap-1 rounded-xl bg-loom-surface-2 p-1 ring-1 ring-loom-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => selectTab(t.id)}
                className={cn("h-9 rounded-[9px] px-3.5 text-sm", tab === t.id ? "bg-loom-surface font-bold shadow-sm" : "text-loom-text-2 hover:text-loom-text")}
              >
                {t.label} <span className="text-loom-text-muted">({counts[t.id]})</span>
              </button>
            ))}
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Rechercher un message</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-loom-text-muted" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un message…" className="pl-9" />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Liste (masquée en mobile quand un message est ouvert) */}
          <ul className={cn("flex flex-col gap-2", selected && "hidden lg:flex")} aria-label="Messages">
            {isLoading ? (
              <li className="text-loom-text-muted">Chargement…</li>
            ) : visible.length === 0 ? (
              <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-loom-border-strong p-8 text-center">
                <Inbox aria-hidden="true" className="h-8 w-8 text-loom-text-muted" />
                <span className="font-bold">{tab === "todo" ? "Rien à traiter" : "Aucun message"}</span>
                {tab === "todo" && <span className="text-sm text-loom-text-muted">Les nouveaux messages apparaîtront ici.</span>}
              </li>
            ) : (
              visible.map((t) => {
                const unread = t.status === "Nouveau";
                const handled = HANDLED.includes(t.status);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => select(t.id)}
                      aria-current={selectedId === t.id ? "true" : undefined}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors",
                        selectedId === t.id ? "border-loom-border-strong bg-loom-chip-bg" : "border-loom-border bg-loom-surface hover:bg-loom-surface-2",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {unread && <span aria-label="Non lu" className="h-2 w-2 flex-none rounded-full bg-loom-chip-hot-bg" />}
                        <span className={cn("min-w-0 flex-1 truncate", unread ? "font-bold" : "font-semibold")}>{t.name}</span>
                        <span className="flex-none text-xs text-loom-text-muted">{formatWhen(t.created_at)}</span>
                      </span>
                      <span className={cn("truncate text-sm", unread ? "font-semibold" : "text-loom-text-2")}>{t.subject}</span>
                      <span className="truncate text-sm text-loom-text-muted">{t.message}</span>
                      {handled && (
                        <span className="mt-1 inline-flex items-center gap-1 self-start text-xs font-semibold text-loom-success">
                          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> Traité
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Message ouvert */}
          <section aria-label="Message" className={cn("min-w-0 rounded-2xl border border-loom-border p-5", !selected && "hidden lg:block")}>
            {!selected ? (
              <div className="flex flex-col gap-3 text-sm text-loom-text-2">
                <h2 className="text-base font-bold text-loom-text">Quand un message arrive</h2>
                <ol className="flex list-decimal flex-col gap-1.5 pl-5">
                  <li>Il s'affiche dans la liste, avec une pastille dans le menu tant qu'il n'est pas lu.</li>
                  <li>Cliquez dessus pour le lire en entier et y répondre par e-mail.</li>
                  <li>« Marquer comme traité » le range dans l'onglet Traités : les autres admins savent qu'il a été pris en charge.</li>
                </ol>
              </div>
            ) : (
              <article className="flex flex-col gap-4">
                <button type="button" onClick={() => select(null)} className="flex items-center gap-1 self-start text-sm font-semibold text-loom-link lg:hidden">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Messages
                </button>
                <header className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold">{selected.subject}</h2>
                  <p className="text-sm text-loom-text-2">
                    <span className="font-semibold">{selected.name}</span> ·{" "}
                    <a href={`mailto:${selected.email}`} className="text-loom-link underline underline-offset-2">
                      {selected.email}
                    </a>
                  </p>
                  <p className="text-xs text-loom-text-muted">
                    Reçu le {new Date(selected.created_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} · {selected.status}
                  </p>
                </header>
                <div className="whitespace-pre-wrap rounded-xl bg-loom-surface-2 p-4 leading-relaxed">{selected.message}</div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <a href={replyHref(selected)}>
                      <Mail className="mr-2 h-4 w-4" /> Répondre par e-mail
                    </a>
                  </Button>
                  {HANDLED.includes(selected.status) ? (
                    <Button variant="outline" onClick={() => setStatus(selected, "En attente", "Remis dans « À traiter »")}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Remettre à traiter
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setStatus(selected, "Répondu", "Message marqué comme traité")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Marquer comme traité
                    </Button>
                  )}
                  <Button variant="ghost" className="text-loom-danger" onClick={() => setToDelete(selected)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                </div>
              </article>
            )}
          </section>
        </div>
      </div>

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce message ?</DialogTitle>
            <DialogDescription>
              Le message de {toDelete?.name} sera définitivement effacé (à faire par exemple si la personne demande la suppression de ses données).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={remove}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
