"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { SupabaseClient } from '@supabase/supabase-js';
import { User, UserProfile } from "@/types";

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient();
  }
  return supabaseInstance;
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseClient();

  // Track if we're currently initializing to prevent race conditions
  const isInitializing = useRef(false);
  const hasInitialized = useRef(false);

  const fetchUserData = async (userId: string, skipIfInitializing = false) => {
    // Prevent duplicate calls during initialization
    if (skipIfInitializing && isInitializing.current) {
      console.log('⏭️ Skipping duplicate fetchUserData call during initialization');
      return;
    }

    console.log('📊 Fetching user data for:', userId);

    try {
      // Fetch user data - Supabase has built-in timeout handling
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        console.error("❌ Error fetching user:", userError);
        console.error("This is likely due to an RLS policy blocking access to the 'public.users' table.");
        // Create a basic user object to prevent being stuck
        console.log('⚠️ Creating fallback user object');
        setUser({
          id: userId,
          email: '',
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User);
      } else if (userData) {
        console.log('✅ User data found in public.users:', userData);
        setUser(userData);
      } else {
        console.warn("⚠️ User record not found in public.users - checking auth metadata for fallback");

        // Check session metadata as a fallback
        const { data: { session } } = await supabase.auth.getSession();
        const isAdminFromMetadata = session?.user?.user_metadata?.role === 'admin' ||
          session?.user?.email === 'logictraderltd@gmail.com' ||
          session?.user?.email?.endsWith('@logictradersltd.com');

        setUser({
          id: userId,
          email: session?.user?.email || '',
          role: isAdminFromMetadata ? 'admin' : 'customer',
          created_at: session?.user?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User);

        console.log(`ℹ️ Initialized user with fallback role: ${isAdminFromMetadata ? 'admin' : 'customer'}`);
      }

      // Try to fetch profile but don't block if it fails
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("❌ Error fetching profile:", profileError);
        } else if (profileData) {
          console.log('✅ Profile data found:', profileData);
          setProfile(profileData);
        } else {
          console.warn("⚠️ User profile not found");
        }
      } catch (profileErr) {
        console.error("❌ Profile fetch error:", profileErr);
      }

    } catch (error) {
      console.error("❌ Unexpected error fetching user data:", error);
      // Set basic user object to prevent stuck loading
      setUser({
        id: userId,
        email: (await supabase.auth.getSession()).data.session?.user.email || '',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as User);
    } finally {
      console.log('✅ Fetch user data complete - setting isLoading to false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (hasInitialized.current) {
        console.log('⏭️ Auth already initialized, skipping');
        return;
      }

      isInitializing.current = true;
      console.log('🔐 Initializing auth...');

      try {
        // Check for existing session - removed timeout, Supabase handles this
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Session found for user:', session.user.id);
          await fetchUserData(session.user.id);
        } else {
          console.log('ℹ️ No active session');
          setIsLoading(false);
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        setIsLoading(false);
      } finally {
        isInitializing.current = false;
        hasInitialized.current = true;
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);

        // Skip INITIAL_SESSION and SIGNED_IN events during initialization to prevent duplicates
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && isInitializing.current) {
          console.log('⏭️ Skipping auth state change during initialization');
          return;
        }

        if (session?.user) {
          console.log('✅ User authenticated:', session.user.id);
          await fetchUserData(session.user.id, true);
        } else {
          console.log('ℹ️ User signed out');
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      console.log('🔐 Attempting login for:', email);
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error.message);
        setIsLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        console.log('✅ Login successful');
        await fetchUserData(data.user.id);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Unexpected login error:', error);
      setIsLoading(false);
      return { error: error.message || "An error occurred during login" };
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ error: string | null }> => {
    try {
      console.log('📝 Attempting registration for:', email);
      setIsLoading(true);

      // Sign up the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        console.error('❌ Registration error:', error.message);
        setIsLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        console.log('✅ Registration successful');
        // Wait a bit for trigger to create records
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchUserData(data.user.id);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Unexpected registration error:', error);
      setIsLoading(false);
      return { error: error.message || "An error occurred during registration" };
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out...');
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error("❌ Error during logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      console.log('🔄 Refreshing user data...');
      await fetchUserData(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    refreshUser,
  };

  // Log auth state changes only when relevant values change
  useEffect(() => {
    console.log('📊 Auth state:', {
      hasUser: !!user,
      hasProfile: !!profile,
      isLoading,
      isAuthenticated: !!user,
      userRole: user?.role
    });
  }, [user, profile, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}