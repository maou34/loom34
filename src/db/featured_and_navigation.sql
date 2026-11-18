-- Admin « Page d'accueil » et « Navigation » (refonte, étape 9).
-- -----------------------------------------------------------------------------
-- 1. Élément mis en avant sur l'accueil : un événement, un article ou un lien
--    externe. Pour un événement ou un article, on stocke son id (le lien « suit »
--    l'élément même s'il est renommé) ; pour un lien externe, hero_link + hero_image.
-- 2. Navigation : afficher ou masquer les boutons Boutique / Adhésion du menu.
--
-- À coller dans l'éditeur SQL Supabase. Idempotent.

ALTER TABLE public.site_settings
    ADD COLUMN IF NOT EXISTS featured_kind TEXT CHECK (featured_kind IN ('event', 'article', 'url'));
ALTER TABLE public.site_settings
    ADD COLUMN IF NOT EXISTS featured_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.site_settings
    ADD COLUMN IF NOT EXISTS featured_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS show_shop_link       BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS show_membership_link BOOLEAN NOT NULL DEFAULT true;

-- Reprise du réglage actuel (hero_link) : …/events/<slug> → événement,
-- …/articles/<slug> → article, sinon lien externe. Une seule fois (featured_kind vide).
UPDATE public.site_settings s
SET featured_kind = 'event', featured_event_id = e.id
FROM public.events e
WHERE s.id = 1 AND s.featured_kind IS NULL
  AND s.hero_link ~ '/events/[^/?#]+'
  AND e.slug = substring(s.hero_link from '/events/([^/?#]+)');

UPDATE public.site_settings s
SET featured_kind = 'article', featured_article_id = a.id
FROM public.articles a
WHERE s.id = 1 AND s.featured_kind IS NULL
  AND s.hero_link ~ '/articles/[^/?#]+'
  AND a.slug = substring(s.hero_link from '/articles/([^/?#]+)');

UPDATE public.site_settings
SET featured_kind = 'url'
WHERE id = 1 AND featured_kind IS NULL AND coalesce(hero_link, '') <> '';

-- Pas de nouvelle policy : site_settings a déjà la RLS (lecture publique, écriture admin).
