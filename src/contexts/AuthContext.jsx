import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  const activeUserIdRef = useRef(null);

  const loadUserProfile = useCallback(async (currentSession) => {
    const targetUid = currentSession?.user?.id || null;
    if (!targetUid) {
      activeUserIdRef.current = null;
      setProfile(null);
      return null;
    }

    activeUserIdRef.current = targetUid;
    try {
      const prof = await fetchProfile(targetUid);
      // Guard against race condition: ignore if user switched/logged out mid-flight
      if (activeUserIdRef.current !== targetUid) return null;

      if (!prof || prof.status === 'DISABLED') {
        await signOutCurrentUser(targetUid);
        if (activeUserIdRef.current !== targetUid) return null;
        activeUserIdRef.current = null;
        setSession(null);
        setProfile(null);
        setAuthError('Tài khoản của bạn đã bị khóa hoặc không còn hoạt động.');
        return null;
      }

      setProfile(prof);
      setAuthError('');
      return prof;
    } catch (err) {
      if (activeUserIdRef.current === targetUid) {
        console.error('Failed to load profile:', err);
        setProfile(null);
      }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        const prevUid = activeUserIdRef.current;
        activeUserIdRef.current = null;
        clearUserScopedCaches(prevUid);
        setSession(null);
        setProfile(null);
        return;
      }

      setSession(nextSession);
      // Defer Supabase REST calls outside the synchronous auth state callback to prevent deadlocks
      if (nextSession) {
        setTimeout(() => {
          if (mounted) loadUserProfile(nextSession);
        }, 0);
      } else {
        activeUserIdRef.current = null;
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
    activeUserIdRef.current = result.user.id;
    setSession(result.session);
    setProfile(result.profile);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    const uid = activeUserIdRef.current || session?.user?.id;
    activeUserIdRef.current = null;
    await signOutCurrentUser(uid);
    setSession(null);
    setProfile(null);
    setAuthError('');
  }, [session?.user?.id]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const email = profile?.email || session?.user?.email;
    if (!email) throw new Error('Không xác định được email tài khoản.');
    await changePasswordWithReauth({ currentPassword, newPassword });
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
    isAdmin: Boolean(profile?.role === 'ADMIN' && profile?.status === 'ACTIVE' && !profile?.must_change_password),
    mustChangePassword: Boolean(profile?.must_change_password),
    needsPasswordChangeNotice: Boolean(
      profile?.must_change_password || profile?.password_change_recommended
    ),
    hasSupabase,
    signIn,
    signOut,
    changePassword,
    updateProfile,
    refreshProfile,
  }), [session, profile, loading, authError, signIn, signOut, changePassword, updateProfile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
