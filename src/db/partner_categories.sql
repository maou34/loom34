-- Page Partenaires (refonte, étape 8) : catégories gérées dans l'admin, ville, adresse.
-- -----------------------------------------------------------------------------
-- Décision (SPEC § 9, 18/11/2026) : les catégories ne sont pas une liste fixe,
-- elles se gèrent dans l'admin (« Gérer les catégories »), comme pour les articles.
-- `description` reste le texte de l'avantage adhérent ; `type` le genre
-- d'établissement (« Restaurant », « Sauna gay »…).
--
-- À coller dans l'éditeur SQL Supabase. Idempotent.

-- 1. Catégories --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    position   INTEGER NOT NULL DEFAULT 0,          -- ordre des filtres sur /partners
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.partner_categories (name, position) VALUES
    ('Saunas', 1), ('Restaurants & bars', 2), ('Hébergement', 3),
    ('Bien-être', 4), ('Boutiques', 5), ('Services', 6)
ON CONFLICT (name) DO NOTHING;

-- 2. Colonnes sur partners -----------------------------------------------------------------
ALTER TABLE public.partners
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.partner_categories(id) ON DELETE SET NULL;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS city    TEXT;   -- filtre « Ville » et « Restaurant · Nîmes »
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS address TEXT;   -- lien « Itinéraire » (absent sans adresse)
CREATE INDEX IF NOT EXISTS partners_category_id_idx ON public.partners (category_id);

-- 3. Remise en ordre des données existantes (une seule fois : seulement si vides) -------------
-- Deux partenaires avaient leur adresse dans le champ « type ».
UPDATE public.partners SET address = type, type = 'Restaurant', city = 'Nîmes'
WHERE name = 'Au Bon Endroit' AND address IS NULL AND type ILIKE '%victor hugo%';
UPDATE public.partners SET address = type, type = 'Bar / club', city = 'Nîmes'
WHERE name = 'Dancin''' AND address IS NULL AND type ILIKE '%thoumayne%';
-- Villes connues d'après les descriptions
UPDATE public.partners SET city = 'Nîmes'  WHERE name = 'Inn4Bears'         AND city IS NULL;
UPDATE public.partners SET city = 'Condom' WHERE name = 'Bears n Breakfast' AND city IS NULL;

-- Catégorie de départ d'après le type actuel (à corriger ensuite dans l'admin si besoin)
UPDATE public.partners AS p
SET category_id = c.id
FROM public.partner_categories AS c
WHERE p.category_id IS NULL
  AND c.name = CASE
      WHEN p.type ILIKE '%sauna%'                                   THEN 'Saunas'
      WHEN p.type ILIKE ANY (ARRAY['%restaurant%', '%crêperie%', '%bar%', '%pub%', '%club%']) THEN 'Restaurants & bars'
      WHEN p.type ILIKE '%chambre%' OR p.type ILIKE '%gîte%' OR p.type ILIKE '%hôtel%' THEN 'Hébergement'
      WHEN p.type ILIKE '%esthétique%' OR p.type ILIKE '%soin%' OR p.type ILIKE '%massage%' THEN 'Bien-être'
      WHEN p.type ILIKE ANY (ARRAY['%boutique%', '%shop%', '%créateur%'])    THEN 'Boutiques'
      ELSE 'Services'
  END;

-- 4. Sécurité : lecture publique, écriture réservée aux admins --------------------------------
-- (partners a déjà la RLS depuis rls_lockdown.sql ; seule la nouvelle table est concernée.)
ALTER TABLE public.partner_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read partner categories" ON public.partner_categories;
CREATE POLICY "Public can read partner categories"
    ON public.partner_categories
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "LOOM admins manage partner_categories" ON public.partner_categories;
CREATE POLICY "LOOM admins manage partner_categories"
    ON public.partner_categories
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

GRANT SELECT ON public.partner_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.partner_categories TO authenticated;
GRANT ALL ON public.partner_categories TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.partner_categories FROM anon;

-- Contrôle :
--   SELECT p.name, p.type, p.city, c.name AS categorie FROM public.partners p
--   LEFT JOIN public.partner_categories c ON c.id = p.category_id ORDER BY c.position, p.name;
