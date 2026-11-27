import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import {
  fetchProfile,
  signInWithEmailPassword,
  signOutCurrentUser,
  changePasswordWithReauth,
  updateOwnProfile,
  clearUserScopedCaches,
} from '../services/authService';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadUserProfile = useCallback(async (currentSession) => {
    if (!currentSession?.user?.id) {
      setProfile(null);
      return null;
    }
    try {
      const prof = await fetchProfile(currentSession.user.id);
      if (!prof || prof.status === 'DISABLED') {
        await signOutCurrentUser(currentSession.user.id);
        setSession(null);
        setProfile(null);
        setAuthError('Tài khoản của bạn đã bị khóa hoặc không còn hoạt động.');
        return null;
      }
      setProfile(prof);
      setAuthError('');
      return prof;
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(initialSession);
        if (initialSession) {
          await loadUserProfile(initialSession);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        clearUserScopedCaches();
        setSession(null);
        setProfile(null);
        return;
      }
      setSession(nextSession);
      if (nextSession) {
        await loadUserProfile(nextSession);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  const signIn = useCallback(async (email, password) => {
    setAuthError('');
    const result = await signInWithEmailPassword(email, password);
    setSession(result.session);
    setProfile(result.profile);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    const uid = session?.user?.id;
    await signOutCurrentUser(uid);
    setSession(null);
    setProfile(null);
    setAuthError('');
  }, [session?.user?.id]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const email = profile?.email || session?.user?.email;
    if (!email) throw new Error('Không xác định được email tài khoản.');
    await changePasswordWithReauth({ email, currentPassword, newPassword });
    await loadUserProfile(session);
  }, [profile?.email, session, loadUserProfile]);

  const updateProfile = useCallback(async (updates) => {
    if (!session?.user?.id) throw new Error('Chưa đăng nhập.');
    const updated = await updateOwnProfile(session.user.id, updates);
    setProfile(updated);
    return updated;
  }, [session?.user?.id]);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    return loadUserProfile(session);
  }, [session, loadUserProfile]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    authError,
    isAuthenticated: Boolean(session?.user && profile && profile.status === 'ACTIVE'),
    isAdmin: Boolean(profile?.role === 'ADMIN' && profile?.status === 'ACTIVE'),
    mustChangePassword: Boolean(profile?.must_change_password),
    hasSupabase,
    signIn,
    signOut,
    changePassword,
    updateProfile,
    refreshProfile,
  }), [session, profile, loading, authError, signIn, signOut, changePassword, updateProfile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
