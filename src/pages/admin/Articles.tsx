import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, FileText, Search, Filter, MoreHorizontal, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "@/components/admin/ImageUpload";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoriesDialog from "@/components/admin/CategoriesDialog";
import { useArticleCategories } from "@/lib/articles";
import { Star, Tags } from "lucide-react";

interface Article {
  id: string;
  title: string;
  category: string;
  date: string;
  published: boolean;
  slug: string;
  content: string;
  excerpt: string;
  image: string;
  category_id: string | null;
  is_featured: boolean;
  article_categories: { name: string } | null;
}

/** Longueur conseillée du chapô (≈ deux lignes dans les cartes) */
const EXCERPT_MAX = 160;

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { data: categories = [] } = useArticleCategories();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoryCounts = articles.reduce<Record<string, number>>((acc, a) => {
    if (a.category_id) acc[a.category_id] = (acc[a.category_id] ?? 0) + 1;
    return acc;
  }, {});
  
  // Form state for new/edit article
  const [articleForm, setArticleForm] = useState({
    title: "",
    category_id: "",
    is_featured: false,
    excerpt: "",
    content: "",
    image: "https://placehold.co/600x400?text=Article+Image",
    published: false,
    slug: "",
    date: ""
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = articles.filter(article => 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.article_categories?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredArticles(filtered);
    } else {
      setFilteredArticles(articles);
    }
  }, [searchQuery, articles]);

  async function fetchArticles() {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('articles')
        .select('id, title, category, date, published, slug, content, excerpt, image, category_id, is_featured, article_categories(name)')
        .order('date', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
      setFilteredArticles(data || []);
    } catch (error: any) {
      console.error("Error fetching articles:", error);
      toast.error("Erreur lors du chargement des articles: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArticleForm({ ...articleForm, [name]: value });
    
    // Auto-generate slug from title
    if (name === "title") {
      setArticleForm(prev => ({
        ...prev,
        slug: value.toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special chars except whitespace and hyphens
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Remove duplicate hyphens
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setArticleForm({ ...articleForm, published: checked });
  };

  const resetForm = () => {
    setArticleForm({
      title: "",
      category_id: "",
      is_featured: false,
      excerpt: "",
      content: "",
      image: "https://placehold.co/600x400?text=Article+Image",
      published: false,
      slug: "",
      date: ""
    });
    setIsCreating(true);
    setSelectedArticle(null);
    setDialogOpen(true);
  };

  const handleCreateArticle = async () => {
    try {
      const { title, category_id, is_featured, excerpt, content, image, published, slug, date } = articleForm;
      const category = categories.find((c) => c.id === category_id);
      
      if (!title || !category || !excerpt || !content || !slug) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      if (is_featured) await clearFeatured();
      
      const newArticle = {
        title,
        category: category.name,
        category_id: category.id,
        is_featured,
        excerpt,
        content,
        image,
        published,
        slug,
        author_id: user?.id,
        date: date || new Date().toISOString(),
      };
      
      const { data, error } = await db
        .from('articles')
        .insert(newArticle)
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success("Article créé avec succès");
      fetchArticles();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating article:", error);
      toast.error("Erreur lors de la création de l'article: " + error.message);
    }
  };

  const handleUpdateArticle = async () => {
    if (!selectedArticle) return;
    
    try {
      const { title, category_id, is_featured, excerpt, content, image, published, slug } = articleForm;
      const category = categories.find((c) => c.id === category_id);
      
      if (!title || !category || !excerpt || !content || !slug) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      if (is_featured && !selectedArticle.is_featured) await clearFeatured(selectedArticle.id);
      
      const updatedArticle = {
        title,
        category: category.name,
        category_id: category.id,
        is_featured,
        excerpt,
        content,
        image,
        published,
        slug,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await db
        .from('articles')
        .update(updatedArticle)
        .eq('id', selectedArticle.id);
        
      if (error) throw error;
      
      toast.success("Article mis à jour avec succès");
      fetchArticles();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating article:", error);
      toast.error("Erreur lors de la mise à jour de l'article: " + error.message);
    }
  };

  /** Un seul article « À la une » (index unique en base) : on retire l'ancien avant d'en marquer un nouveau. */
  const clearFeatured = async (exceptId?: string) => {
    let query = db.from('articles').update({ is_featured: false }).eq('is_featured', true);
    if (exceptId) query = query.neq('id', exceptId);
    const { error } = await query;
    if (error) throw error;
  };

  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;
    
    try {
      const { error } = await db
        .from('articles')
        .delete()
        .eq('id', selectedArticle.id);
        
      if (error) throw error;
      
      toast.success("Article supprimé avec succès");
      fetchArticles();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting article:", error);
      toast.error("Erreur lors de la suppression de l'article: " + error.message);
    }
  };

  const editArticle = (article: Article) => {
    setSelectedArticle(article);
    setArticleForm({
      title: article.title,
      category_id: article.category_id ?? "",
      is_featured: article.is_featured,
      excerpt: article.excerpt,
      content: article.content,
      image: article.image,
      published: article.published,
      slug: article.slug,
      date: article.date
    });
    setIsCreating(false);
    setDialogOpen(true);
  };

  const confirmDelete = (article: Article) => {
    setSelectedArticle(article);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout title="Articles">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Rechercher un article..." 
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCategoriesOpen(true)}>
              <Tags className="h-4 w-4 mr-2" />
              Gérer les catégories
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto" 
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel article
            </Button>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun article trouvé</h3>
              <p className="text-gray-500 mb-6">Commencez par créer votre premier article de blog.</p>
              <Button onClick={resetForm} variant="outline">
                Créer un article
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[400px]">Article</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <TableRow key={article.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-10 w-10 rounded-lg bg-cover bg-center flex-shrink-0 border border-gray-200"
                            style={{ backgroundImage: `url(${article.image})` }}
                          />
                          <div>
                            <div className="font-medium text-gray-900 line-clamp-1">{article.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-1">{article.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {article.article_categories ? (
                            <Badge variant="secondary" className="font-normal">
                              {article.article_categories.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">Sans catégorie</span>
                          )}
                          {article.is_featured && (
                            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">
                              <Star className="w-3 h-3 mr-1" /> À la une
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="mr-2 h-3 w-3" />
                          {formatDate(article.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {article.published ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Publié
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 border-gray-200">
                            <XCircle className="w-3 h-3 mr-1" /> Brouillon
                          </Badge>
                        )}
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
                            <DropdownMenuItem asChild>
                              <Link to={`/articles/${article.slug}`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" /> Voir l'article
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editArticle(article)}>
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => confirmDelete(article)}
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

      {/* Article Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {isCreating ? "Créer un nouvel article" : "Modifier l'article"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  name="title"
                  value={articleForm.title}
                  onChange={handleInputChange}
                  placeholder="Titre de l'article"
                  className="text-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={articleForm.slug}
                  onChange={handleInputChange}
                  placeholder="url-de-l-article"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Catégorie</Label>
                  <button type="button" className="text-xs font-medium text-orange-700 hover:underline" onClick={() => setCategoriesOpen(true)}>
                    Gérer les catégories →
                  </button>
                </div>
                <Select
                  value={articleForm.category_id}
                  onValueChange={(value) => setArticleForm((prev) => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Statut de publication</Label>
                <div className="flex items-center space-x-4 border rounded-lg p-3 bg-gray-50">
                  <Switch
                    id="published"
                    checked={articleForm.published}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="published" className="cursor-pointer font-medium">
                    {articleForm.published ? (
                      <span className="text-green-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Publié</span>
                    ) : (
                      <span className="text-gray-500 flex items-center"><XCircle className="w-4 h-4 mr-1"/> Brouillon</span>
                    )}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border p-3 bg-orange-50/50">
              <Switch
                id="is_featured"
                checked={articleForm.is_featured}
                onCheckedChange={(checked) => setArticleForm((prev) => ({ ...prev, is_featured: checked }))}
              />
              <div>
                <Label htmlFor="is_featured" className="cursor-pointer font-medium">À la une</Label>
                <p className="text-xs text-gray-500">
                  Mis en avant en grand sur l'accueil et la page Actualités. Un seul article à la fois : cocher celui-ci retire l'ancien.
                  Sans article à la une, c'est le plus récent qui s'affiche.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="excerpt">Chapô</Label>
                <span className={`text-xs ${articleForm.excerpt.length > EXCERPT_MAX ? "text-orange-700 font-medium" : "text-gray-500"}`} aria-live="polite">
                  {articleForm.excerpt.length}/{EXCERPT_MAX}
                </span>
              </div>
              <Textarea
                id="excerpt"
                name="excerpt"
                value={articleForm.excerpt}
                onChange={handleInputChange}
                placeholder="Une ou deux phrases qui donnent envie de lire, affichées sous le titre dans les listes."
                rows={3}
                aria-describedby="excerpt-help"
              />
              <p id="excerpt-help" className="text-xs text-gray-500">
                Deux lignes maximum dans les cartes ; au-delà de {EXCERPT_MAX} caractères, le texte est coupé.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Image de couverture</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <ImageUpload onUploadComplete={(url) => setArticleForm(prev => ({ ...prev, image: url }))} />
                {articleForm.image && (
                  <div className="mt-4 relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                    <img src={articleForm.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contenu</Label>
              <div className="min-h-[400px] border rounded-lg overflow-hidden">
                <MDEditor
                  value={articleForm.content}
                  onChange={value => setArticleForm(prev => ({ ...prev, content: value || '' }))}
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
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={isCreating ? handleCreateArticle : handleUpdateArticle}
            >
              {isCreating ? "Créer l'article" : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoriesDialog
        kind="articles"
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        counts={categoryCounts}
        onChanged={fetchArticles}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer l'article <span className="font-semibold">"{selectedArticle?.title}"</span> ? 
            Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteArticle}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
