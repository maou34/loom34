import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/db/client";

/**
 * « Me prévenir par e-mail » : préférence de l'admin connecté
 * (profiles.notify_on_message, src/db/message_notifications.sql). L'e-mail part
 * de l'Edge Function notify-new-message à chaque nouveau message de contact.
 * Masqué tant que la colonne n'existe pas en base.
 */
export default function NotifyByEmailToggle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "notifyOnMessage", user?.id];

  const { data: enabled, isError, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("notify_on_message").eq("id", user!.id).limit(1);
      if (error) throw new Error(error.message);
      return data?.[0]?.notify_on_message ?? false;
    },
  });

  if (!user || isError || isLoading) return null;

  const toggle = async (value: boolean) => {
    queryClient.setQueryData(queryKey, value);
    const { error } = await db.from("profiles").update({ notify_on_message: value }).eq("id", user.id);
    if (error) {
      queryClient.setQueryData(queryKey, !value);
      toast.error(`Erreur : ${error.message}`);
      return;
    }
    toast.success(value ? "Vous serez prévenu·e par e-mail des nouveaux messages" : "Notifications par e-mail désactivées");
  };

  return (
    <label className="flex items-center gap-2 rounded-xl border border-loom-border bg-loom-surface px-3 py-2 text-sm">
      <BellRing aria-hidden="true" className="h-4 w-4 text-loom-text-muted" />
      <span className="hidden sm:inline">Me prévenir par e-mail</span>
      <span className="sm:hidden">E-mail</span>
      <Switch checked={!!enabled} onCheckedChange={toggle} aria-label="Me prévenir par e-mail des nouveaux messages" />
    </label>
  );
}
