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

  // Loading session bootstrap
  isLoading: boolean;

  // Loading profile fetch (admin check relies on it)
  isProfileLoading: boolean;

  isAuthenticated: boolean;
  isAdmin: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;

  refreshProfile: () => Promise<void>;
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const mountedRef = useRef(true);
  const refreshSeq = useRef(0);

  const refreshProfile = async (s?: Session | null) => {
    const seq = ++refreshSeq.current;

    const currentSession = s ?? session;
    const userId = currentSession?.user?.id;

    if (!userId) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    try {
      const { data, error: profileError } = await db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!mountedRef.current || seq !== refreshSeq.current) return;

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setProfile(null);
        return;
      }

      // IMPORTANT: si la réponse est vide, le profil n'existe pas en DB.
      // On reste authentifié, mais pas admin tant que la ligne profiles n'est pas créée.
      setProfile(data || null);
    } catch (e) {
      if (!mountedRef.current || seq !== refreshSeq.current) return;
      console.error("Profile fetch crashed:", e);
      setProfile(null);
    } finally {
      if (mountedRef.current && seq === refreshSeq.current) {
        setIsProfileLoading(false);
      }
    }
  };

  // Initialisation + listener login/logout
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

        // Ne bloque pas le bootstrap sur le profil
        refreshProfile(initialSession);
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
    } = db.auth.onAuthStateChange((_event, newSession) => {
      // Ne bloque pas l'UI sur le profil (évite spinner infini)
      setSession(newSession);
      refreshProfile(newSession);
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
      refreshProfile(data.session);

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
        isProfileLoading,

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

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};