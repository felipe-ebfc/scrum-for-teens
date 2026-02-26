import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  use_initials: boolean;
  has_set_full_name: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthUser extends User {
  profile?: Profile;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  profileLoading: boolean;
  connectionError: string | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string | null; use_initials?: boolean; has_set_full_name?: boolean }) => Promise<{ error?: string; profile?: Profile }>;
  refreshProfile: () => Promise<{ profile: Profile | null; error?: string }>;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to check if we're online
const isOnline = () => typeof navigator !== 'undefined' ? navigator.onLine : true;

// Derive name from email prefix as last resort
const deriveNameFromEmail = (email: string): string => {
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  return prefix
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // CRITICAL: Initialize profileLoading to true to prevent "U" flash
  // It will be set to false only when:
  // 1. No user exists (nothing to load)
  // 2. Profile fetch completes (success or failure)
  const [profileLoading, setProfileLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Refs to prevent duplicate operations and track state
  const initializingRef = useRef(false);
  const backfillAttemptedForUserRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  /**
   * Fetch profile from Supabase by user ID
   * Returns the profile or null if not found/error
   */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('👤 fetchProfile: Fetching for user', userId.substring(0, 8));
    
    try {
      const { data, error } = await queuedSupabaseQuery(
        () => supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        { maxRetries: 2, critical: false, timeout: 10000 }
      );
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('👤 fetchProfile: Profile not found (new user)');
          return null;
        }
        console.warn('👤 fetchProfile: Error:', error.message);
        return null;
      }
      
      console.log('👤 fetchProfile: SUCCESS');
      return data as Profile;
    } catch (error: any) {
      console.warn('👤 fetchProfile: Exception:', error?.message);
      return null;
    }
  }, []);

  /**
   * Perform backfill if needed - ONLY when DB says full_name is null AND has_set_full_name is false
   * This runs ONCE per user session during hydration
   */
  const performBackfillIfNeeded = useCallback(async (
    userId: string, 
    profile: Profile, 
    authUser: User
  ): Promise<Profile> => {
    // Guard: Only attempt backfill once per user per session
    if (backfillAttemptedForUserRef.current === userId) {
      console.log('👤 Backfill: SKIPPED - already attempted for this user');
      return profile;
    }

    const dbFullName = profile.full_name;
    const dbHasSetFullName = profile.has_set_full_name ?? false;

    console.log('👤 Backfill check:', { 
      dbFullName, 
      dbHasSetFullName, 
      userId: userId.substring(0, 8) 
    });

    // Only backfill if BOTH conditions are true:
    // 1. full_name is null/empty in the database
    // 2. has_set_full_name is false (user has never explicitly saved a name)
    if (dbFullName && dbFullName.trim()) {
      console.log('👤 Backfill: NOT NEEDED - DB already has full_name');
      backfillAttemptedForUserRef.current = userId;
      return profile;
    }

    if (dbHasSetFullName) {
      console.log('👤 Backfill: NOT NEEDED - user has previously set name');
      backfillAttemptedForUserRef.current = userId;
      return profile;
    }

    // Determine backfill value
    let backfillName: string | null = null;
    const metadataName = authUser.user_metadata?.full_name;

    if (metadataName && typeof metadataName === 'string' && metadataName.trim()) {
      backfillName = metadataName.trim();
      console.log('👤 Backfill: Using user_metadata.full_name:', backfillName);
    } else if (authUser.email) {
      backfillName = deriveNameFromEmail(authUser.email);
      console.log('👤 Backfill: Derived from email:', backfillName);
    }

    if (!backfillName) {
      console.log('👤 Backfill: No name source available');
      backfillAttemptedForUserRef.current = userId;
      return profile;
    }

    // Mark backfill as attempted BEFORE the async operation
    backfillAttemptedForUserRef.current = userId;

    console.log('👤 Backfill: Persisting to profiles table:', backfillName);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          full_name: backfillName,
          avatar_url: null,
          use_initials: true
          // Intentionally NOT setting has_set_full_name = true
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('👤 Backfill: FAILED:', error.message);
        return profile;
      }

      console.log('👤 Backfill: SUCCESS');
      return data as Profile;
    } catch (err: any) {
      console.error('👤 Backfill: Exception:', err?.message);
      return profile;
    }
  }, []);

  /**
   * Hydrate profile for a user - fetches profile and performs backfill if needed
   * Updates user state with the profile
   * Sets profileLoading to false when complete
   */
  const hydrateProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    const userId = authUser.id;
    console.log('👤 hydrateProfile: Starting for user', userId.substring(0, 8));
    
    try {
      // Fetch profile from database
      let profile = await fetchProfile(userId);
      
      if (!profile) {
        console.log('👤 hydrateProfile: No profile found');
        return null;
      }
      
      // Perform backfill if needed (only on initial hydration)
      profile = await performBackfillIfNeeded(userId, profile, authUser);
      
      // Update user state with profile
      if (mountedRef.current) {
        setUser(prev => {
          if (prev?.id === userId) {
            return { ...prev, profile };
          }
          return prev;
        });
      }
      
      console.log('👤 hydrateProfile: Complete, full_name:', profile.full_name);
      return profile;
    } catch (error: any) {
      console.error('👤 hydrateProfile: Error:', error?.message);
      return null;
    } finally {
      // ALWAYS set profileLoading to false when done
      if (mountedRef.current) {
        setProfileLoading(false);
      }
    }
  }, [fetchProfile, performBackfillIfNeeded]);

  /**
   * Refresh profile - fetches fresh profile from DB and updates state
   * Returns { profile, error } so callers can use the fresh profile immediately
   * This avoids stale closure issues
   */
  const refreshProfile = useCallback(async (): Promise<{ profile: Profile | null; error?: string }> => {
    if (!user) {
      return { profile: null, error: 'No user logged in' };
    }
    
    console.log('👤 refreshProfile: Refreshing profile for user', user.id.substring(0, 8));
    setProfileLoading(true);
    
    try {
      const profile = await fetchProfile(user.id);
      
      if (!profile) {
        return { profile: null, error: 'Profile not found' };
      }
      
      // Update user state with fresh profile
      if (mountedRef.current) {
        setUser(prev => prev ? { ...prev, profile } : null);
      }
      
      console.log('👤 refreshProfile: SUCCESS, full_name:', profile.full_name);
      return { profile };
    } catch (error: any) {
      console.error('👤 refreshProfile: Error:', error?.message);
      return { profile: null, error: error?.message || 'Failed to refresh profile' };
    } finally {
      if (mountedRef.current) {
        setProfileLoading(false);
      }
    }
  }, [user, fetchProfile]);

  /**
   * Initialize auth - runs ONCE on mount
   */
  const initializeAuth = useCallback(async () => {
    if (initializingRef.current) {
      console.log('🔐 Auth: initialization already in progress');
      return;
    }
    
    initializingRef.current = true;
    console.log('🔐 Auth: initializing...');
    
    try {
      if (!isOnline()) {
        console.warn('🔐 Auth: Device appears to be offline');
        setConnectionError('You appear to be offline. Please check your internet connection.');
        setLoading(false);
        setProfileLoading(false);
        initializingRef.current = false;
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('🔐 Auth: Session check result:', { hasSession: !!session, error: error?.message });
      
      if (error) {
        console.error('🔐 Auth: Session error:', error);
        setUser(null);
        setLoading(false);
        setProfileLoading(false);
        initializingRef.current = false;
        return;
      }

      if (session?.user) {
        console.log('🔐 Auth: User found in session');
        // Set user immediately (without profile)
        setUser(session.user);
        setConnectionError(null);
        setLoading(false);
        // profileLoading stays true (initialized as true)
        
        // Hydrate profile - this will set profileLoading to false when done
        hydrateProfile(session.user);
      } else {
        console.log('🔐 Auth: No user in session');
        setUser(null);
        setConnectionError(null);
        setLoading(false);
        setProfileLoading(false); // No user = no profile to load
      }
    } catch (error: any) {
      console.error('🔐 Auth: initialization error:', error);
      setUser(null);
      setLoading(false);
      setProfileLoading(false);
      
      if (!isOnline() || error?.message?.includes('fetch') || error?.message?.includes('network')) {
        setConnectionError('Connection issue - please check your internet.');
      }
    } finally {
      initializingRef.current = false;
    }
  }, [hydrateProfile]);

  /**
   * Retry connection - only call when user explicitly requests
   */
  const retryConnection = useCallback(async () => {
    console.log('🔐 Auth: User requested connection retry');
    setLoading(true);
    setProfileLoading(true);
    setConnectionError(null);
    backfillAttemptedForUserRef.current = null;
    initializingRef.current = false;
    await initializeAuth();
  }, [initializeAuth]);

  /**
   * Main effect - runs ONCE on mount
   */
  useEffect(() => {
    mountedRef.current = true;
    
    // Safety timeout for main loading - max 8 seconds
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('🔐 Auth: Safety timeout triggered for loading');
        setLoading(false);
      }
    }, 8000);

    // Safety timeout for profile loading - max 5 seconds
    const profileSafetyTimeout = setTimeout(() => {
      setProfileLoading(prev => {
        if (prev) {
          console.warn('👤 Profile: Safety timeout triggered');
          return false;
        }
        return prev;
      });
    }, 5000);

    // Initialize auth ONCE
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth: State change:', event, !!session);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          setProfileLoading(false);
          backfillAttemptedForUserRef.current = null;
          return;
        }
        
        if (session?.user) {
          // Set user immediately
          setUser(session.user);
          setLoading(false);
          
          // Hydrate profile on SIGNED_IN and TOKEN_REFRESHED
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setProfileLoading(true);
            hydrateProfile(session.user);
          }
        } else {
          setUser(null);
          setLoading(false);
          setProfileLoading(false);
        }
      }
    );

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🔐 Auth: Device came online');
      setConnectionError(null);
    };

    const handleOffline = () => {
      console.log('🔐 Auth: Device went offline');
      setConnectionError('You are offline. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
      clearTimeout(profileSafetyTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      if (!isOnline()) {
        return { error: 'You appear to be offline. Please check your internet connection.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message === 'Email not confirmed') {
          return { error: 'Please check your email and click the confirmation link before logging in.' };
        }
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setConnectionError(null);
        backfillAttemptedForUserRef.current = null;
        setProfileLoading(true);
        hydrateProfile(data.user);
      }
      
      return {};
    } catch (error: any) {
      console.error('🔐 Auth: Login error:', error);
      if (!isOnline()) {
        return { error: 'You appear to be offline. Please check your internet connection.' };
      }
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      if (!isOnline()) {
        return { error: 'You appear to be offline. Please check your internet connection.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user && data.user.email_confirmed_at) {
        setUser(data.user);
        setProfileLoading(true);
        hydrateProfile(data.user);
        return {};
      }

      return { error: undefined };
    } catch (error: any) {
      console.error('🔐 Auth: Signup error:', error);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfileLoading(false);
      setConnectionError(null);
      backfillAttemptedForUserRef.current = null;
    } catch (error) {
      console.error('🔐 Auth: Logout error:', error);
      setUser(null);
      setProfileLoading(false);
      backfillAttemptedForUserRef.current = null;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (!isOnline()) {
        return { error: 'You appear to be offline. Please check your internet connection.' };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) {
        return { error: error.message };
      }
      
      return {};
    } catch (error: any) {
      console.error('🔐 Auth: Reset password error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  /**
   * Update profile - returns the updated profile and updates state immediately
   * NO SILENT FAILURES - errors are logged and returned
   */
  const updateProfile = async (updates: { 
    full_name?: string; 
    avatar_url?: string | null; 
    use_initials?: boolean; 
    has_set_full_name?: boolean 
  }): Promise<{ error?: string; profile?: Profile }> => {
    try {
      if (!user) {
        const errorMsg = 'No user logged in';
        console.error('👤 updateProfile: ERROR -', errorMsg);
        return { error: errorMsg };
      }

      if (!isOnline()) {
        const errorMsg = 'You appear to be offline. Please check your internet connection.';
        console.error('👤 updateProfile: ERROR -', errorMsg);
        return { error: errorMsg };
      }

      console.log('👤 updateProfile: Updating profile...', updates);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('👤 updateProfile: SUPABASE ERROR:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        return { error: error.message };
      }

      if (!data) {
        const errorMsg = 'Profile update returned no data';
        console.error('👤 updateProfile: ERROR -', errorMsg);
        return { error: errorMsg };
      }

      console.log('👤 updateProfile: SUCCESS:', data);
      
      const updatedProfile = data as Profile;
      
      // Update user state immediately with the returned profile
      setUser(prev => prev ? { ...prev, profile: updatedProfile } : null);

      return { profile: updatedProfile };
    } catch (error: any) {
      console.error('👤 updateProfile: EXCEPTION:', {
        message: error?.message,
        stack: error?.stack,
        fullError: error
      });
      return { error: error?.message || 'An unexpected error occurred' };
    }
  };

  const value = {
    user,
    loading,
    profileLoading,
    connectionError,
    login,
    signup,
    logout,
    resetPassword,
    updateProfile,
    refreshProfile,
    retryConnection,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
