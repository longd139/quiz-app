import { supabase } from '../lib/supabase';
import { APP_VERSION } from '../version';
import { fetchQuizDomain } from './quizService';
import { fetchVocabularyDomain } from './vocabularyService';
import { recordCentralAuditLog } from './auditService';

export async function listBackups() {
  const { data, error } = await supabase
    .from('backup_metadata')
    .select('id, created_by, scope, status, app_version, entity_counts, notes, created_at, creator:profiles!backup_metadata_created_by_fkey(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
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
      notes: notes || `Sao lưu nội dung học tập (${new Date().toLocaleDateString('vi-VN')})`,
    })
    .select('id, scope, status, app_version, entity_counts, notes, created_at')
    .single();

  if (error) throw new Error(error.message);

  await recordCentralAuditLog({
    actorUserId: adminUserId,
    action: 'ADMIN_BACKUP_CREATE',
    entityType: 'backup_metadata',
    entityId: data.id,
    metadata: { entity_counts: entityCounts },
  });

  return data;
}

export async function restoreCentralBackup(backupId, adminUserId) {
  const { data: backup, error: fetchErr } = await supabase
    .from('backup_metadata')
    .select('*')
    .eq('id', backupId)
    .single();

  if (fetchErr || !backup?.snapshot_data) {
    throw new Error('Không tìm thấy dữ liệu bản sao lưu hợp lệ.');
  }

  // Always create a pre-restore safety backup first
  await createCentralBackup(adminUserId, `Auto pre-restore backup trước khi khôi phục ${backupId}`);

  const snap = backup.snapshot_data;
  if (!Array.isArray(snap.tests) || !Array.isArray(snap.vocabDecks)) {
    throw new Error('Cấu trúc bản sao lưu không hợp lệ.');
  }

  // Upsert collections, quiz sets, questions, options, vocab collections, decks, flashcards
  for (const col of snap.collections || []) {
    await supabase.from('quiz_collections').upsert({
      id: col.id,
      name: col.name,
      description: col.description || '',
      created_by: adminUserId,
    });
  }

  for (const t of snap.tests || []) {
    await supabase.from('quiz_sets').upsert({
      id: t.id,
      collection_id: t.collectionId || null,
      name: t.name,
      description: t.description || '',
      created_by: adminUserId,
    });
    for (let i = 0; i < (t.questions || []).length; i++) {
      const q = t.questions[i];
      await supabase.from('questions').upsert({
        id: q.id,
        quiz_set_id: t.id,
        prompt: q.prompt || '',
        explanation: q.explanation || '',
        sort_order: i,
      });
      await supabase.from('question_options').delete().eq('question_id', q.id);
      const opts = (q.options || []).map((o, idx) => ({
        question_id: q.id,
        label: o.label || String.fromCharCode(65 + idx),
        text: o.text || '',
        is_correct: Array.isArray(q.correctIndices) && q.correctIndices.includes(idx),
        sort_order: idx,
      }));
      if (opts.length > 0) await supabase.from('question_options').insert(opts);
    }
  }

  for (const vc of snap.vocabCollections || []) {
    await supabase.from('vocab_collections').upsert({
      id: vc.id,
      name: vc.name,
      created_by: adminUserId,
    });
  }

  for (const d of snap.vocabDecks || []) {
    await supabase.from('vocab_decks').upsert({
      id: d.id,
      collection_id: d.collectionId || null,
      name: d.name,
      description: d.description || '',
      target_language: d.targetLanguage || 'en-US',
      created_by: adminUserId,
    });
    const cards = (d.cards || []).map((c, idx) => ({
      id: c.id,
      deck_id: d.id,
      term: c.term || '',
      meaning: c.meaning || '',
      phonetic: c.phonetic || '',
      part_of_speech: c.partOfSpeech || '',
      example: c.example || '',
      example_meaning: c.exampleMeaning || '',
      examples: Array.isArray(c.examples) ? c.examples : [],
      image_url: c.image || '',
      note: c.note || '',
      sort_order: idx,
    }));
    if (cards.length > 0) await supabase.from('flashcards').upsert(cards);
  }

  await supabase.from('backup_metadata').update({ status: 'restored' }).eq('id', backupId);

  await recordCentralAuditLog({
    actorUserId: adminUserId,
    action: 'ADMIN_BACKUP_RESTORE',
    entityType: 'backup_metadata',
    entityId: backupId,
    metadata: { entity_counts: backup.entity_counts },
  });
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
