import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// User profile type from our database
interface UserProfile {
  id: string;
  email: string;
  name: string;
  subscription_plan?: string;
  subscription_status?: string;
  monthly_bet_limit?: number;
  max_bankrolls?: number;
  advanced_analytics?: boolean;
  kelly_calculator?: boolean;
  google_sheets_connected?: boolean;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      const newProfile = await fetchProfile(user.id);
      setProfile(newProfile);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to BetSnap.",
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your email and password.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Delete the auth user if profile creation fails
          await supabase.auth.admin.deleteUser(data.user.id);
          throw profileError;
        }

        // Fetch the created profile
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
      }

      toast({
        title: "Account created!",
        description: "Welcome to BetSnap. Please check your email to verify your account.",
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try again with different details.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setSession(null);

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      setLocation("/login");
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const isAuthenticated = !!session;

  const contextValue: AuthContextType = {
    user,
    profile,
    session,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
