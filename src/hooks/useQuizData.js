import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasSupabase } from '../lib/supabase';
import {
  fetchQuizDomain,
  upsertQuizCollection,
  deleteQuizCollection,
  saveQuizSetWithQuestions,
  deleteQuizSet,
} from '../services/quizService';
import {
  fetchVocabularyDomain,
  upsertVocabCollection,
  deleteVocabCollection,
  saveVocabDeckWithCards,
  deleteVocabDeck,
} from '../services/vocabularyService';
import { fetchLearningProgress, applyProgressDelta } from '../services/learningProgressService';
import { fetchQuizHistory, saveQuizAttempt, deleteQuizAttempt } from '../services/historyService';
import { fetchUserPreferences, saveUserPreferences } from '../services/settingsService';

const EMPTY_DATA = {
  collections: [],
  tests: [],
  history: [],
  settings: { shuffleQuestions: true, shuffleOptions: false, practiceMode: 'submit' },
  questionStats: {},
  vocabCollections: [],
  vocabDecks: [],
  vocabStats: {},
  activityLog: {},
  mooskCount: 0,
};

async function fetchAllUserData(userId) {
  const [quizDomain, vocabDomain, progress, history, settings] = await Promise.all([
    fetchQuizDomain(),
    fetchVocabularyDomain(),
    fetchLearningProgress(userId),
    fetchQuizHistory(userId),
    fetchUserPreferences(userId),
  ]);

  return {
    collections: quizDomain.collections,
    tests: quizDomain.tests,
    vocabCollections: vocabDomain.vocabCollections,
    vocabDecks: vocabDomain.vocabDecks,
    history,
    settings,
    questionStats: progress.questionStats,
    vocabStats: progress.vocabStats,
    activityLog: progress.activityLog,
    mooskCount: progress.mooskCount,
  };
}

function computeQuestionDeltas(prevStats = {}, nextStats = {}) {
  const deltas = [];
  for (const [questionId, next] of Object.entries(nextStats)) {
    const prev = prevStats[questionId] || { attempts: 0, correct: 0, wrong: 0 };
    const attemptsDelta = Math.max(0, (next.attempts || 0) - (prev.attempts || 0));
    const correctDelta = Math.max(0, (next.correct || 0) - (prev.correct || 0));
    const wrongDelta = Math.max(0, (next.wrong || 0) - (prev.wrong || 0));
    if (attemptsDelta > 0 || correctDelta > 0 || wrongDelta > 0) {
      deltas.push({ questionId, attemptsDelta, correctDelta, wrongDelta });
    }
  }
  return deltas;
}

function computeVocabDeltas(prevStats = {}, nextStats = {}) {
  const deltas = [];
  for (const [flashcardId, next] of Object.entries(nextStats)) {
    const prev = prevStats[flashcardId] || { reviewCount: 0, correctCount: 0, wrongCount: 0, mastered: false };
    const reviewDelta = Math.max(0, (next.reviewCount || 0) - (prev.reviewCount || 0));
    const correctDelta = Math.max(0, (next.correctCount || 0) - (prev.correctCount || 0));
    const wrongDelta = Math.max(0, (next.wrongCount || 0) - (prev.wrongCount || 0));
    const masteredChanged = Boolean(next.mastered) !== Boolean(prev.mastered);
    if (reviewDelta > 0 || correctDelta > 0 || wrongDelta > 0 || masteredChanged) {
      deltas.push({
        flashcardId,
        reviewDelta,
        correctDelta,
        wrongDelta,
        mastered: Boolean(next.mastered),
      });
    }
  }
  return deltas;
}

export function useQuizData(user, isAdmin = false) {
  const userId = user?.id || null;
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState('synced');
  const activeUserRef = useRef(userId);
  activeUserRef.current = userId;

  const query = useQuery({
    queryKey: ['centralized-quiz-data', userId],
    queryFn: () => fetchAllUserData(userId),
    enabled: Boolean(hasSupabase && userId),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!userId) {
      setSyncStatus('unauthenticated');
      queryClient.removeQueries({ queryKey: ['centralized-quiz-data'] });
      return;
    }
    if (query.isError) {
      setSyncStatus('error');
    } else if (query.data) {
      setSyncStatus('synced');
    }
  }, [userId, query.data, query.isError, queryClient]);

  const refresh = useCallback(async () => {
    if (!userId) return EMPTY_DATA;
    const res = await query.refetch();
    return res.data || EMPTY_DATA;
  }, [userId, query]);

  const mutation = useMutation({
    mutationFn: async ({ prev, next, targetUserId, operationId }) => {
      if (!targetUserId) throw new Error('Chưa đăng nhập.');

      // 1. Personal settings
      if (next.settings !== prev.settings) {
        await saveUserPreferences(targetUserId, next.settings);
      }

      // 2. Concurrent-safe idempotent learning progress deltas
      const questionDeltas = next.questionStats !== prev.questionStats
        ? computeQuestionDeltas(prev.questionStats, next.questionStats)
        : [];
      const vocabDeltas = next.vocabStats !== prev.vocabStats
        ? computeVocabDeltas(prev.vocabStats, next.vocabStats)
        : [];

      const activityEntries = [];
      if (next.activityLog !== prev.activityLog) {
        for (const [dateStr, val] of Object.entries(next.activityLog || {})) {
          const prevVal = prev.activityLog?.[dateStr] || 0;
          if (val > prevVal) {
            activityEntries.push({ date: dateStr, delta: val - prevVal });
          }
        }
      }

      const mooskDelta = next.mooskCount !== prev.mooskCount
        ? Math.max(0, (next.mooskCount || 0) - (prev.mooskCount || 0))
        : 0;

      if (questionDeltas.length > 0 || vocabDeltas.length > 0 || activityEntries.length > 0 || mooskDelta > 0) {
        const primaryAct = activityEntries[0] || { date: null, delta: 0 };
        await applyProgressDelta({
          operationId,
          questionDeltas,
          vocabDeltas,
          activityDate: primaryAct.date,
          activityDelta: primaryAct.delta,
          mooskDelta,
        });
        for (let i = 1; i < activityEntries.length; i++) {
          await applyProgressDelta({
            operationId: `${operationId}:act:${i}`,
            questionDeltas: [],
            vocabDeltas: [],
            activityDate: activityEntries[i].date,
            activityDelta: activityEntries[i].delta,
            mooskDelta: 0,
          });
        }
      }

      // 3. Quiz history attempts
      if (next.history !== prev.history) {
        const prevIds = new Set((prev.history || []).map((h) => h.id));
        const nextIds = new Set((next.history || []).map((h) => h.id));

        for (const h of next.history || []) {
          if (!prevIds.has(h.id)) {
            await saveQuizAttempt(h);
          }
        }
        for (const h of prev.history || []) {
          if (!nextIds.has(h.id)) {
            await deleteQuizAttempt(targetUserId, h.id);
          }
        }
      }

      // 4. Shared learning content (ADMIN only)
      const sharedTouched =
        next.collections !== prev.collections ||
        next.tests !== prev.tests ||
        next.vocabCollections !== prev.vocabCollections ||
        next.vocabDecks !== prev.vocabDecks;

      if (sharedTouched && !isAdmin) {
        throw new Error('Forbidden: Chỉ Quản trị viên mới được chỉnh sửa nội dung chung.');
      }

      let canonical = { ...next };

      if (isAdmin && next.collections !== prev.collections) {
        const prevMap = new Map((prev.collections || []).map((c) => [c.id, c]));
        const nextIds = new Set((next.collections || []).map((c) => c.id));
        for (const col of next.collections || []) {
          if (prevMap.get(col.id) !== col) {
            await upsertQuizCollection(col, targetUserId);
          }
        }
        for (const col of prev.collections || []) {
          if (!nextIds.has(col.id)) {
            await deleteQuizCollection(col.id);
          }
        }
      }

      if (isAdmin && next.tests !== prev.tests) {
        const prevMap = new Map((prev.tests || []).map((t) => [t.id, t]));
        const nextIds = new Set((next.tests || []).map((t) => t.id));
        const updatedTests = [...(next.tests || [])];
        for (let i = 0; i < updatedTests.length; i++) {
          const test = updatedTests[i];
          if (prevMap.get(test.id) !== test) {
            const saved = await saveQuizSetWithQuestions(test);
            if (saved?.version) {
              updatedTests[i] = { ...test, version: saved.version, updatedAt: saved.updated_at || test.updatedAt };
            }
          }
        }
        canonical = { ...canonical, tests: updatedTests };
        for (const test of prev.tests || []) {
          if (!nextIds.has(test.id)) {
            await deleteQuizSet(test.id);
          }
        }
      }

      if (isAdmin && next.vocabCollections !== prev.vocabCollections) {
        const prevMap = new Map((prev.vocabCollections || []).map((c) => [c.id, c]));
        const nextIds = new Set((next.vocabCollections || []).map((c) => c.id));
        for (const col of next.vocabCollections || []) {
          if (prevMap.get(col.id) !== col) {
            await upsertVocabCollection(col, targetUserId);
          }
        }
        for (const col of prev.vocabCollections || []) {
          if (!nextIds.has(col.id)) {
            await deleteVocabCollection(col.id);
          }
        }
      }

      if (isAdmin && next.vocabDecks !== prev.vocabDecks) {
        const prevMap = new Map((prev.vocabDecks || []).map((d) => [d.id, d]));
        const nextIds = new Set((next.vocabDecks || []).map((d) => d.id));
        const updatedDecks = [...(next.vocabDecks || [])];
        for (let i = 0; i < updatedDecks.length; i++) {
          const deck = updatedDecks[i];
          if (prevMap.get(deck.id) !== deck) {
            const saved = await saveVocabDeckWithCards(deck);
            if (saved?.version) {
              updatedDecks[i] = { ...deck, version: saved.version, updatedAt: saved.updated_at || deck.updatedAt };
            }
          }
        }
        canonical = { ...canonical, vocabDecks: updatedDecks };
        for (const deck of prev.vocabDecks || []) {
          if (!nextIds.has(deck.id)) {
            await deleteVocabDeck(deck.id);
          }
        }
      }

      return { canonical, targetUserId };
    },
    onMutate: async ({ next, targetUserId }) => {
      await queryClient.cancelQueries({ queryKey: ['centralized-quiz-data', targetUserId] });
      const snapshot = queryClient.getQueryData(['centralized-quiz-data', targetUserId]) || EMPTY_DATA;
      queryClient.setQueryData(['centralized-quiz-data', targetUserId], next);
      setSyncStatus('syncing');
      return { snapshot, targetUserId };
    },
    onSuccess: ({ canonical, targetUserId }) => {
      if (activeUserRef.current !== targetUserId) return;
      queryClient.setQueryData(['centralized-quiz-data', targetUserId], canonical);
      setSyncStatus('synced');
    },
    onError: (err, _vars, context) => {
      if (context?.targetUserId && activeUserRef.current === context.targetUserId) {
        queryClient.setQueryData(['centralized-quiz-data', context.targetUserId], context.snapshot);
        queryClient.invalidateQueries({ queryKey: ['centralized-quiz-data', context.targetUserId] });
        setSyncStatus('error');
      }
      console.error('Centralized DB save failed (rolled back):', err);
    },
  });

  const update = useCallback(
    async (newData, options = {}) => {
      if (!userId) return;
      const prev = queryClient.getQueryData(['centralized-quiz-data', userId]) || EMPTY_DATA;
      const operationId = options?.operationId || crypto.randomUUID();
      return mutation.mutateAsync({ prev, next: newData, targetUserId: userId, operationId });
    },
    [userId, queryClient, mutation]
  );

  return {
    data: userId ? (query.data || EMPTY_DATA) : EMPTY_DATA,
    isLoading: Boolean(userId && query.isLoading),
    loadError: query.error?.message || null,
    update,
    refresh,
    syncStatus,
  };
}
