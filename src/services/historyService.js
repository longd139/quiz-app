import { supabase } from '../lib/supabase';

const PAGE_SIZE = 100;

export async function fetchQuizHistory(userId) {
  const allAttempts = [];
  let offset = 0;

  while (true) {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*, quiz_attempt_answers!fk_quiz_attempt_answers_parent_owner(*)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!attempts || attempts.length === 0) break;
    allAttempts.push(...attempts);
    if (attempts.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allAttempts.map((a) => {
    const sortedAnswers = (a.quiz_attempt_answers || []).sort((x, y) => x.sort_order - y.sort_order);

    // Reconstruct legacy-compatible `questions` and `answers` map from immutable snapshots
    const questions = Array.isArray(a.questions_snapshot) && a.questions_snapshot.length > 0
      ? a.questions_snapshot
      : sortedAnswers.map((ans) => ans.question_snapshot).filter(Boolean);

    const answersMap = {};
    sortedAnswers.forEach((ans, idx) => {
      const qid = ans.question_id || questions[idx]?.id;
      if (qid) {
        answersMap[qid] = ans.selected_indices || [];
      }
    });

    const testNames = Array.isArray(a.test_names) && a.test_names.length > 0
      ? a.test_names
      : [a.test_name].filter(Boolean);

    return {
      id: a.id,
      testId: a.quiz_set_id,
      testName: a.test_name,
      testNames,
      mode: a.mode,
      totalQuestions: a.total_questions,
      correctCount: a.correct_count,
      score: Number(a.score_percent),
      duration: a.duration_seconds,
      startedAt: a.started_at,
      completedAt: a.completed_at,
      questions,
      answers: answersMap,
      answersList: sortedAnswers.map((ans) => ({
        questionId: ans.question_id,
        questionSnapshot: ans.question_snapshot,
        selectedIndices: ans.selected_indices || [],
        isCorrect: ans.is_correct,
      })),
    };
  });
}

export async function saveQuizAttempt(attempt) {
  const questions = Array.isArray(attempt.questions) ? attempt.questions : [];
  const answersMap = attempt.answers && typeof attempt.answers === 'object' ? attempt.answers : {};

  // Build normalized answersList from either canonical answersList or legacy { questions, answers }
  const answersList = Array.isArray(attempt.answersList) && attempt.answersList.length > 0
    ? attempt.answersList
    : questions.map((q) => {
        const selected = Array.isArray(answersMap[q.id]) ? answersMap[q.id] : [];
        const correct = Array.isArray(q.correctIndices) ? q.correctIndices : [];
        const isCorrect =
          selected.length === correct.length &&
          selected.slice().sort().every((v, i) => v === correct.slice().sort()[i]);
        return {
          questionId: q.id || null,
          questionSnapshot: q,
          selectedIndices: selected,
          isCorrect,
        };
      });

  const testNames = Array.isArray(attempt.testNames) && attempt.testNames.length > 0
    ? attempt.testNames
    : [attempt.testName || 'Bài thi'];

  const payload = {
    id: attempt.id,
    testId: attempt.testId || null,
    testName: testNames.join(', ') || attempt.testName || 'Bài thi',
    testNames,
    questions,
    mode: attempt.mode === 'exam' ? 'exam' : 'practice',
    totalQuestions: attempt.totalQuestions ?? questions.length,
    correctCount: attempt.correctCount ?? 0,
    score: Number(attempt.score) || 0,
    duration: attempt.duration || 0,
    startedAt: attempt.startedAt || new Date().toISOString(),
    completedAt: attempt.completedAt || new Date().toISOString(),
    answersList,
  };

  const { data, error } = await supabase.rpc('save_quiz_attempt_atomic', {
    p_attempt: payload,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQuizAttempt(userId, attemptId) {
  const { error } = await supabase
    .from('quiz_attempts')
    .delete()
    .eq('id', attemptId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
