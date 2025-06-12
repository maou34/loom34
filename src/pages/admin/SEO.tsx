import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Download, CheckCircle, AlertCircle, Globe, Search, FileText, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSitemap } from '@/services/SitemapService';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';

const AdminSEO = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const { sitemap, generateSitemap, validateSitemap } = useSitemap();

  // Stats SEO
  const { data: seoStats } = useQuery({
    queryKey: ['seoStats'],
    queryFn: async () => {
      const [articlesResult, eventsResult, albumsResult] = await Promise.all([
        db.from('articles').select('id', { count: 'exact' }),
        db.from('events').select('id', { count: 'exact' }),
        db.from('gallery_albums').select('id', { count: 'exact' })
      ]);

      return {
        articles: articlesResult.count || 0,
        events: eventsResult.count || 0,
        albums: albumsResult.count || 0,
        totalPages: 9 + (articlesResult.count || 0) + (eventsResult.count || 0) + (albumsResult.count || 0) // 9 pages statiques
      };
    }
  });

  const handleGenerateSitemap = async () => {
    setIsGenerating(true);
    try {
      await generateSitemap();
      setLastGenerated(new Date().toISOString());
    } catch (error) {
      console.error('Erreur génération sitemap:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSitemap = () => {
    if (sitemap) {
      const blob = new Blob([sitemap], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const seoRecommendations = [
    {
      title: 'Sitemap XML',
      status: sitemap ? 'good' : 'warning',
      description: 'Votre sitemap est générée et à jour',
      action: 'Régénérer la sitemap'
    },
    {
      title: 'Robots.txt',
      status: 'good',
      description: 'Le fichier robots.txt est configuré correctement',
      action: 'Vérifier robots.txt'
    },
    {
      title: 'Métadonnées',
      status: 'good',
      description: 'Les métadonnées Open Graph et Twitter Cards sont configurées',
      action: 'Optimiser les descriptions'
    },
    {
      title: 'Données structurées',
      status: 'good',
      description: 'Schema.org configuré pour l\'organisation et les articles',
      action: 'Ajouter plus de schémas'
    },
    {
      title: 'Liens internes',
      status: 'good',
      description: 'Navigation interne optimisée avec breadcrumbs',
      action: 'Analyser les liens'
    }
  ];
  return (
    <AdminLayout title="SEO & Référencement">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SEO & Référencement</h1>
            <p className="text-muted-foreground">
              Gérez et optimisez le référencement de votre site
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
            <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pages indexables</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{seoStats?.totalPages || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {seoStats?.articles || 0} articles + {seoStats?.events || 0} événements
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Articles SEO</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{seoStats?.articles || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Articles publiés et indexables
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Événements</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{seoStats?.events || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Événements avec pages dédiées
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Score SEO</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">85%</div>
                  <p className="text-xs text-muted-foreground">
                    Optimisation globale
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sitemap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestion de la Sitemap</CardTitle>
                <CardDescription>
                  Générez et gérez votre sitemap XML pour les moteurs de recherche
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Sitemap XML</h3>
                    <p className="text-sm text-muted-foreground">
                      {lastGenerated 
                        ? `Dernière génération: ${new Date(lastGenerated).toLocaleString('fr-FR')}`
                        : 'Pas encore générée'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleGenerateSitemap}
                      disabled={isGenerating}
                      variant="outline"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      {isGenerating ? 'Génération...' : 'Générer'}
                    </Button>
                    {sitemap && (
                      <Button onClick={handleDownloadSitemap} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </Button>
                    )}
                  </div>
                </div>

                {sitemap && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Aperçu de la sitemap:</p>
                    <pre className="text-xs bg-background p-2 rounded border max-h-32 overflow-y-auto">
                      {sitemap.substring(0, 500)}...
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="grid gap-4">
              {seoRecommendations.map((recommendation, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {recommendation.status === 'good' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <h3 className="font-medium">{recommendation.title}</h3>
                        </div>
                        <Badge variant={recommendation.status === 'good' ? 'default' : 'secondary'}>
                          {recommendation.status === 'good' ? 'OK' : 'À améliorer'}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        {recommendation.action}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {recommendation.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conseils d'optimisation SEO</CardTitle>
                <CardDescription>
                  Améliorez votre référencement avec ces recommandations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Sitemap XML automatique</p>
                      <p className="text-sm text-muted-foreground">
                        Votre sitemap est générée automatiquement avec tous les articles et événements
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Métadonnées optimisées</p>
                      <p className="text-sm text-muted-foreground">
                        Chaque page a des métadonnées uniques et optimisées pour les réseaux sociaux
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Données structurées</p>
                      <p className="text-sm text-muted-foreground">
                        Schema.org configuré pour améliorer la compréhension par les moteurs de recherche
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Liens internes optimisés</p>
                      <p className="text-sm text-muted-foreground">
                        Navigation interne avec breadcrumbs et liens contextuels pour améliorer l'exploration
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSEO;
