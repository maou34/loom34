-- Rendez-vous réguliers (apéros mensuels) modifiables dans l'admin Événements.
--
-- Avant : écrits en dur dans le code (src/components/site/regularMeetups.ts),
-- affichés dans l'encadré « Nos rendez-vous réguliers » de l'accueil et de
-- l'agenda. Après : liste JSON sur la ligne unique site_settings (id = 1),
-- comme monsieur_ours_steps. NULL = valeurs par défaut du code.
--
-- Format : [{ "day": "1ᵉʳ vendredi", "time": "19:00",
--             "title": "Apérours au Coxx", "text": "Happy hour prolongée…" }, …]
--
-- Pas de nouvelle policy : site_settings est déjà en lecture publique et en
-- écriture réservée aux admins.

ALTER TABLE public.site_settings
    ADD COLUMN IF NOT EXISTS regular_meetups jsonb;

ALTER TABLE public.site_settings
    DROP CONSTRAINT IF EXISTS site_settings_regular_meetups_is_array;
ALTER TABLE public.site_settings
    ADD CONSTRAINT site_settings_regular_meetups_is_array
    CHECK (regular_meetups IS NULL OR jsonb_typeof(regular_meetups) = 'array');
