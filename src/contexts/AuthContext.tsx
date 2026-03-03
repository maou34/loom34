import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { db } from "@/db/client";
import { toast } from "sonner";

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
  isLoading: boolean; // uniquement "session bootstrap"
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const mountedRef = useRef(true);
  const refreshSeq = useRef(0);

  const refreshProfile = async (s?: Session | null) => {
    const seq = ++refreshSeq.current;

    const currentSession = s ?? session;
    const userId = currentSession?.user?.id;

    if (!userId) {
      if (mountedRef.current && seq === refreshSeq.current) setProfile(null);
      return;
    }

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

      setProfile(data || null);
    } catch (e) {
      if (!mountedRef.current || seq !== refreshSeq.current) return;
      console.error("Profile fetch crashed:", e);
      setProfile(null);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        setIsLoading(true);

        const {
          data: { session: initialSession },
          error: sessionError,
        } = await db.auth.getSession();

        if (sessionError) throw sessionError;
        if (!mountedRef.current) return;

        setSession(initialSession);

        // Important: on NE bloque PAS isLoading sur le profil
        refreshProfile(initialSession);
      } catch (e) {
        console.error("Auth init error:", e);
        if (!mountedRef.current) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, newSession) => {
      // Ne jamais bloquer l'UI sur le profil
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};