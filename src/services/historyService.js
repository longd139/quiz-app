import { supabase } from '../lib/supabase';

export async function fetchQuizHistory(userId, { limit = 50, offset = 0 } = {}) {
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('*, quiz_attempt_answers(*)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return (attempts || []).map((a) => ({
    id: a.id,
    testId: a.quiz_set_id,
    testName: a.test_name,
    mode: a.mode,
    totalQuestions: a.total_questions,
    correctCount: a.correct_count,
    score: Number(a.score_percent),
    duration: a.duration_seconds,
    startedAt: a.started_at,
    completedAt: a.completed_at,
    answers: (a.quiz_attempt_answers || [])
      .sort((x, y) => x.sort_order - y.sort_order)
      .map((ans) => ({
        questionId: ans.question_id,
        questionSnapshot: ans.question_snapshot,
        selectedIndices: ans.selected_indices || [],
        isCorrect: ans.is_correct,
      })),
  }));
}

export async function saveQuizAttempt(userId, attempt) {
  const { data: inserted, error } = await supabase
    .from('quiz_attempts')
    .upsert({
      id: attempt.id,
      user_id: userId,
      quiz_set_id: attempt.testId || null,
      test_name: attempt.testName || 'Bài thi',
      mode: attempt.mode === 'exam' ? 'exam' : 'practice',
      total_questions: attempt.totalQuestions || 0,
      correct_count: attempt.correctCount || 0,
      score_percent: Number(attempt.score) || 0,
      duration_seconds: attempt.duration || 0,
      started_at: attempt.startedAt || new Date().toISOString(),
      completed_at: attempt.completedAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (Array.isArray(attempt.answers) && attempt.answers.length > 0) {
    await supabase.from('quiz_attempt_answers').delete().eq('attempt_id', inserted.id);
    const ansRows = attempt.answers.map((ans, idx) => ({
      attempt_id: inserted.id,
      user_id: userId,
      question_id: ans.questionId || null,
      question_snapshot: ans.questionSnapshot || {},
      selected_indices: ans.selectedIndices || [],
      is_correct: Boolean(ans.isCorrect),
      sort_order: idx,
    }));
    const { error: ansErr } = await supabase.from('quiz_attempt_answers').insert(ansRows);
    if (ansErr) throw new Error(ansErr.message);
  }

  return inserted;
}

export async function deleteQuizAttempt(userId, attemptId) {
  const { error } = await supabase
    .from('quiz_attempts')
    .delete()
    .eq('id', attemptId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
