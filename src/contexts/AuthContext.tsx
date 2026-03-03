import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
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

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const refreshProfile = async (s?: Session | null) => {
    const currentSession = s ?? session;
    const userId = currentSession?.user?.id;

    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error: profileError } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      // On ne toast pas ici pour éviter du bruit à chaque refresh/onglet
      setProfile(null);
      return;
    }

    setProfile(data || null);
  };

  // Initialisation + listener login/logout
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setIsLoading(true);

        const {
          data: { session: initialSession},
          error: sessionError,
        } = await db.auth.getSession();

        console.log("initialSession", initialSession);

        if (sessionError) throw sessionError;

        if (!mounted) return;

        setSession(initialSession);
        await refreshProfile(initialSession);
      } catch (e) {
        console.error("Auth init error:", e);
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      // Important: toujours rafraîchir le profile en fonction de la nouvelle session
      await refreshProfile(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setSession(data.session);

      // On rafraîchit le profile à partir de la session retournée
      await refreshProfile(data.session);

      toast.success("Connexion réussie");
    } catch (e) {
      const authErr = e as AuthError;
      setError(authErr);
      toast.error("Échec de la connexion. Veuillez vérifier vos identifiants.");
      throw authErr;
    }
  };

  const signOut = async () => {
    setError(null);
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};