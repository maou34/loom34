import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_MEMBERSHIP_URL, DEFAULT_SHOP_URL, useSiteSettings } from "@/hooks/useSiteSettings";

type FormState = { shopUrl: string; showShop: boolean; membershipUrl: string; showMembership: boolean };

/**
 * Admin « Navigation » (maquette admin/Navigation) : les boutons externes du menu
 * du site (Boutique, Adhérer) — adresse et affichage. Les adresses servent aussi
 * aux redirections /shop et /membership et aux boutons « Adhérer » des pages.
 */
export default function AdminNavigation() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSiteSettings();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings !== undefined && !form) {
      setForm({
        shopUrl: settings?.shop_url ?? "",
        showShop: settings?.show_shop_link !== false,
        membershipUrl: settings?.membership_url ?? "",
        showMembership: settings?.show_membership_link !== false,
      });
    }
  }, [settings, form]);

  const save = async () => {
    if (!form) return;
    for (const url of [form.shopUrl, form.membershipUrl]) {
      if (url && !/^https?:\/\//i.test(url.trim())) return toast.error("Les adresses doivent commencer par https://");
    }
    setSaving(true);
    const { error } = await db
      .from("site_settings")
      .update({
        shop_url: form.shopUrl.trim() || null,
        show_shop_link: form.showShop,
        membership_url: form.membershipUrl.trim() || null,
        show_membership_link: form.showMembership,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(`Erreur : ${error.message}`);
    toast.success("Navigation enregistrée");
    queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
  };

  const links = form
    ? [
        {
          key: "shop" as const,
          title: "Boutique",
          role: "Lien discret, avec une flèche ↗",
          url: form.shopUrl,
          fallback: DEFAULT_SHOP_URL,
          show: form.showShop,
          setUrl: (v: string) => setForm({ ...form, shopUrl: v }),
          setShow: (v: boolean) => setForm({ ...form, showShop: v }),
        },
        {
          key: "membership" as const,
          title: "Adhérer",
          role: "Bouton principal (marron)",
          url: form.membershipUrl,
          fallback: DEFAULT_MEMBERSHIP_URL,
          show: form.showMembership,
          setUrl: (v: string) => setForm({ ...form, membershipUrl: v }),
          setShow: (v: boolean) => setForm({ ...form, showMembership: v }),
        },
      ]
    : [];

  return (
    <AdminLayout title="Navigation">
      {isLoading || !form ? (
        <p className="text-loom-text-muted">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-loom-text-muted">Les boutons externes affichés dans le menu du site (en-tête et menu mobile).</p>

          {/* Aperçu */}
          <section aria-label="Aperçu du menu du site" className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-loom-text-muted">Aperçu</span>
            <div className="flex items-center gap-3 rounded-2xl border border-loom-border bg-loom-surface-2 px-4 py-3">
              <img src="/logo-loom.png" alt="" className="h-9 w-9 rounded-lg" />
              <span className="font-bold">LOOM</span>
              <span className="flex-1" />
              {form.showShop && (
                <span className="flex items-center gap-1 text-sm font-semibold text-loom-text-2">
                  Boutique <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              )}
              {form.showMembership && <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">Adhérer</span>}
            </div>
          </section>

          {links.map((link) => (
            <section key={link.key} aria-labelledby={`h-${link.key}`} className="flex flex-col gap-3 rounded-2xl border border-loom-border p-4">
              <div className="flex flex-col">
                <h2 id={`h-${link.key}`} className="font-bold">
                  {link.title}
                </h2>
                <span className="text-xs text-loom-text-muted">{link.role}</span>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`url-${link.key}`}>Adresse</Label>
                <Input id={`url-${link.key}`} type="url" value={link.url} onChange={(e) => link.setUrl(e.target.value)} placeholder={link.fallback} />
                <p className="text-xs text-loom-text-muted">Vide : adresse HelloAsso par défaut.</p>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={link.show} onCheckedChange={link.setShow} aria-label={`Afficher « ${link.title} » dans le menu`} />
                Afficher ce bouton dans le menu
              </label>
            </section>
          ))}

          <div className="flex justify-end">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving} onClick={save}>
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
