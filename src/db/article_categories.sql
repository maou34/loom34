-- Actualités (refonte, étape 4) : catégories gérées dans l'admin + article « À la une ».
-- -----------------------------------------------------------------------------
-- Décision (SPEC § 9, 18/11/2026) : les catégories ne sont pas une liste fixe
-- dans le code, elles se gèrent dans l'admin (« Gérer les catégories »).
-- Le chapô existe déjà : colonne `articles.excerpt`.
--
-- À coller dans l'éditeur SQL Supabase, puis mettre à jour src/db/types.ts
-- (fait dans le même commit que le code de l'étape 4). Idempotent.

-- 1. Table des catégories --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    position   INTEGER NOT NULL DEFAULT 0,          -- ordre des filtres sur /articles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Colonnes sur articles --------------------------------------------------------
-- Catégorie : supprimer une catégorie laisse ses articles « sans catégorie ».
ALTER TABLE public.articles
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.article_categories(id) ON DELETE SET NULL;
-- « À la une » : choisi dans l'admin ; un seul article à la fois.
ALTER TABLE public.articles
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS articles_one_featured ON public.articles ((true)) WHERE is_featured;
CREATE INDEX IF NOT EXISTS articles_category_id_idx ON public.articles (category_id);

-- 3. Reprise des catégories existantes (texte libre de articles.category) ---------
-- Chaque valeur distincte devient une catégorie, telle quelle : à renommer /
-- fusionner ensuite dans l'admin. L'ancienne colonne `category` (texte) est
-- conservée pour l'instant, sans être affichée ; elle sera supprimée plus tard.
INSERT INTO public.article_categories (name)
SELECT DISTINCT trim(category)
FROM public.articles
WHERE coalesce(trim(category), '') <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE public.articles AS a
SET category_id = c.id
FROM public.article_categories AS c
WHERE a.category_id IS NULL
  AND trim(a.category) = c.name;

-- 4. Sécurité : lecture publique, écriture réservée aux admins ------------------------
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read article categories" ON public.article_categories;
CREATE POLICY "Public can read article categories"
    ON public.article_categories
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage article categories" ON public.article_categories;
CREATE POLICY "Admins can manage article categories"
    ON public.article_categories
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)
    );

-- Sans ces GRANT, même service_role reçoit « permission denied for table … » (cf. CLAUDE.md).
GRANT SELECT ON public.article_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.article_categories TO authenticated;
GRANT ALL ON public.article_categories TO service_role;

-- Contrôle : chaque article qui avait une catégorie doit en avoir une
--   SELECT a.title, a.category, c.name FROM public.articles a
--   LEFT JOIN public.article_categories c ON c.id = a.category_id ORDER BY a.date DESC;
