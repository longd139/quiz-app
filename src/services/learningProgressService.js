import { supabase } from '../lib/supabase';

const PAGE_SIZE = 1000;

async function fetchUserPaginated(table, userId) {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function fetchLearningProgress(userId) {
  const [qStatsData, vProgData, actData, rewardRes] = await Promise.all([
    fetchUserPaginated('question_learning_stats', userId),
    fetchUserPaginated('vocab_learning_progress', userId),
    fetchUserPaginated('daily_learning_activity', userId),
    supabase.from('learning_rewards').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (rewardRes.error) throw new Error(rewardRes.error.message);

  const questionStats = {};
  for (const row of qStatsData) {
    questionStats[row.question_id] = {
      attempts: row.attempts,
      correct: row.correct,
      wrong: row.wrong,
      lastAttemptedAt: row.last_attempted_at,
    };
  }

  const vocabStats = {};
  for (const row of vProgData) {
    vocabStats[row.flashcard_id] = {
      mastered: row.mastered,
      reviewCount: row.review_count,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      lastReviewed: row.last_reviewed_at,
    };
  }

  const activityLog = {};
  for (const row of actData) {
    activityLog[row.activity_date] = row.activity_count;
  }

  return {
    questionStats,
    vocabStats,
    activityLog,
    mooskCount: rewardRes.data?.moosk_count ?? 0,
  };
}

/**
 * Apply concurrent-safe, idempotent delta updates for learning progress.
 * Re-sending the same operationId is a no-op on the server.
 */
export async function applyProgressDelta({
  operationId,
  questionDeltas = [],
  vocabDeltas = [],
  activityDate = null,
  activityDelta = 0,
  mooskDelta = 0,
}) {
  const { data, error } = await supabase.rpc('apply_learning_progress_event', {
    p_operation_id: operationId || crypto.randomUUID(),
    p_question_deltas: questionDeltas,
    p_vocab_deltas: vocabDeltas,
    p_activity_date: activityDate,
    p_activity_delta: Math.max(0, activityDelta),
    p_moosk_delta: Math.max(0, mooskDelta),
  });

  if (error) throw new Error(error.message);
  return data;
}
