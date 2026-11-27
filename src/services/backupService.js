import { supabase } from '../lib/supabase';
import { APP_VERSION } from '../version';
import { fetchQuizDomain } from './quizService';
import { fetchVocabularyDomain } from './vocabularyService';

export async function listBackups({ page = 1, pageSize = 20 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from('backup_metadata')
    .select(
      'id, created_by, scope, status, app_version, entity_counts, notes, created_at, creator:profiles!backup_metadata_created_by_fkey(email, full_name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { backups: data || [], total: count ?? 0 };
}

export async function createCentralBackup(adminUserId, notes = '') {
  const [quizDomain, vocabDomain] = await Promise.all([
    fetchQuizDomain(),
    fetchVocabularyDomain(),
  ]);

  const snapshot = {
    collections: quizDomain.collections,
    tests: quizDomain.tests,
    vocabCollections: vocabDomain.vocabCollections,
    vocabDecks: vocabDomain.vocabDecks,
  };

  const entityCounts = {
    quizCollections: quizDomain.collections.length,
    quizSets: quizDomain.tests.length,
    questions: quizDomain.tests.reduce((acc, t) => acc + (t.questions?.length || 0), 0),
    vocabCollections: vocabDomain.vocabCollections.length,
    vocabDecks: vocabDomain.vocabDecks.length,
    flashcards: vocabDomain.vocabDecks.reduce((acc, d) => acc + (d.cards?.length || 0), 0),
  };

  const { data, error } = await supabase
    .from('backup_metadata')
    .insert({
      created_by: adminUserId,
      scope: 'shared_content',
      status: 'completed',
      app_version: APP_VERSION,
      entity_counts: entityCounts,
      snapshot_data: snapshot,
      notes: notes || `Sao lưu nội dung học tập chung (${new Date().toLocaleDateString('vi-VN')})`,
    })
    .select('id, scope, status, app_version, entity_counts, notes, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function restoreCentralBackup(backupId, { mode = 'merge', dryRun = false } = {}) {
  const { data, error } = await supabase.rpc('restore_backup_atomic', {
    p_backup_id: backupId,
    p_mode: mode,
    p_dry_run: dryRun,
  });

  if (error) throw new Error(error.message);
  return data;
}

export function exportPersonalLearningData(user, data) {
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    user: {
      id: user.id,
      email: user.email,
    },
    history: data.history || [],
    questionStats: data.questionStats || {},
    vocabStats: data.vocabStats || {},
    activityLog: data.activityLog || {},
    mooskCount: data.mooskCount || 0,
    settings: data.settings || {},
  };
  return JSON.stringify(payload, null, 2);
}
