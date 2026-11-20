-- Données de la copie LOCALE de Supabase (supabase start / npm run db:reset).
-- Jamais appliqué à la prod. Contenu fictif uniquement : aucune donnée réelle,
-- aucun vrai compte, aucun vrai secret.

-- 1. Secrets Vault de l'instance locale (valeurs de développement, à reprendre
--    dans supabase/functions/.env pour que les fonctions les acceptent)
SELECT vault.create_secret('http://kong:8000', 'project_url');
SELECT vault.create_secret('local-sync-secret', 'sync_events_secret');
SELECT vault.create_secret('local-notify-secret', 'notify_message_secret');

-- 2. Compte admin de test : admin@loom.local / loom-local-admin
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
    '00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'admin@loom.local',
    extensions.crypt('loom-local-admin', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Local"}', now(), now(),
    '', '', '', ''
);
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
VALUES (
    gen_random_uuid(), '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
    '{"sub":"11111111-1111-4111-8111-111111111111","email":"admin@loom.local","email_verified":true}',
    'email', now(), now(), now()
);
-- Le profil est créé par le trigger on_auth_user_created_profile
UPDATE public.profiles SET is_admin = true, notify_on_message = true WHERE id = '11111111-1111-4111-8111-111111111111';

-- 3. Réglages du site
INSERT INTO public.site_settings (id, hero_image, hero_link, shop_url, membership_url, featured_kind)
VALUES (1, '/loom_logo_square.jpg', NULL, 'https://example.org/boutique', 'https://example.org/adhesion', NULL);

-- 4. Catégories
INSERT INTO public.article_categories (id, name, position) VALUES
    ('a0000000-0000-4000-8000-000000000001', 'Vie de l''asso', 0),
    ('a0000000-0000-4000-8000-000000000002', 'Événements', 1);
INSERT INTO public.partner_categories (id, name, position) VALUES
    ('b0000000-0000-4000-8000-000000000001', 'Bars', 0),
    ('b0000000-0000-4000-8000-000000000002', 'Commerces', 1);

-- 5. Événements (dates relatives : toujours « à venir » après un db:reset)
INSERT INTO public.events (title, description, date, time, location, image, slug, published) VALUES
    ('Apéro du mois (test)', 'Un apéro **fictif** pour tester l''agenda.',
     to_char(current_date + 7, 'YYYY-MM-DD'), '19h00', 'Bar Fictif, 1 rue de l''Exemple 34000 Montpellier',
     '/loom_logo_square.jpg', 'apero-du-mois-test', true),
    ('Soirée de test', 'Une soirée fictive.' || E'\n\n' || '- avec une liste' || E'\n' || '- en Markdown',
     to_char(current_date + 21, 'YYYY-MM-DD'), '21h00', 'Salle Fictive, 34000 Montpellier',
     '/loom_logo_square.jpg', 'soiree-de-test', true),
    ('Brouillon d''événement', 'Pas encore publié.',
     to_char(current_date + 40, 'YYYY-MM-DD'), '20h00', 'Nîmes',
     '/loom_logo_square.jpg', 'brouillon-d-evenement', false);

-- 6. Articles
INSERT INTO public.articles (title, excerpt, content, image, category, category_id, slug, published, is_featured, date) VALUES
    ('Article de test', 'Le chapô de l''article de test.', '## Un intertitre' || E'\n\n' || 'Du texte fictif.',
     '/loom_logo_square.jpg', 'Vie de l''asso', 'a0000000-0000-4000-8000-000000000001', 'article-de-test', true, true, now() - interval '2 days'),
    ('Deuxième article', 'Un autre chapô.', 'Encore du texte fictif.',
     '/loom_logo_square.jpg', 'Événements', 'a0000000-0000-4000-8000-000000000002', 'deuxieme-article', true, false, now() - interval '10 days'),
    ('Article en brouillon', 'Pas publié.', 'Brouillon.',
     '/loom_logo_square.jpg', 'Vie de l''asso', 'a0000000-0000-4000-8000-000000000001', 'article-en-brouillon', false, false, now());

-- 7. Partenaires
INSERT INTO public.partners (name, logo, description, website, type, category_id, city, address) VALUES
    ('Bar Fictif', '/loom_logo_square.jpg', '10 % sur les consommations', 'https://example.org', 'Bar',
     'b0000000-0000-4000-8000-000000000001', 'Montpellier', '1 rue de l''Exemple, 34000 Montpellier'),
    ('Boutique Exemple', NULL, 'Une remise fictive', NULL, 'Boutique',
     'b0000000-0000-4000-8000-000000000002', NULL, NULL);

-- 8. L'asso : histoire et équipe
INSERT INTO public.history_entries (year, month_label, sort_month, title, body) VALUES
    (2020, 'Mars', 3, 'Création (test)', 'Une étape fictive de l''histoire.'),
    (2024, NULL, NULL, 'Une autre étape', 'Toujours fictive.');
INSERT INTO public.team_groups (id, title, position) VALUES ('c0000000-0000-4000-8000-000000000001', 'Le bureau', 0);
INSERT INTO public.team_members (group_id, name, role, position) VALUES
    ('c0000000-0000-4000-8000-000000000001', 'Ours Test', 'Président', 0),
    ('c0000000-0000-4000-8000-000000000001', 'Ourson Test', 'Trésorier', 1);

-- 9. Monsieur Ours
INSERT INTO public.monsieur_ours_timeline (year, title, description, cub1_name) VALUES
    (2025, 'Lauréat Fictif', 'Légende de test.', 'Ourson Fictif');

-- 10. Un message de contact fictif (boîte « Messages » de l'admin)
INSERT INTO public.contact_tickets (name, email, subject, message)
VALUES ('Visiteur Test', 'visiteur@example.org', 'Message de test', 'Bonjour, ceci est un message fictif.');
