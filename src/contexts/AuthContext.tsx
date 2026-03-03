import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { db } from "@/db/client";
import { toast } from "sonner";

// Types
export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;
  refreshProfile: () => Promise<void>;
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Permet d'ignorer des réponses "anciennes" (race conditions)
  const refreshSeq = useRef(0);
  const mountedRef = useRef(true);

  const refreshProfile = async (s?: Session | null) => {
    const seq = ++refreshSeq.current;

    const currentSession = s ?? session;
    const userId = currentSession?.user?.id;

    if (!userId) {
      if (mountedRef.current && seq === refreshSeq.current) {
        setProfile(null);
      }
      return;
    }

    const { data, error: profileError } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // Si un refresh plus récent a démarré, on ignore ce résultat
    if (!mountedRef.current || seq !== refreshSeq.current) return;

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      // On ne déconnecte PAS l'utilisateur: on garde l'auth basée sur session.
      setProfile(null);
      return;
    }

    setProfile(data || null);
  };

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        setIsLoading(true);

        const {
          data: { session: initialSession },
          error: sessionError,
        } = await db.auth.getSession();

        if (sessionError) throw sessionError;
        if (!mountedRef.current) return;

        setSession(initialSession);
        await refreshProfile(initialSession);
      } catch (e) {
        console.error("Auth init error:", e);
        if (!mountedRef.current) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(async (_event, newSession) => {
      // Pendant la transition, on évite un redirect "trop tôt"
      if (mountedRef.current) setIsLoading(true);

      try {
        if (!mountedRef.current) return;

        setSession(newSession);
        await refreshProfile(newSession);
      } catch (e) {
        console.error("Auth state change error:", e);
        // Ne pas casser l'app: on retombe sur session/profile actuels
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setSession(data.session);
      await refreshProfile(data.session);

      toast.success("Connexion réussie");
    } catch (e) {
      const authErr = e as AuthError;
      setError(authErr);
      toast.error("Échec de la connexion. Veuillez vérifier vos identifiants.");
      throw authErr;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await db.auth.signOut();
      if (error) throw error;

      setSession(null);
      setProfile(null);
      toast.success("Déconnexion réussie");
    } catch (e) {
      const authErr = e as AuthError;
      setError(authErr);
      toast.error("Erreur lors de la déconnexion");
      throw authErr;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        profile,
        session,
        accessToken: session?.access_token ?? null,
        isLoading,
        // ✅ Auth = session user uniquement (pas le profil)
        isAuthenticated: !!session?.user,
        isAdmin: !!profile?.is_admin,
        signIn,
        signOut,
        error,
        refreshProfile: async () => refreshProfile(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};