export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          created_at: string
          expires_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          expires_at: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          expires_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      history_entries: {
        Row: {
          id: string
          year: number
          /** Libellé libre affiché au-dessus du titre : « Juin », « 9 novembre », « Aujourd'hui » */
          month_label: string | null
          /** 1–12, départage les dates d'une même année (tri) */
          sort_month: number | null
          title: string
          /** 160 caractères max (contrainte CHECK) */
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          year: number
          month_label?: string | null
          sort_month?: number | null
          title: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          year?: number
          month_label?: string | null
          sort_month?: number | null
          title?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_groups: {
        Row: {
          id: string
          title: string
          position: number
        }
        Insert: {
          id?: string
          title: string
          position?: number
        }
        Update: {
          id?: string
          title?: string
          position?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          group_id: string
          name: string
          role: string
          /** URL de la photo ; NULL = initiales sur fond beige */
          photo: string | null
          position: number
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          role: string
          photo?: string | null
          position?: number
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          role?: string
          photo?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "team_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      article_categories: {
        Row: {
          id: string
          name: string
          /** Ordre des filtres sur /articles */
          position: number
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          position?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          position?: number
          created_at?: string | null
        }
        Relationships: []
      }
      articles: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string
          content: string
          image: string
          category: string
          date: string
          published: boolean
          created_at: string
          updated_at: string
          /** Catégorie (table article_categories, gérée dans l'admin) */
          category_id: string | null
          /** « À la une » : un seul article à la fois (index unique) */
          is_featured: boolean
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt: string
          content: string
          image: string
          category: string
          date: string
          published?: boolean
          created_at?: string
          updated_at?: string
          category_id?: string | null
          is_featured?: boolean
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string
          content?: string
          image?: string
          category?: string
          date?: string
          published?: boolean
          created_at?: string
          updated_at?: string
          category_id?: string | null
          is_featured?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          id: string
          title: string
          description: string
          date: string
          time: string
          location: string
          image: string
          published: boolean
          created_at: string
          updated_at: string
          slug: string
          registration_url: string | null
          helloasso_form_slug: string | null
          helloasso_form_type: string
          /** Jauge saisie dans l'admin, prioritaire sur helloasso_capacity */
          ticket_capacity: number | null
          /** Somme des limites de tarifs HelloAsso (sync-events) */
          helloasso_capacity: number | null
          tickets_sold: number | null
          tickets_sold_discounted: number | null
          ticket_member_discount: boolean
          /** Colonne calculée par Postgres (COALESCE(ticket_capacity, helloasso_capacity) - tickets_sold) : lecture seule. */
          tickets_remaining: number | null
          ticket_prices: Json | null
          helloasso_synced_at: string | null
          /** Ouverture des ventes HelloAsso : déclenche la publication (une fois) */
          helloasso_sale_start_date: string | null
          /** Fin des ventes HelloAsso : au-delà, « Inscriptions closes » */
          helloasso_sale_end_date: string | null
          /** Date de la publication automatique par la synchro */
          helloasso_auto_published_at: string | null
          /** Coordonnées du lieu (géocodage OpenStreetMap), NULL si adresse introuvable */
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          date: string
          time: string
          location: string
          image: string
          published?: boolean
          created_at?: string
          updated_at?: string
          slug: string
          registration_url?: string | null
          helloasso_form_slug?: string | null
          helloasso_form_type?: string
          ticket_capacity?: number | null
          helloasso_capacity?: number | null
          tickets_sold?: number | null
          tickets_sold_discounted?: number | null
          ticket_member_discount?: boolean
          ticket_prices?: Json | null
          helloasso_synced_at?: string | null
          helloasso_sale_start_date?: string | null
          helloasso_sale_end_date?: string | null
          helloasso_auto_published_at?: string | null
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          date?: string
          time?: string
          location?: string
          image?: string
          published?: boolean
          created_at?: string
          updated_at?: string
          slug?: string
          registration_url?: string | null
          helloasso_form_slug?: string | null
          helloasso_form_type?: string
          ticket_capacity?: number | null
          helloasso_capacity?: number | null
          tickets_sold?: number | null
          tickets_sold_discounted?: number | null
          ticket_member_discount?: boolean
          ticket_prices?: Json | null
          helloasso_synced_at?: string | null
          helloasso_sale_start_date?: string | null
          helloasso_sale_end_date?: string | null
          helloasso_auto_published_at?: string | null
          latitude?: number | null
          longitude?: number | null
        }
        Relationships: []
      }
      gallery_albums: {
        Row: {
          id: string
          title: string
          description: string
          cover_image: string
          created_at: string
          updated_at: string
          date: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          cover_image: string
          created_at?: string
          updated_at?: string
          date: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          cover_image?: string
          created_at?: string
          updated_at?: string
          date?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          id: string
          album_id: string
          image_url: string
          order: number
          created_at: string
          updated_at: string
          title: string | null
          description: string | null
        }
        Insert: {
          id?: string
          album_id: string
          image_url: string
          order?: number
          created_at?: string
          updated_at?: string
          title?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          album_id?: string
          image_url?: string
          order?: number
          created_at?: string
          updated_at?: string
          title?: string | null
          description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          }
        ]
      }
      contact_tickets: {
        Row: {
          id: number
          name: string
          email: string
          subject: string
          message: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          email: string
          subject: string
          message: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          email?: string
          subject?: string
          message?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          id: string
          name: string
          logo: string | null
          description: string | null
          website: string | null
          type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo?: string | null
          description?: string | null
          website?: string | null
          type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo?: string | null
          description?: string | null
          website?: string | null
          type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: number
          hero_image: string | null
          hero_link: string | null
          shop_url: string | null
          membership_url: string | null
          monsieur_ours_hero_image: string | null
          hero_image_width: number | null
          hero_image_height: number | null
          updated_at: string
        }
        Insert: {
          id?: number
          hero_image?: string | null
          hero_link?: string | null
          shop_url?: string | null
          membership_url?: string | null
          monsieur_ours_hero_image?: string | null
          hero_image_width?: number | null
          hero_image_height?: number | null
          updated_at?: string
        }
        Update: {
          id?: number
          hero_image?: string | null
          hero_link?: string | null
          shop_url?: string | null
          membership_url?: string | null
          monsieur_ours_hero_image?: string | null
          hero_image_width?: number | null
          hero_image_height?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      monsieur_ours_timeline: {
        Row: {
          id: string
          year: number
          title: string
          description: string | null
          image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          year: number
          title: string
          description?: string | null
          image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          year?: number
          title?: string
          description?: string | null
          image?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}