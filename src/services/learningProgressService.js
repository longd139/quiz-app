import { supabase } from '../lib/supabase';

export async function fetchLearningProgress(userId) {
  const [qStatsRes, vProgRes, actRes, rewardRes] = await Promise.all([
    supabase.from('question_learning_stats').select('*').eq('user_id', userId),
    supabase.from('vocab_learning_progress').select('*').eq('user_id', userId),
    supabase.from('daily_learning_activity').select('*').eq('user_id', userId),
    supabase.from('learning_rewards').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (qStatsRes.error) throw new Error(qStatsRes.error.message);
  if (vProgRes.error) throw new Error(vProgRes.error.message);
  if (actRes.error) throw new Error(actRes.error.message);
  if (rewardRes.error) throw new Error(rewardRes.error.message);

  const questionStats = {};
  for (const row of qStatsRes.data || []) {
    questionStats[row.question_id] = {
      attempts: row.attempts,
      correct: row.correct,
      wrong: row.wrong,
      lastAttemptedAt: row.last_attempted_at,
    };
  }

  const vocabStats = {};
  for (const row of vProgRes.data || []) {
    vocabStats[row.flashcard_id] = {
      mastered: row.mastered,
      reviewCount: row.review_count,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      lastReviewed: row.last_reviewed_at,
    };
  }

  const activityLog = {};
  for (const row of actRes.data || []) {
    activityLog[row.activity_date] = row.activity_count;
  }

  return {
    questionStats,
    vocabStats,
    activityLog,
    mooskCount: rewardRes.data?.moosk_count ?? 0,
  };
}

export async function upsertQuestionStats(userId, questionStats) {
  const rows = Object.entries(questionStats || {}).map(([questionId, st]) => ({
    user_id: userId,
    question_id: questionId,
    attempts: st.attempts || 0,
    correct: st.correct || 0,
    wrong: st.wrong || 0,
    last_attempted_at: st.lastAttemptedAt || new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('question_learning_stats').upsert(rows);
  if (error) throw new Error(error.message);
}

export async function upsertVocabProgress(userId, vocabStats) {
  const rows = Object.entries(vocabStats || {}).map(([flashcardId, st]) => ({
    user_id: userId,
    flashcard_id: flashcardId,
    mastered: Boolean(st.mastered),
    review_count: st.reviewCount || 0,
    correct_count: st.correctCount || 0,
    wrong_count: st.wrongCount || 0,
    last_reviewed_at: st.lastReviewed || new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('vocab_learning_progress').upsert(rows);
  if (error) throw new Error(error.message);
}

export async function upsertDailyActivity(userId, activityLog) {
  const rows = Object.entries(activityLog || {}).map(([dateStr, count]) => ({
    user_id: userId,
    activity_date: dateStr,
    activity_count: Math.max(0, Number(count) || 0),
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('daily_learning_activity').upsert(rows);
  if (error) throw new Error(error.message);
}

export async function upsertMooskCount(userId, mooskCount) {
  const { error } = await supabase.from('learning_rewards').upsert({
    user_id: userId,
    moosk_count: Math.max(0, Number(mooskCount) || 0),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
