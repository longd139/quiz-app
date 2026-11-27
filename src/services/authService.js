import { supabase, hasSupabase } from '../lib/supabase';

const USER_CACHE_PREFIXES = ['quiz_v2_cache_', 'quiz_draft_'];

export function clearUserScopedCaches(userId) {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        USER_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
        (userId && key.includes(userId)) ||
        key === 'quiz_data' ||
        key === 'quiz_room_config' ||
        key === 'quiz_daily_backups' ||
        key === 'quiz_audit_trail_events' ||
        key === 'cloudinary_api_secret'
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem('audit_unlocked');
  } catch {
    // Ignore storage errors
  }
}

export async function fetchProfile(userId) {
  if (!hasSupabase || !userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function signInWithEmailPassword(email, password) {
  if (!hasSupabase) {
    throw new Error('Hệ thống chưa được cấu hình Supabase (thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY).');
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    if (error.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }
    throw new Error(error.message || 'Đăng nhập thất bại.');
  }

  const profile = await fetchProfile(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('Tài khoản chưa có hồ sơ hợp lệ. Vui lòng liên hệ Quản trị viên.');
  }

  if (profile.status === 'DISABLED') {
    await supabase.auth.signOut();
    throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ.');
  }

  // Update last_login_at (best-effort)
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  return { session: data.session, user: data.user, profile };
}

export async function signOutCurrentUser(userId) {
  clearUserScopedCaches(userId);
  if (hasSupabase) {
    await supabase.auth.signOut();
  }
}

export async function changePasswordWithReauth({ currentPassword, newPassword }) {
  if (!hasSupabase) throw new Error('Chưa cấu hình Supabase.');

  const { data, error } = await supabase.functions.invoke('password-change', {
    body: { currentPassword, newPassword },
  });

  if (error) {
    throw new Error(error.message || 'Không thể cập nhật mật khẩu mới.');
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  await supabase.auth.refreshSession();
}

export async function updateOwnProfile(userId, updates) {
  if (!hasSupabase || !userId) throw new Error('Chưa đăng nhập.');
  const allowed = {};
  if (typeof updates.full_name === 'string') allowed.full_name = updates.full_name.trim();
  if (typeof updates.avatar_url === 'string' || updates.avatar_url === null) {
    allowed.avatar_url = updates.avatar_url;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(allowed)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
