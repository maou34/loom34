


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."delete_user"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
    END IF;
    IF user_id = auth.uid() THEN
        RAISE EXCEPTION 'Impossible de supprimer son propre compte' USING ERRCODE = '42501';
    END IF;
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."delete_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_username text;
  v_full_name text;
begin
  v_username := nullif(trim(new.raw_user_meta_data->>'username'), '');
  v_full_name := nullif(trim(new.raw_user_meta_data->>'full_name'), '');

  insert into public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    is_admin,
    created_at,
    updated_at
  )
  values (
    new.id,
    v_username,
    v_full_name,
    null,
    false,
    now(),
    now()
  )
  on conflict (id) do update
    set username = coalesce(excluded.username, public.profiles.username),
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_contact_ticket"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    BEGIN
        PERFORM net.http_post(
            url := 'https://abqhawhalbrqgtepaclc.supabase.co/functions/v1/notify-new-message',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_message_secret')
            ),
            body := jsonb_build_object('id', NEW.id),
            timeout_milliseconds := 10000
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_new_contact_ticket : %', SQLERRM;
    END;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_contact_ticket"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_is_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    changing boolean := CASE WHEN TG_OP = 'INSERT' THEN coalesce(NEW.is_admin, false)
                             ELSE NEW.is_admin IS DISTINCT FROM OLD.is_admin END;
BEGIN
    IF changing
       AND session_user IN ('authenticator', 'supabase_auth_admin')
       AND NOT (
           coalesce(auth.jwt() ->> 'role', '') = 'service_role'
           OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
       ) THEN
        RAISE EXCEPTION 'Seul un administrateur peut changer le statut administrateur' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_profile_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_slug_redirect"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.slug IS DISTINCT FROM OLD.slug AND coalesce(OLD.slug, '') <> '' AND coalesce(NEW.slug, '') <> '' THEN
        -- Les anciennes adresses qui menaient à OLD mènent désormais à NEW (pas de chaîne)
        UPDATE public.slug_redirects SET new_slug = NEW.slug WHERE kind = TG_TABLE_NAME AND new_slug = OLD.slug;
        INSERT INTO public.slug_redirects (kind, old_slug, new_slug)
        VALUES (TG_TABLE_NAME, OLD.slug, NEW.slug)
        ON CONFLICT (kind, old_slug) DO UPDATE SET new_slug = EXCLUDED.new_slug, created_at = CURRENT_TIMESTAMP;
        -- L'adresse NEW est de nouveau vivante : plus de redirection depuis elle
        DELETE FROM public.slug_redirects WHERE kind = TG_TABLE_NAME AND old_slug = NEW.slug;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."record_slug_redirect"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify"("t" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
    SELECT trim(both '-' FROM regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', '-', 'g'));
$$;


ALTER FUNCTION "public"."slugify"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."article_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."article_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "excerpt" "text" NOT NULL,
    "content" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image" "text" NOT NULL,
    "category" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid",
    "category_id" "uuid",
    "is_featured" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_tickets" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'Nouveau'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "contact_tickets_status_check" CHECK (("status" = ANY (ARRAY['Nouveau'::"text", 'En attente'::"text", 'Répondu'::"text", 'Fermé'::"text"])))
);


ALTER TABLE "public"."contact_tickets" OWNER TO "postgres";


ALTER TABLE "public"."contact_tickets" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."contact_tickets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "date" "text" NOT NULL,
    "time" "text" NOT NULL,
    "location" "text" NOT NULL,
    "image" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "registration_url" "text",
    "published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid",
    "helloasso_form_slug" "text",
    "helloasso_form_type" "text" DEFAULT 'Event'::"text" NOT NULL,
    "ticket_capacity" integer,
    "tickets_sold" integer,
    "ticket_prices" "jsonb",
    "helloasso_synced_at" timestamp with time zone,
    "tickets_sold_discounted" integer,
    "ticket_member_discount" boolean DEFAULT false NOT NULL,
    "helloasso_capacity" integer,
    "tickets_remaining" integer GENERATED ALWAYS AS (
CASE
    WHEN ((COALESCE("ticket_capacity", "helloasso_capacity") IS NULL) OR ("tickets_sold" IS NULL)) THEN NULL::integer
    ELSE GREATEST((COALESCE("ticket_capacity", "helloasso_capacity") - "tickets_sold"), 0)
END) STORED,
    "helloasso_sale_start_date" timestamp with time zone,
    "helloasso_sale_end_date" timestamp with time zone,
    "helloasso_auto_published_at" timestamp with time zone,
    "latitude" double precision,
    "longitude" double precision
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gallery_albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "cover_image" "text" NOT NULL,
    "date" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid"
);


ALTER TABLE "public"."gallery_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gallery_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid",
    "album_id" "uuid"
);


ALTER TABLE "public"."gallery_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."helloasso_token" (
    "id" smallint DEFAULT 1 NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "refresh_expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "helloasso_token_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."helloasso_token" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."history_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "month_label" "text",
    "sort_month" integer,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "history_entries_body_check" CHECK (("char_length"("body") <= 160)),
    CONSTRAINT "history_entries_sort_month_check" CHECK ((("sort_month" >= 1) AND ("sort_month" <= 12))),
    CONSTRAINT "history_entries_year_check" CHECK ((("year" >= 1990) AND ("year" <= 2100)))
);


ALTER TABLE "public"."history_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monsieur_ours_timeline" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "cub1_name" "text",
    "cub1_photo" "text",
    "cub2_name" "text",
    "cub2_photo" "text"
);


ALTER TABLE "public"."monsieur_ours_timeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."partner_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo" "text",
    "description" "text",
    "website" "text",
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "category_id" "uuid",
    "city" "text",
    "address" "text"
);


ALTER TABLE "public"."partners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photo_albums" (
    "album_id" "text" NOT NULL,
    "title" "text",
    "album_date" "date",
    "cover_image" "text",
    "event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."photo_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notify_on_message" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" smallint DEFAULT 1 NOT NULL,
    "hero_image" "text",
    "hero_link" "text",
    "shop_url" "text",
    "membership_url" "text",
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "monsieur_ours_hero_image" "text",
    "hero_image_width" integer,
    "hero_image_height" integer,
    "monsieur_ours_intro" "text",
    "monsieur_ours_photos_url" "text",
    "monsieur_ours_steps" "jsonb",
    "monsieur_ours_cta" "text",
    "featured_kind" "text",
    "featured_event_id" "uuid",
    "featured_article_id" "uuid",
    "show_shop_link" boolean DEFAULT true NOT NULL,
    "show_membership_link" boolean DEFAULT true NOT NULL,
    CONSTRAINT "site_settings_featured_kind_check" CHECK (("featured_kind" = ANY (ARRAY['event'::"text", 'article'::"text", 'url'::"text"]))),
    CONSTRAINT "site_settings_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slug_redirects" (
    "kind" "text" NOT NULL,
    "old_slug" "text" NOT NULL,
    "new_slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "slug_redirects_kind_check" CHECK (("kind" = ANY (ARRAY['events'::"text", 'articles'::"text"])))
);


ALTER TABLE "public"."slug_redirects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."team_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "photo" "text",
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


ALTER TABLE ONLY "public"."article_categories"
    ADD CONSTRAINT "article_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."article_categories"
    ADD CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."contact_tickets"
    ADD CONSTRAINT "contact_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."gallery_albums"
    ADD CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_images"
    ADD CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helloasso_token"
    ADD CONSTRAINT "helloasso_token_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."history_entries"
    ADD CONSTRAINT "history_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monsieur_ours_timeline"
    ADD CONSTRAINT "monsieur_ours_timeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_categories"
    ADD CONSTRAINT "partner_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."partner_categories"
    ADD CONSTRAINT "partner_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photo_albums"
    ADD CONSTRAINT "photo_albums_pkey" PRIMARY KEY ("album_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slug_redirects"
    ADD CONSTRAINT "slug_redirects_pkey" PRIMARY KEY ("kind", "old_slug");



ALTER TABLE ONLY "public"."team_groups"
    ADD CONSTRAINT "team_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



CREATE INDEX "articles_category_id_idx" ON "public"."articles" USING "btree" ("category_id");



CREATE UNIQUE INDEX "articles_one_featured" ON "public"."articles" USING "btree" ((true)) WHERE "is_featured";



CREATE UNIQUE INDEX "events_helloasso_form_slug_key" ON "public"."events" USING "btree" ("helloasso_form_slug") WHERE ("helloasso_form_slug" IS NOT NULL);



CREATE UNIQUE INDEX "monsieur_ours_timeline_year_key" ON "public"."monsieur_ours_timeline" USING "btree" ("year");



CREATE INDEX "partners_category_id_idx" ON "public"."partners" USING "btree" ("category_id");



CREATE INDEX "photo_albums_event_id_idx" ON "public"."photo_albums" USING "btree" ("event_id");



CREATE INDEX "team_members_group_id_idx" ON "public"."team_members" USING "btree" ("group_id");



CREATE OR REPLACE TRIGGER "notify_new_contact_ticket" AFTER INSERT ON "public"."contact_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_contact_ticket"();



CREATE OR REPLACE TRIGGER "protect_profile_is_admin" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_is_admin"();



CREATE OR REPLACE TRIGGER "record_slug_redirect" AFTER UPDATE OF "slug" ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."record_slug_redirect"();



CREATE OR REPLACE TRIGGER "record_slug_redirect" AFTER UPDATE OF "slug" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."record_slug_redirect"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_contact_tickets_updated_at" BEFORE UPDATE ON "public"."contact_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_helloasso_token_updated_at" BEFORE UPDATE ON "public"."helloasso_token" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_history_entries_updated_at" BEFORE UPDATE ON "public"."history_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_monsieur_ours_timeline_updated_at" BEFORE UPDATE ON "public"."monsieur_ours_timeline" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_partner_updated_at" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_photo_albums_updated_at" BEFORE UPDATE ON "public"."photo_albums" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_site_settings_updated_at" BEFORE UPDATE ON "public"."site_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."gallery_albums"
    ADD CONSTRAINT "gallery_albums_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."gallery_images"
    ADD CONSTRAINT "gallery_images_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_images"
    ADD CONSTRAINT "gallery_images_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."partner_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."photo_albums"
    ADD CONSTRAINT "photo_albums_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_featured_article_id_fkey" FOREIGN KEY ("featured_article_id") REFERENCES "public"."articles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_featured_event_id_fkey" FOREIGN KEY ("featured_event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."team_groups"("id") ON DELETE RESTRICT;



CREATE POLICY "Admins can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Admins can manage all articles" ON "public"."articles" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage all events" ON "public"."events" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage all gallery images" ON "public"."gallery_images" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage article categories" ON "public"."article_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage monsieur ours timeline" ON "public"."monsieur_ours_timeline" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage site settings" ON "public"."site_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update profiles" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Albums are viewable by everyone" ON "public"."gallery_albums" FOR SELECT USING (true);



CREATE POLICY "Allow admin to insert users" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (( SELECT "profiles_1"."is_admin"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())) = true)));



CREATE POLICY "Anyone can send a contact message" ON "public"."contact_tickets" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Drafts visible to admins only" ON "public"."articles" AS RESTRICTIVE FOR SELECT TO "authenticated", "anon" USING (("published" OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Drafts visible to admins only" ON "public"."events" AS RESTRICTIVE FOR SELECT TO "authenticated", "anon" USING (("published" OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Gallery images are viewable by everyone" ON "public"."gallery_images" FOR SELECT USING (true);



CREATE POLICY "Images are viewable by everyone" ON "public"."gallery_images" FOR SELECT USING (true);



CREATE POLICY "LOOM admins manage articles" ON "public"."articles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage contact_tickets" ON "public"."contact_tickets" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage events" ON "public"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage gallery_albums" ON "public"."gallery_albums" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage gallery_images" ON "public"."gallery_images" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage history_entries" ON "public"."history_entries" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage partner_categories" ON "public"."partner_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage partners" ON "public"."partners" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage photo_albums" ON "public"."photo_albums" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage team_groups" ON "public"."team_groups" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "LOOM admins manage team_members" ON "public"."team_members" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Les administrateurs peuvent mettre à jour le statut admin" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles_1"."id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."is_admin" = true)))) WITH CHECK (("auth"."uid"() IN ( SELECT "profiles_1"."id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."is_admin" = true))));



CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres informati" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK ((("auth"."uid"() = "id") AND ("is_admin" = ( SELECT "profiles_1"."is_admin"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())))));



CREATE POLICY "Only admins can delete albums" ON "public"."gallery_albums" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Only admins can delete images" ON "public"."gallery_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Only admins can insert albums" ON "public"."gallery_albums" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Only admins can insert images" ON "public"."gallery_images" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Only admins can update albums" ON "public"."gallery_albums" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Only admins can update images" ON "public"."gallery_images" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Profiles readable by owner or admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Public can read article categories" ON "public"."article_categories" FOR SELECT USING (true);



CREATE POLICY "Public can read history_entries" ON "public"."history_entries" FOR SELECT USING (true);



CREATE POLICY "Public can read monsieur ours timeline" ON "public"."monsieur_ours_timeline" FOR SELECT USING (true);



CREATE POLICY "Public can read partner categories" ON "public"."partner_categories" FOR SELECT USING (true);



CREATE POLICY "Public can read partners" ON "public"."partners" FOR SELECT USING (true);



CREATE POLICY "Public can read photo albums" ON "public"."photo_albums" FOR SELECT USING (true);



CREATE POLICY "Public can read site settings" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "Public can read slug redirects" ON "public"."slug_redirects" FOR SELECT USING (true);



CREATE POLICY "Public can read team_groups" ON "public"."team_groups" FOR SELECT USING (true);



CREATE POLICY "Public can read team_members" ON "public"."team_members" FOR SELECT USING (true);



CREATE POLICY "Published articles are viewable by everyone" ON "public"."articles" FOR SELECT USING (("published" = true));



CREATE POLICY "Published events are viewable by everyone" ON "public"."events" FOR SELECT USING (("published" = true));



ALTER TABLE "public"."article_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gallery_albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gallery_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."helloasso_token" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."history_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monsieur_ours_timeline" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partner_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photo_albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slug_redirects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































































































































REVOKE ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_new_contact_ticket"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_new_contact_ticket"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_profile_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_profile_is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_slug_redirect"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_slug_redirect"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify"("t" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify"("t" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";







































GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."article_categories" TO "anon";
GRANT ALL ON TABLE "public"."article_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."article_categories" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."contact_tickets" TO "anon";
GRANT ALL ON TABLE "public"."contact_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_tickets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contact_tickets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contact_tickets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contact_tickets_id_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."gallery_albums" TO "anon";
GRANT ALL ON TABLE "public"."gallery_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_albums" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."gallery_images" TO "anon";
GRANT ALL ON TABLE "public"."gallery_images" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_images" TO "service_role";



GRANT ALL ON TABLE "public"."helloasso_token" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."history_entries" TO "anon";
GRANT ALL ON TABLE "public"."history_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."history_entries" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."monsieur_ours_timeline" TO "anon";
GRANT ALL ON TABLE "public"."monsieur_ours_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."monsieur_ours_timeline" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."partner_categories" TO "anon";
GRANT ALL ON TABLE "public"."partner_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_categories" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."partners" TO "anon";
GRANT ALL ON TABLE "public"."partners" TO "authenticated";
GRANT ALL ON TABLE "public"."partners" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."photo_albums" TO "anon";
GRANT ALL ON TABLE "public"."photo_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."photo_albums" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."slug_redirects" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."slug_redirects" TO "authenticated";
GRANT ALL ON TABLE "public"."slug_redirects" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."team_groups" TO "anon";
GRANT ALL ON TABLE "public"."team_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."team_groups" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

drop policy "Drafts visible to admins only" on "public"."articles";

drop policy "Anyone can send a contact message" on "public"."contact_tickets";

drop policy "Drafts visible to admins only" on "public"."events";

revoke delete on table "public"."article_categories" from "anon";

revoke insert on table "public"."article_categories" from "anon";

revoke truncate on table "public"."article_categories" from "anon";

revoke update on table "public"."article_categories" from "anon";

revoke delete on table "public"."articles" from "anon";

revoke insert on table "public"."articles" from "anon";

revoke truncate on table "public"."articles" from "anon";

revoke update on table "public"."articles" from "anon";

revoke delete on table "public"."contact_tickets" from "anon";

revoke select on table "public"."contact_tickets" from "anon";

revoke truncate on table "public"."contact_tickets" from "anon";

revoke update on table "public"."contact_tickets" from "anon";

revoke delete on table "public"."events" from "anon";

revoke insert on table "public"."events" from "anon";

revoke truncate on table "public"."events" from "anon";

revoke update on table "public"."events" from "anon";

revoke delete on table "public"."gallery_albums" from "anon";

revoke insert on table "public"."gallery_albums" from "anon";

revoke truncate on table "public"."gallery_albums" from "anon";

revoke update on table "public"."gallery_albums" from "anon";

revoke delete on table "public"."gallery_images" from "anon";

revoke insert on table "public"."gallery_images" from "anon";

revoke truncate on table "public"."gallery_images" from "anon";

revoke update on table "public"."gallery_images" from "anon";

revoke delete on table "public"."helloasso_token" from "anon";

revoke insert on table "public"."helloasso_token" from "anon";

revoke references on table "public"."helloasso_token" from "anon";

revoke select on table "public"."helloasso_token" from "anon";

revoke trigger on table "public"."helloasso_token" from "anon";

revoke truncate on table "public"."helloasso_token" from "anon";

revoke update on table "public"."helloasso_token" from "anon";

revoke delete on table "public"."helloasso_token" from "authenticated";

revoke insert on table "public"."helloasso_token" from "authenticated";

revoke references on table "public"."helloasso_token" from "authenticated";

revoke select on table "public"."helloasso_token" from "authenticated";

revoke trigger on table "public"."helloasso_token" from "authenticated";

revoke truncate on table "public"."helloasso_token" from "authenticated";

revoke update on table "public"."helloasso_token" from "authenticated";

revoke delete on table "public"."history_entries" from "anon";

revoke insert on table "public"."history_entries" from "anon";

revoke truncate on table "public"."history_entries" from "anon";

revoke update on table "public"."history_entries" from "anon";

revoke delete on table "public"."monsieur_ours_timeline" from "anon";

revoke insert on table "public"."monsieur_ours_timeline" from "anon";

revoke truncate on table "public"."monsieur_ours_timeline" from "anon";

revoke update on table "public"."monsieur_ours_timeline" from "anon";

revoke delete on table "public"."partner_categories" from "anon";

revoke insert on table "public"."partner_categories" from "anon";

revoke truncate on table "public"."partner_categories" from "anon";

revoke update on table "public"."partner_categories" from "anon";

revoke delete on table "public"."partners" from "anon";

revoke insert on table "public"."partners" from "anon";

revoke truncate on table "public"."partners" from "anon";

revoke update on table "public"."partners" from "anon";

revoke delete on table "public"."photo_albums" from "anon";

revoke insert on table "public"."photo_albums" from "anon";

revoke truncate on table "public"."photo_albums" from "anon";

revoke update on table "public"."photo_albums" from "anon";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."site_settings" from "anon";

revoke insert on table "public"."site_settings" from "anon";

revoke truncate on table "public"."site_settings" from "anon";

revoke update on table "public"."site_settings" from "anon";

revoke delete on table "public"."slug_redirects" from "anon";

revoke insert on table "public"."slug_redirects" from "anon";

revoke truncate on table "public"."slug_redirects" from "anon";

revoke update on table "public"."slug_redirects" from "anon";

revoke delete on table "public"."slug_redirects" from "authenticated";

revoke insert on table "public"."slug_redirects" from "authenticated";

revoke truncate on table "public"."slug_redirects" from "authenticated";

revoke update on table "public"."slug_redirects" from "authenticated";

revoke delete on table "public"."team_groups" from "anon";

revoke insert on table "public"."team_groups" from "anon";

revoke truncate on table "public"."team_groups" from "anon";

revoke update on table "public"."team_groups" from "anon";

revoke delete on table "public"."team_members" from "anon";

revoke insert on table "public"."team_members" from "anon";

revoke truncate on table "public"."team_members" from "anon";

revoke update on table "public"."team_members" from "anon";


  create policy "Drafts visible to admins only"
  on "public"."articles"
  as restrictive
  for select
  to anon, authenticated
using ((published OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true))))));



  create policy "Anyone can send a contact message"
  on "public"."contact_tickets"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Drafts visible to admins only"
  on "public"."events"
  as restrictive
  for select
  to anon, authenticated
using ((published OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true))))));


CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Retirés à la main de ce fichier généré par `supabase db pull` (20/11/2026) :
--   - triggers internes de Supabase sur realtime.subscription et storage.buckets /
--     storage.objects (gérés par Supabase lui-même, différents selon les versions) ;
--   - 5 anciennes policies sur storage.objects pour le bucket « gallery » : le site
--     n'utilise plus Supabase Storage (photos sur le serveur d'images).
-- La prod les a toujours ; ils n'ont pas à être recréés ailleurs.
