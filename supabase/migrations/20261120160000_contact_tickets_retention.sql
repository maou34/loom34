-- Durée de conservation des messages du formulaire « Nous écrire » : un an
-- (annoncée dans les mentions légales du site). Un job pg_cron supprime chaque
-- nuit les messages reçus il y a plus d'un an, quel que soit leur statut.
-- cron.schedule remplace un job du même nom : la migration peut être rejouée.

SELECT cron.schedule(
  'purge-old-contact-tickets',
  '30 3 * * *',
  $$DELETE FROM public.contact_tickets WHERE created_at < now() - interval '1 year'$$
);
