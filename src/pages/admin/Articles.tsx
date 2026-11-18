import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Eye, FileText, Search, MoreHorizontal, CheckCircle2, XCircle, Copy, Image as ImageIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { getImageUrl } from "@/config";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

type ListTab = "all" | "published" | "drafts";
const LIST_TABS: { id: ListTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "published", label: "Publiés" },
  { id: "drafts", label: "Brouillons" },
];
const PAGE_SIZE = 20;

function StatusChip({ published }: { published: boolean }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
      {published ? "Publié" : "Brouillon"}
    </span>
  );
}

/** Longueur conseillée du chapô (≈ deux lignes dans les cartes) */
const EXCERPT_MAX = 160;

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
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

  const [searchParams, setSearchParams] = useSearchParams();
  const listTab: ListTab = LIST_TABS.some((t) => t.id === searchParams.get("onglet")) ? (searchParams.get("onglet") as ListTab) : "all";
  const setListTab = (tab: ListTab) => setSearchParams(tab === "all" ? {} : { onglet: tab }, { replace: true });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const tabCounts: Record<ListTab, number> = {
    all: articles.length,
    published: articles.filter((a) => a.published).length,
    drafts: articles.filter((a) => !a.published).length,
  };

  const visibleArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((a) => {
      if (listTab === "published" && !a.published) return false;
      if (listTab === "drafts" && a.published) return false;
      if (categoryFilter === "none" && a.category_id) return false;
      if (categoryFilter !== "all" && categoryFilter !== "none" && a.category_id !== categoryFilter) return false;
      return !q || a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q);
    });
  }, [articles, listTab, categoryFilter, searchQuery]);
  const pageCount = Math.ceil(visibleArticles.length / PAGE_SIZE);
  const pageArticles = visibleArticles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Retour à la première page quand le filtre change
  useEffect(() => setPage(0), [listTab, categoryFilter, searchQuery]);

  async function fetchArticles() {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('articles')
        .select('id, title, category, date, published, slug, content, excerpt, image, category_id, is_featured, article_categories(name)')
        .order('date', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
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
      month: 'short',
      day: 'numeric'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArticleForm({ ...articleForm, [name]: value });
    
    // Adresse calculée depuis le titre à la création ou tant que le contenu n'est pas
    
    // publié ; une fois publié, son adresse ne change plus toute seule (liens partagés).
    
    if (name === "title" && (isCreating || !selectedArticle?.published)) {
    
      setArticleForm(prev => ({ ...prev, slug: slugify(value) }));
    
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

  // « Créer » depuis le tableau de bord : /admin/…?nouveau=1 ouvre directement le formulaire
  useEffect(() => {
    if (!searchParams.has("nouveau")) return;
    resetForm();
    setSearchParams(
      (params) => {
        params.delete("nouveau");
        return params;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const duplicateArticle = (article: Article) => {
    setSelectedArticle(null);
    setArticleForm({
      title: `${article.title} (copie)`,
      category_id: article.category_id ?? "",
      is_featured: false,
      excerpt: article.excerpt,
      content: article.content,
      image: article.image,
      published: false,
      slug: `${article.slug}-copie-${Date.now().toString(36)}`,
      date: ""
    });
    setIsCreating(true);
    setDialogOpen(true);
    toast.info("Article dupliqué en brouillon : pensez à changer le titre et l'adresse");
  };

  /** Publier / mettre en brouillon directement depuis la liste. */
  const togglePublished = async (article: Article) => {
    const published = !article.published;
    const setPublished = (value: boolean) =>
      setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, published: value } : a)));
    setTogglingId(article.id);
    setPublished(published);
    try {
      const { error } = await db.from('articles').update({ published, updated_at: new Date().toISOString() }).eq('id', article.id);
      if (error) throw error;
      toast.success(published ? `« ${article.title} » est publié` : `« ${article.title} » est repassé en brouillon`);
    } catch (error: unknown) {
      setPublished(article.published);
      toast.error("Erreur lors du changement de statut : " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = (article: Article) => {
    setSelectedArticle(article);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout
      title="Articles"
      actions={
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={resetForm}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Nouvel article</span>
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filtrer par statut" className="flex gap-1 rounded-xl bg-loom-surface-2 p-1 ring-1 ring-loom-border">
            {LIST_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={listTab === t.id}
                onClick={() => setListTab(t.id)}
                className={`h-9 rounded-[9px] px-3.5 text-sm ${listTab === t.id ? "bg-loom-surface font-bold shadow-sm" : "text-loom-text-2 hover:text-loom-text"}`}
              >
                {t.label} <span className="text-loom-text-muted">({tabCounts[t.id]})</span>
              </button>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-52">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger aria-label="Filtrer par catégorie">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="none">Sans catégorie</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Rechercher un article</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-loom-text-muted" />
              <Input type="search" placeholder="Rechercher un article…" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-loom-border-strong px-4 py-12 text-center">
            <FileText aria-hidden="true" className="h-8 w-8 text-loom-text-muted" />
            <p className="font-bold">{searchQuery || categoryFilter !== "all" ? "Aucun article ne correspond" : listTab === "drafts" ? "Aucun brouillon" : "Aucun article"}</p>
            {listTab === "all" && !searchQuery && categoryFilter === "all" && (
              <Button onClick={resetForm} variant="outline" className="mt-2">
                Créer un article
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {pageArticles.map((article) => (
                <li key={article.id} className="flex items-center gap-3 rounded-xl border border-loom-border bg-loom-surface p-2.5 pr-1.5 sm:gap-4 sm:p-3">
                  <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg bg-loom-surface-2 text-loom-text-muted">
                    {article.image && !article.image.includes("placehold.co") ? (
                      <img src={getImageUrl(article.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </span>
                  <button type="button" onClick={() => editArticle(article)} className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{article.title}</span>
                      {article.is_featured && <Star className="h-3.5 w-3.5 flex-none fill-current text-loom-accent-text" aria-label="À la une" />}
                    </span>
                    <span className="hidden truncate text-xs text-loom-text-muted sm:block">/articles/{article.slug}</span>
                    <span className="truncate text-sm text-loom-text-muted sm:hidden">
                      {article.article_categories?.name ?? "Sans catégorie"} · {formatDate(article.date)}
                    </span>
                    <span className="mt-1 sm:hidden">
                      <StatusChip published={article.published} />
                    </span>
                  </button>
                  <span className="hidden w-40 flex-none truncate text-sm md:block">
                    {article.article_categories ? (
                      <span className="rounded-full bg-loom-surface-2 px-2 py-0.5 text-xs font-semibold text-loom-text-2">{article.article_categories.name}</span>
                    ) : (
                      <span className="text-xs text-loom-text-muted">Sans catégorie</span>
                    )}
                  </span>
                  <span className="hidden w-24 flex-none text-sm text-loom-text-muted sm:block">{formatDate(article.date)}</span>
                  <span className="hidden w-20 flex-none text-right sm:block">
                    <StatusChip published={article.published} />
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-11 w-11 flex-none p-0" aria-label={`Actions pour « ${article.title} » : modifier, dupliquer, voir sur le site, supprimer`}>
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => editArticle(article)}>
                        <Edit className="mr-2 h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateArticle(article)}>
                        <Copy className="mr-2 h-4 w-4" /> Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/articles/${article.slug}`} target="_blank">
                          <Eye className="mr-2 h-4 w-4" /> Voir sur le site
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePublished(article)} disabled={togglingId === article.id}>
                        {article.published ? (
                          <><XCircle className="mr-2 h-4 w-4" /> Mettre en brouillon</>
                        ) : (
                          <><CheckCircle2 className="mr-2 h-4 w-4" /> Publier</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmDelete(article)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
            {pageCount > 1 && (
              <nav aria-label="Pagination des articles" className="flex items-center justify-between gap-3 text-sm text-loom-text-muted">
                <span aria-live="polite">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visibleArticles.length)} sur {visibleArticles.length} articles
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Précédent
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
                    Suivant
                  </Button>
                </div>
              </nav>
            )}
          </div>
        )}

        <button type="button" onClick={() => setCategoriesOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-loom-accent-text hover:underline">
          <Tags aria-hidden="true" className="h-4 w-4" /> Gérer les catégories →
        </button>
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
                <Label htmlFor="slug">Adresse de la page sur le site</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={articleForm.slug}
                  onChange={handleInputChange}
                  onBlur={() => setArticleForm(prev => ({ ...prev, slug: slugify(prev.slug) }))}
                  placeholder="url-de-l-article"
                />
                <p className="text-xs text-loom-text-muted">
                  lgbt-loom.fr/articles/<span className="font-medium">{articleForm.slug || "…"}</span>
                  {!isCreating && selectedArticle?.published && " — la changer garde l'ancienne adresse en redirection"}
                </p>
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
