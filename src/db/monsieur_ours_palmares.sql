-- Page Monsieur Ours (refonte, étape 6) : palmarès avec oursons + textes de la page.
-- -----------------------------------------------------------------------------
-- Choix : on ÉTEND la table existante monsieur_ours_timeline (une ligne par
-- année : title = nom du lauréat, description = légende, image = portrait)
-- plutôt que de créer la table mister_bear_editions de la proposition : pas de
-- données à migrer, et le site actuel (branche main) continue de fonctionner.
-- La photo de groupe du hero reste site_settings.monsieur_ours_hero_image.
-- « En titre » = l'année la plus récente (pas de colonne dédiée).
--
-- À coller dans l'éditeur SQL Supabase. Idempotent.

-- 1. Les deux oursons de chaque année ---------------------------------------------------
ALTER TABLE public.monsieur_ours_timeline ADD COLUMN IF NOT EXISTS cub1_name  TEXT;
ALTER TABLE public.monsieur_ours_timeline ADD COLUMN IF NOT EXISTS cub1_photo TEXT;
ALTER TABLE public.monsieur_ours_timeline ADD COLUMN IF NOT EXISTS cub2_name  TEXT;
ALTER TABLE public.monsieur_ours_timeline ADD COLUMN IF NOT EXISTS cub2_photo TEXT;

-- Une seule ligne par année (le palmarès et ses ancres #mo-<année> en dépendent).
-- Échoue si des doublons existent déjà : les fusionner d'abord dans l'admin.
CREATE UNIQUE INDEX IF NOT EXISTS monsieur_ours_timeline_year_key ON public.monsieur_ours_timeline (year);

-- 2. Textes de la page (singleton site_settings, id = 1) -----------------------------------
-- La page tutoie (SPEC § 1). NULL = texte par défaut du site.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS monsieur_ours_intro      TEXT;  -- présentation du lauréat (hero)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS monsieur_ours_photos_url TEXT;  -- lien « Les photos de l'élection »
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS monsieur_ours_steps      JSONB; -- [{ "when", "title", "text" }] × 3
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS monsieur_ours_cta        TEXT;  -- texte de « Et si c'était toi en <année> ? »

UPDATE public.site_settings
SET monsieur_ours_steps = '[
  {"when": "Au printemps", "title": "Les candidatures",
   "text": "Envie de te présenter ? Écris-nous : on t''explique comment se déroule la candidature."},
  {"when": "En juin", "title": "L''élection",
   "text": "Lors de la Montpell''Bears, la communauté élit Monsieur Ours et ses oursons."},
  {"when": "Toute l''année", "title": "Une année d''ours",
   "text": "Monsieur Ours et ses oursons représentent LOOM lors de nos soirées et des événements de la communauté."}
]'::jsonb
WHERE id = 1 AND monsieur_ours_steps IS NULL;

UPDATE public.site_settings
SET monsieur_ours_cta = 'Laisse-nous un message : on te prévient dès l''ouverture des candidatures.'
WHERE id = 1 AND monsieur_ours_cta IS NULL;

-- Pas de nouvelle policy : monsieur_ours_timeline et site_settings ont déjà la RLS
-- (lecture publique, écriture admin) ; les nouvelles colonnes suivent ces règles.
