import { supabase } from '../lib/supabase';

export async function listProfiles({ search = '', role = 'ALL', status = 'ALL', page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (role !== 'ALL') {
    query = query.eq('role', role);
  }
  if (status !== 'ALL') {
    query = query.eq('status', status);
  }
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { users: data || [], total: count ?? 0 };
}

export async function fetchAdminDashboardStats() {
  const [
    usersRes,
    activeUsersRes,
    disabledUsersRes,
    quizSetsRes,
    questionsRes,
    vocabDecksRes,
    flashcardsRes,
    attemptsRes,
    recentAuditRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'DISABLED'),
    supabase.from('quiz_sets').select('id', { count: 'exact', head: true }),
    supabase.from('questions').select('id', { count: 'exact', head: true }),
    supabase.from('vocab_decks').select('id', { count: 'exact', head: true }),
    supabase.from('flashcards').select('id', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('*, actor:profiles!audit_logs_actor_user_id_fkey(email, full_name)').order('created_at', { ascending: false }).limit(8),
  ]);

  return {
    totalUsers: usersRes.count ?? 0,
    activeUsers: activeUsersRes.count ?? 0,
    disabledUsers: disabledUsersRes.count ?? 0,
    totalQuizSets: quizSetsRes.count ?? 0,
    totalQuestions: questionsRes.count ?? 0,
    totalVocabDecks: vocabDecksRes.count ?? 0,
    totalFlashcards: flashcardsRes.count ?? 0,
    totalLearningSessions: attemptsRes.count ?? 0,
    recentActivities: recentAuditRes.data ?? [],
  };
}

async function invokeAdminUsers(payload) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: payload,
  });
  if (error) {
    throw new Error(error.message || 'Lỗi gọi máy chủ quản trị.');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function createUserAccount(payload) {
  return invokeAdminUsers({ action: 'create_user', ...payload });
}

export async function updateUserAccount(userId, payload) {
  return invokeAdminUsers({ action: 'update_user', user_id: userId, ...payload });
}

export async function resetUserPassword(userId, password, mustChangePassword = true) {
  return invokeAdminUsers({
    action: 'reset_password',
    user_id: userId,
    password,
    must_change_password: mustChangePassword,
  });
}
