-- Suppression de la RPC public.delete_user(uuid).
-- Elle servait à l'ancien écran « Utilisateurs » de l'admin ; depuis la refonte
-- (en ligne le 20/11/2026), les comptes sont gérés par l'Edge Function admin-users
-- (auth.admin.deleteUser avec la clé service). Plus aucun code ne l'appelle, et une
-- fonction SECURITY DEFINER qui supprime des comptes est une surface d'attaque inutile.
DROP FUNCTION IF EXISTS public.delete_user(uuid);
