import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  fetchLearningProgress,
  upsertQuestionStats,
  upsertVocabProgress,
  upsertDailyActivity,
  upsertMooskCount,
} from '../services/learningProgressService';
import { fetchQuizHistory, saveQuizAttempt, deleteQuizAttempt } from '../services/historyService';
import { fetchUserPreferences, saveUserPreferences } from '../services/settingsService';
import { recordCentralAuditLog } from '../services/auditService';

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

export function useQuizData(user, isAdmin = false) {
  const userId = user?.id || null;
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState('synced');
  const [localData, setLocalData] = useState(EMPTY_DATA);
  const dataRef = useRef(EMPTY_DATA);

  const query = useQuery({
    queryKey: ['centralized-quiz-data', userId],
    queryFn: () => fetchAllUserData(userId),
    enabled: Boolean(hasSupabase && userId),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!userId) {
      dataRef.current = EMPTY_DATA;
      setLocalData(EMPTY_DATA);
      setSyncStatus('unauthenticated');
      return;
    }
    if (query.data) {
      dataRef.current = query.data;
      setLocalData(query.data);
      setSyncStatus('synced');
    } else if (query.isError) {
      setSyncStatus('error');
    }
  }, [userId, query.data, query.isError]);

  const refresh = useCallback(async () => {
    if (!userId) return EMPTY_DATA;
    const res = await query.refetch();
    return res.data || dataRef.current;
  }, [userId, query]);

  const update = useCallback(async (newData) => {
    if (!userId) return;

    const prev = dataRef.current;
    dataRef.current = newData;
    setLocalData(newData);
    queryClient.setQueryData(['centralized-quiz-data', userId], newData);
    setSyncStatus('syncing');

    try {
      const tasks = [];

      // 1. Personal data updates (allowed for any ACTIVE user)
      if (newData.settings !== prev.settings) {
        tasks.push(saveUserPreferences(userId, newData.settings));
      }

      if (newData.questionStats !== prev.questionStats) {
        tasks.push(upsertQuestionStats(userId, newData.questionStats));
      }

      if (newData.vocabStats !== prev.vocabStats) {
        tasks.push(upsertVocabProgress(userId, newData.vocabStats));
      }

      if (newData.activityLog !== prev.activityLog) {
        tasks.push(upsertDailyActivity(userId, newData.activityLog));
      }

      if (newData.mooskCount !== prev.mooskCount) {
        tasks.push(upsertMooskCount(userId, newData.mooskCount));
      }

      if (newData.history !== prev.history) {
        const prevIds = new Set((prev.history || []).map((h) => h.id));
        const nextIds = new Set((newData.history || []).map((h) => h.id));

        for (const h of newData.history || []) {
          if (!prevIds.has(h.id)) {
            tasks.push(saveQuizAttempt(userId, h));
          }
        }
        for (const h of prev.history || []) {
          if (!nextIds.has(h.id)) {
            tasks.push(deleteQuizAttempt(userId, h.id));
          }
        }
      }

      // 2. Shared learning content updates (ADMIN only; RLS also enforces on DB)
      if (isAdmin) {
        if (newData.collections !== prev.collections) {
          const prevMap = new Map((prev.collections || []).map((c) => [c.id, c]));
          const nextIds = new Set((newData.collections || []).map((c) => c.id));
          for (const col of newData.collections || []) {
            if (prevMap.get(col.id) !== col) {
              tasks.push(upsertQuizCollection(col, userId));
            }
          }
          for (const col of prev.collections || []) {
            if (!nextIds.has(col.id)) {
              tasks.push(deleteQuizCollection(col.id));
            }
          }
        }

        if (newData.tests !== prev.tests) {
          const prevMap = new Map((prev.tests || []).map((t) => [t.id, t]));
          const nextIds = new Set((newData.tests || []).map((t) => t.id));
          for (const test of newData.tests || []) {
            if (prevMap.get(test.id) !== test) {
              tasks.push(saveQuizSetWithQuestions(test, userId));
              tasks.push(recordCentralAuditLog({
                actorUserId: userId,
                action: prevMap.has(test.id) ? 'ADMIN_QUIZ_SET_UPDATE' : 'ADMIN_QUIZ_SET_CREATE',
                entityType: 'quiz_set',
                entityId: test.id,
                metadata: { name: test.name, questionCount: test.questions?.length || 0 },
              }));
            }
          }
          for (const test of prev.tests || []) {
            if (!nextIds.has(test.id)) {
              tasks.push(deleteQuizSet(test.id));
              tasks.push(recordCentralAuditLog({
                actorUserId: userId,
                action: 'ADMIN_QUIZ_SET_DELETE',
                entityType: 'quiz_set',
                entityId: test.id,
                metadata: { name: test.name },
              }));
            }
          }
        }

        if (newData.vocabCollections !== prev.vocabCollections) {
          const prevMap = new Map((prev.vocabCollections || []).map((c) => [c.id, c]));
          const nextIds = new Set((newData.vocabCollections || []).map((c) => c.id));
          for (const col of newData.vocabCollections || []) {
            if (prevMap.get(col.id) !== col) {
              tasks.push(upsertVocabCollection(col, userId));
            }
          }
          for (const col of prev.vocabCollections || []) {
            if (!nextIds.has(col.id)) {
              tasks.push(deleteVocabCollection(col.id));
            }
          }
        }

        if (newData.vocabDecks !== prev.vocabDecks) {
          const prevMap = new Map((prev.vocabDecks || []).map((d) => [d.id, d]));
          const nextIds = new Set((newData.vocabDecks || []).map((d) => d.id));
          for (const deck of newData.vocabDecks || []) {
            if (prevMap.get(deck.id) !== deck) {
              tasks.push(saveVocabDeckWithCards(deck, userId));
              tasks.push(recordCentralAuditLog({
                actorUserId: userId,
                action: prevMap.has(deck.id) ? 'ADMIN_VOCAB_DECK_UPDATE' : 'ADMIN_VOCAB_DECK_CREATE',
                entityType: 'vocab_deck',
                entityId: deck.id,
                metadata: { name: deck.name, cardCount: deck.cards?.length || 0 },
              }));
            }
          }
          for (const deck of prev.vocabDecks || []) {
            if (!nextIds.has(deck.id)) {
              tasks.push(deleteVocabDeck(deck.id));
              tasks.push(recordCentralAuditLog({
                actorUserId: userId,
                action: 'ADMIN_VOCAB_DECK_DELETE',
                entityType: 'vocab_deck',
                entityId: deck.id,
                metadata: { name: deck.name },
              }));
            }
          }
        }
      }

      await Promise.all(tasks);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Centralized DB save failed:', err);
      setSyncStatus('error');
      throw err;
    }
  }, [userId, isAdmin, queryClient]);

  return {
    data: localData,
    isLoading: query.isLoading,
    loadError: query.error?.message || null,
    update,
    refresh,
    syncStatus,
  };
}
