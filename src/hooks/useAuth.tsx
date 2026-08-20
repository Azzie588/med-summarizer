import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/database";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Supabase's getSession() can hang indefinitely if the browser has a
// stale/corrupted session token (e.g. a leftover Web Locks API lock from a
// crashed tab, or a token from a deleted project). If it doesn't resolve
// within this window, we give up waiting, clear the bad token, and show
// the sign-in screen instead of leaving the user stuck on the loading spinner.
const SESSION_TIMEOUT_MS = 6000;

function clearStaleSupabaseAuthStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage may be unavailable (e.g. private browsing); ignore.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data as Profile | null;
  }, []);

  const createProfile = useCallback(async (userId: string, email: string) => {
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      display_name: email.split("@")[0],
    } as any);

    if (error) {
      console.error("Error creating profile:", error);
    }
  }, []);

  useEffect(() => {
    let settled = false;

    // Safety net: if getSession() hasn't resolved (or rejected) within
    // SESSION_TIMEOUT_MS, stop waiting so the app doesn't get stuck on the
    // loading screen forever. Clear whatever token is stuck so the next
    // load has a clean slate.
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn(
          `Supabase getSession() did not respond within ${SESSION_TIMEOUT_MS}ms — clearing stored session and continuing.`
        );
        clearStaleSupabaseAuthStorage();
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    }, SESSION_TIMEOUT_MS);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (settled) return; // timeout already fired, ignore late response
      settled = true;
      clearTimeout(timeoutId);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const existingProfile = await fetchProfile(session.user.id);
        if (!existingProfile) {
          await createProfile(session.user.id, session.user.email || "");
          const newProfile = await fetchProfile(session.user.id);
          setProfile(newProfile);
        } else {
          setProfile(existingProfile);
        }
      }

      setLoading(false);
    }).catch((err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      console.error("Error getting session:", err);
      clearStaleSupabaseAuthStorage();
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        const existingProfile = await fetchProfile(session.user.id);
        if (!existingProfile) {
          await createProfile(session.user.id, session.user.email || "");
          const newProfile = await fetchProfile(session.user.id);
          setProfile(newProfile);
        } else {
          setProfile(existingProfile);
        }
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile, createProfile]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("id", user.id);

    if (error) return { error: new Error(error.message) };

    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
