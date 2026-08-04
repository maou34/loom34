import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Tables } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { ImageIcon, Trash2, Link2, ShoppingBag, Heart } from "lucide-react";

export default function AdminHomeSettings() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Tables<'site_settings'>>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (error) {
      console.error("Error fetching site settings:", error);
      toast.error("Erreur lors du chargement des réglages");
    }
    setForm(data || {});
    setLoading(false);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await db.from('site_settings').upsert({ id: 1, ...form });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success("Réglages enregistrés avec succès");
    } catch (error: any) {
      console.error("Error saving site settings:", error);
      toast.error("Erreur lors de l'enregistrement: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const heroImage = form.hero_image ?? '';

  return (
    <AdminLayout title="Page d'accueil et menu">
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Image mise en avant de l'accueil</CardTitle>
                <CardDescription>
                  Image et lien de destination de la photo affichée dans la section d'introduction de la page d'accueil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-4">
                    {heroImage ? (
                      <div className="relative w-full max-w-md aspect-video bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <img src={heroImage} alt="Aperçu" className="h-full w-full object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 rounded-full"
                          onClick={() => setForm(f => ({ ...f, hero_image: '' }))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 mb-4">Aucune image sélectionnée</p>
                      </div>
                    )}
                    <ImageUpload onUploadComplete={(url) => setForm(f => ({ ...f, hero_image: url }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero_link">Lien de destination</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="hero_link"
                      name="hero_link"
                      value={form.hero_link || ''}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="/articles/mon-article ou https://..."
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Chemin interne (ex: /articles/mon-article) ou URL externe complète (https://...).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Liens externes de la barre de navigation</CardTitle>
                <CardDescription>
                  URLs des boutons "Boutique" et "Adhésion" affichés dans le menu du site.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="shop_url">Boutique</Label>
                  <div className="relative">
                    <ShoppingBag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="shop_url"
                      name="shop_url"
                      value={form.shop_url || ''}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="membership_url">Adhésion</Label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="membership_url"
                      name="membership_url"
                      value={form.membership_url || ''}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
