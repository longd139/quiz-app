import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { shuffle } from '../data/storage';
import { speakWord, speakWordAuto } from '../lib/tts';
import { IconSpeaker, IconCheck, IconCross, IconCards, IconRotate, IconArrowLeft, IconSettings, IconLink } from '../components/Icons';
import { getBadgeColor } from '../data/badgeColors';

// Smart answer matcher: ignores case, accents formatting (NFC), extra punctuation, spaces, alternatives & parentheses
function checkAnswerMatch(userInput, targetAnswer) {
  if (!userInput || !targetAnswer) return false;

  const normalizeStr = (str) => {
    if (!str) return '';
    return str
      .normalize('NFC')
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”…\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normUser = normalizeStr(userInput);
  const normTarget = normalizeStr(targetAnswer);

  if (!normUser) return false;
  if (normUser === normTarget) return true;

  // Check alternatives separated by comma, semicolon, slash, newline, "hoặc", "or" (case-insensitive)
  const rawParts = targetAnswer
    .normalize('NFC')
    .split(/[\n,;/]|\bhoặc\b|\bor\b/i);

  for (const part of rawParts) {
    const normPart = normalizeStr(part);
    if (normPart && normPart === normUser) return true;
  }

  // Check matching without text inside parentheses/brackets e.g. "Ma trận truy vết (RTM)" -> "Ma trận truy vết"
  const withoutParens = targetAnswer.replace(/\(.*?\)|\[.*?\]/g, '');
  const normWithoutParens = normalizeStr(withoutParens);
  if (normWithoutParens && normWithoutParens === normUser) return true;

  // Check matching text inside parentheses/brackets e.g. "(RTM)" -> "rtm"
  const parensMatches = targetAnswer.match(/\((.*?)\)|\[(.*?)\]/g);
  if (parensMatches) {
    for (const match of parensMatches) {
      const insideNorm = normalizeStr(match);
      if (insideNorm && insideNorm === normUser) return true;
    }
  }

  return false;
}

// 1x1 transparent image to hide the browser's default drag ghost preview
const EMPTY_DRAG_IMAGE = typeof window !== 'undefined' ? (() => {
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return img;
})() : null;

export default function VocabQuiz() {
  const { data } = useQuiz();
  const navigate = useNavigate();
  const location = useLocation();

  const vocabDecks = data.vocabDecks || [];
  const initialDeckId = location.state?.deckId || (vocabDecks[0]?.id || '');
  const initialMode = location.state?.mode;

  const [selectedDeckId, setSelectedDeckId] = useState(initialDeckId);
  const [direction, setDirection] = useState('term-to-meaning'); // 'term-to-meaning' | 'meaning-to-term'
  const [allowChoice, setAllowChoice] = useState(initialMode === 'matching' ? false : (initialMode === 'flashcard' ? false : true));
  const [allowWritten, setAllowWritten] = useState(false);
  const [allowFlashcard, setAllowFlashcard] = useState(initialMode === 'flashcard' ? true : false);
  const [allowMatching, setAllowMatching] = useState(initialMode === 'matching' ? true : false);
  const [showSettings, setShowSettings] = useState(false);
  const [hidePhonetic, setHidePhonetic] = useState(() => {
    return localStorage.getItem('vocab_quiz_hide_phonetic') === 'true';
  });

  const handleToggleHidePhonetic = () => {
    setHidePhonetic(prev => {
      const next = !prev;
      localStorage.setItem('vocab_quiz_hide_phonetic', String(next));
      return next;
    });
  };

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Multiple Choice State
  const [selectedOption, setSelectedOption] = useState(null);

  // Written / Typing State
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isCorrectWritten, setIsCorrectWritten] = useState(null);
  const [retypedText, setRetypedText] = useState('');
  const [isOverridden, setIsOverridden] = useState(false);

  // Flashcard State
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [flashcardSlide, setFlashcardSlide] = useState(null); // 'remembered' | 'review' | null

  // Matching State (Nối từ)
  const [matchedPairIds, setMatchedPairIds] = useState([]);
  const [draggingTermId, setDraggingTermId] = useState(null);
  const [dragOverMeaningId, setDragOverMeaningId] = useState(null);
  const [selectedTermId, setSelectedTermId] = useState(null);
  const [wrongFeedback, setWrongFeedback] = useState(null); // { meaningId, termId }
  const [dragLine, setDragLine] = useState(null); // { fromX, fromY, toX, toY, termId, status: 'dragging' | 'matched' | 'wrong' | 'fading' }
  const draggingTermIdRef = useRef(null);
  const isFlashcardAnimatingRef = useRef(false);
  const autoNextTimerRef = useRef(null);
  const handleNextRef = useRef(null);

  // Clear auto-next timer on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
    };
  }, []);

  // Common question state
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [wrongItems, setWrongItems] = useState([]);
  const [masteredCardIds, setMasteredCardIds] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  const currentDeck = useMemo(() => {
    return vocabDecks.find(d => d.id === selectedDeckId) || vocabDecks[0] || null;
  }, [vocabDecks, selectedDeckId]);

  const totalWords = currentDeck?.cards?.length || 0;
  const masteredCount = masteredCardIds.size;

  const handleToggleChoice = () => {
    if (allowChoice && !allowWritten && !allowFlashcard && !allowMatching) return; // Keep at least 1 selected
    setAllowChoice(prev => !prev);
  };

  const handleToggleWritten = () => {
    if (allowWritten && !allowChoice && !allowFlashcard && !allowMatching) return; // Keep at least 1 selected
    setAllowWritten(prev => !prev);
  };

  const handleToggleFlashcard = () => {
    if (allowFlashcard && !allowChoice && !allowWritten && !allowMatching) return; // Keep at least 1 selected
    setAllowFlashcard(prev => !prev);
  };

  const handleToggleMatching = () => {
    if (allowMatching && !allowChoice && !allowWritten && !allowFlashcard) return; // Keep at least 1 selected
    setAllowMatching(prev => !prev);
  };

  const resetSingleQuestionState = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setSelectedOption(null);
    setTypedAnswer('');
    setIsCorrectWritten(null);
    setRetypedText('');
    setIsOverridden(false);
    setIsCardFlipped(false);
    setFlashcardSlide(null);
    isFlashcardAnimatingRef.current = false;
    setIsAnswered(false);
    setMatchedPairIds([]);
    setDraggingTermId(null);
    setDragOverMeaningId(null);
    setSelectedTermId(null);
    setWrongFeedback(null);
    setDragLine(null);
  };

  const resetQuestionStates = () => {
    setCurrentIndex(0);
    resetSingleQuestionState();
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setWrongItems([]);
    setMasteredCardIds(new Set());
    setIsCompleted(false);
  };

  // Helper to generate a single question for a specific card
  const makeQuestionForCard = (card, forcedType = null) => {
    const isTermToMeaning = direction === 'term-to-meaning';
    const activeTypes = [];
    if (allowChoice) activeTypes.push('choice');
    if (allowWritten) activeTypes.push('written');
    if (allowFlashcard) activeTypes.push('flashcard');
    if (activeTypes.length === 0) activeTypes.push('choice');

    const type = forcedType || activeTypes[Math.floor(Math.random() * activeTypes.length)];
    const prompt = isTermToMeaning ? card.term : card.meaning;
    const correctAnswer = isTermToMeaning ? card.meaning : card.term;

    const otherCards = (currentDeck?.cards || []).filter(c => c.id !== card.id);
    const shuffledOthers = shuffle(otherCards).slice(0, 3);
    const distractors = shuffledOthers.map(c => isTermToMeaning ? c.meaning : c.term);
    const allOptions = shuffle([correctAnswer, ...distractors]);
    const correctIdx = allOptions.indexOf(correctAnswer);

    return {
      card,
      type,
      prompt,
      correctAnswer,
      options: allOptions,
      correctIdx
    };
  };

  // Re-insert wrong question at a random future position (ngẫu nhiên không theo số câu nhất định)
  const requeueWrongQuestion = (card) => {
    if (!card) return;
    const newQ = makeQuestionForCard(card);
    setQuestions(prev => {
      const remainingAhead = prev.length - 1 - currentIndex;
      if (remainingAhead <= 0) {
        return [...prev, newQ];
      }
      if (remainingAhead === 1) {
        const nextList = [...prev];
        nextList.splice(currentIndex + 2, 0, newQ);
        return nextList;
      }
      // Insert at a random position ahead (between currentIndex + 2 and prev.length)
      const minIdx = currentIndex + 2;
      const maxIdx = prev.length;
      const insertIdx = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
      const nextList = [...prev];
      nextList.splice(insertIdx, 0, newQ);
      return nextList;
    });
  };

  // Remove future duplicates once a card is answered correctly
  const removeFutureDuplicatesOfCard = (cardId) => {
    setQuestions(prev => {
      return prev.filter((q, idx) => {
        if (idx <= currentIndex) return true;
        if (q.card?.id !== cardId) return true;
        return false;
      });
    });
  };

  // Generate quiz questions
  const generateQuiz = () => {
    if (!currentDeck || !currentDeck.cards || currentDeck.cards.length < 2) return;
    const cards = shuffle([...currentDeck.cards]);
    const isTermToMeaning = direction === 'term-to-meaning';

    const enabledTypes = [];
    if (allowChoice) enabledTypes.push('choice');
    if (allowWritten) enabledTypes.push('written');
    if (allowFlashcard) enabledTypes.push('flashcard');
    if (allowMatching) enabledTypes.push('matching');

    if (enabledTypes.length === 0) enabledTypes.push('choice');

    // Case 1: ONLY Matching is selected
    if (enabledTypes.length === 1 && enabledTypes[0] === 'matching') {
      const generated = [];
      const pairCount = Math.min(4, cards.length);
      for (let i = 0; i < cards.length; i += pairCount) {
        let chunk = cards.slice(i, i + pairCount);
        if (chunk.length < pairCount && cards.length >= pairCount) {
          const fillers = cards.filter(c => !chunk.some(ch => ch.id === c.id));
          chunk = [...chunk, ...fillers.slice(0, pairCount - chunk.length)];
        }
        if (chunk.length >= 2) {
          const terms = shuffle(chunk.map(c => ({
            id: c.id,
            text: isTermToMeaning ? c.term : c.meaning,
            card: c
          })));
          const meanings = shuffle(chunk.map(c => ({
            id: c.id,
            text: isTermToMeaning ? c.meaning : c.term,
            card: c
          })));
          generated.push({
            type: 'matching',
            cards: chunk,
            terms,
            meanings,
            totalPairs: chunk.length
          });
        }
      }
      setQuestions(generated.length > 0 ? generated : []);
      resetQuestionStates();
      return;
    }

    // Case 2: Mixed modes or standard single-question modes
    const generated = [];
    let cardIndex = 0;
    let qIdx = 0;

    while (cardIndex < cards.length) {
      const qType = enabledTypes[qIdx % enabledTypes.length];
      qIdx++;

      if (qType === 'matching') {
        const pairCount = Math.min(4, cards.length);
        let chunk = cards.slice(cardIndex, cardIndex + pairCount);
        if (chunk.length < pairCount && cards.length >= pairCount) {
          const fillers = cards.filter(c => !chunk.some(ch => ch.id === c.id));
          chunk = [...chunk, ...fillers.slice(0, pairCount - chunk.length)];
        }
        if (chunk.length >= 2) {
          const terms = shuffle(chunk.map(c => ({
            id: c.id,
            text: isTermToMeaning ? c.term : c.meaning,
            card: c
          })));
          const meanings = shuffle(chunk.map(c => ({
            id: c.id,
            text: isTermToMeaning ? c.meaning : c.term,
            card: c
          })));
          generated.push({
            type: 'matching',
            cards: chunk,
            terms,
            meanings,
            totalPairs: chunk.length
          });
        }
        cardIndex += Math.max(1, chunk.length);
      } else {
        const card = cards[cardIndex];
        const prompt = isTermToMeaning ? card.term : card.meaning;
        const correctAnswer = isTermToMeaning ? card.meaning : card.term;

        const otherCards = currentDeck.cards.filter(c => c.id !== card.id);
        const shuffledOthers = shuffle(otherCards).slice(0, 3);
        const distractors = shuffledOthers.map(c => isTermToMeaning ? c.meaning : c.term);

        const allOptions = shuffle([correctAnswer, ...distractors]);
        const correctIdx = allOptions.indexOf(correctAnswer);

        generated.push({
          card,
          type: qType,
          prompt,
          correctAnswer,
          options: allOptions,
          correctIdx
        });
        cardIndex++;
      }
    }

    setQuestions(generated);
    resetQuestionStates();
  };

  useEffect(() => {
    generateQuiz();
  }, [currentDeck, direction, allowChoice, allowWritten, allowFlashcard, allowMatching]);

  const currentQ = questions[currentIndex] || null;

  // Speak word automatically when question loads (if term is visible and auto-read is enabled)
  useEffect(() => {
    if (currentQ && currentDeck && direction === 'term-to-meaning') {
      if (currentQ.type !== 'matching' && currentQ.card) {
        speakWordAuto(currentQ.card.term, currentDeck.targetLanguage || 'en-US');
      }
    }
  }, [currentQ, currentDeck, direction]);

  // Multiple choice click
  const handleSelectOption = (optIndex) => {
    if (isAnswered) return;
    setSelectedOption(optIndex);
    setIsAnswered(true);

    const isCorrect = optIndex === currentQ.correctIdx;
    if (isCorrect) {
      setScore(s => s + 1);
      if (currentQ.card) {
        setMasteredCardIds(prev => new Set(prev).add(currentQ.card.id));
        removeFutureDuplicatesOfCard(currentQ.card.id);
      }
      setStreak(s => {
        const next = s + 1;
        setMaxStreak(m => Math.max(m, next));
        return next;
      });
    } else {
      if (currentQ.card) {
        requeueWrongQuestion(currentQ.card);
        setWrongItems(prev => prev.some(c => c.id === currentQ.card.id) ? prev : [...prev, currentQ.card]);
      }
      setStreak(0);
    }

    if (currentDeck && currentQ.card) {
      speakWordAuto(currentQ.card.term, currentDeck.targetLanguage || 'en-US');
    }

    // Tự động chuyển câu sau 2 giây không cần ấn
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    autoNextTimerRef.current = setTimeout(() => {
      handleNextRef.current?.();
    }, 2000);
  };

  // Written answer submit
  const handleWrittenSubmit = (e) => {
    if (e) e.preventDefault();
    if (isAnswered || !typedAnswer.trim()) return;

    const isCorrect = checkAnswerMatch(typedAnswer, currentQ.correctAnswer);
    setIsAnswered(true);
    setIsCorrectWritten(isCorrect);

    if (isCorrect) {
      setScore(s => s + 1);
      if (currentQ.card) {
        setMasteredCardIds(prev => new Set(prev).add(currentQ.card.id));
        removeFutureDuplicatesOfCard(currentQ.card.id);
      }
      setStreak(s => {
        const next = s + 1;
        setMaxStreak(m => Math.max(m, next));
        return next;
      });

      // Tự động chuyển câu sau 2 giây nếu trả lời đúng
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => {
        handleNextRef.current?.();
      }, 2000);
    } else {
      if (currentQ.card) {
        requeueWrongQuestion(currentQ.card);
        setWrongItems(prev => prev.some(c => c.id === currentQ.card.id) ? prev : [...prev, currentQ.card]);
      }
      setStreak(0);
    }

    if (currentDeck && currentQ.card) {
      speakWordAuto(currentQ.card.term, currentDeck.targetLanguage || 'en-US');
    }
  };

  // Don't know button for written questions
  const handleDontKnow = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setIsCorrectWritten(false);
    setStreak(0);
    if (currentQ.card) {
      requeueWrongQuestion(currentQ.card);
      setWrongItems(prev => prev.some(c => c.id === currentQ.card.id) ? prev : [...prev, currentQ.card]);
    }
    if (currentDeck && currentQ.card) {
      speakWordAuto(currentQ.card.term, currentDeck.targetLanguage || 'en-US');
    }
  };

  // Override answer ("Tôi đã trả lời đúng")
  const handleOverrideCorrect = () => {
    if (isOverridden) return;
    setIsOverridden(true);
    setIsCorrectWritten(true);
    setScore(s => s + 1);
    if (currentQ.card) {
      setMasteredCardIds(prev => new Set(prev).add(currentQ.card.id));
      removeFutureDuplicatesOfCard(currentQ.card.id);
      setWrongItems(prev => prev.filter(c => c.id !== currentQ.card.id));
    }
    setStreak(s => {
      const next = s + 1;
      setMaxStreak(m => Math.max(m, next));
      return next;
    });

    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    autoNextTimerRef.current = setTimeout(() => {
      handleNextRef.current?.();
    }, 2000);
  };

  // Matching attempt (drop or click)
  const handleAttemptMatch = (termId, meaningId) => {
    if (!currentQ || currentQ.type !== 'matching' || isAnswered) return;
    if (matchedPairIds.includes(termId) || matchedPairIds.includes(meaningId)) return;

    const termEl = document.getElementById(`term-card-${termId}`);
    const defEl = document.getElementById(`meaning-card-${meaningId}`);

    let fromX = dragLine?.fromX;
    let fromY = dragLine?.fromY;
    if (termEl && (!fromX || !fromY)) {
      const termRect = termEl.getBoundingClientRect();
      fromX = termRect.right;
      fromY = termRect.top + termRect.height / 2;
    }

    let toX = dragLine?.toX;
    let toY = dragLine?.toY;
    if (defEl) {
      const defRect = defEl.getBoundingClientRect();
      toX = defRect.left;
      toY = defRect.top + defRect.height / 2;
    }

    if (termId === meaningId) {
      // Correct match!
      setMasteredCardIds(prev => new Set(prev).add(termId));
      removeFutureDuplicatesOfCard(termId);

      if (fromX && toX) {
        setDragLine({
          fromX,
          fromY,
          toX,
          toY,
          termId,
          status: 'matched'
        });

        // Smoothly fade out wire
        setTimeout(() => {
          setDragLine(prev => (prev ? { ...prev, status: 'fading' } : null));
          setTimeout(() => {
            setDragLine(null);
          }, 350);
        }, 220);
      } else {
        setDragLine(null);
      }

      const nextMatched = [...matchedPairIds, termId];
      setMatchedPairIds(nextMatched);
      setSelectedTermId(null);
      setDraggingTermId(null);
      setDragOverMeaningId(null);
      setWrongFeedback(null);

      // Speak word automatically on correct match
      const matchedCard = currentQ.cards?.find(c => c.id === termId);
      if (matchedCard && currentDeck) {
        speakWordAuto(matchedCard.term, currentDeck.targetLanguage || 'en-US');
      }

      // Increment streak
      setStreak(s => {
        const next = s + 1;
        setMaxStreak(m => Math.max(m, next));
        return next;
      });

      // Check if all pairs in this question are matched
      if (nextMatched.length === currentQ.totalPairs) {
        setIsAnswered(true);
        setScore(s => s + 1);

        // Tự động chuyển câu sau 2 giây
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = setTimeout(() => {
          handleNextRef.current?.();
        }, 2000);
      }
    } else {
      // Wrong match
      if (fromX && toX) {
        setDragLine({
          fromX,
          fromY,
          toX,
          toY,
          termId,
          status: 'wrong'
        });
        setTimeout(() => {
          setDragLine(prev => (prev ? { ...prev, status: 'fading' } : null));
          setTimeout(() => {
            setDragLine(null);
          }, 250);
        }, 300);
      } else {
        setDragLine(null);
      }

      setStreak(0);
      setWrongFeedback({ meaningId, termId });
      setTimeout(() => {
        setWrongFeedback(null);
      }, 700);

      const wrongCard = currentQ.cards?.find(c => c.id === termId);
      if (wrongCard) {
        requeueWrongQuestion(wrongCard);
        setWrongItems(prev => prev.some(c => c.id === wrongCard.id) ? prev : [...prev, wrongCard]);
      }
    }
  };

  // Flashcard answer ("Cần ôn lại" / "Đã nhớ")
  const handleFlashcardAnswer = (isKnown) => {
    if (isAnswered || isFlashcardAnimatingRef.current) return;
    isFlashcardAnimatingRef.current = true;
    setIsAnswered(true);
    setFlashcardSlide(isKnown ? 'remembered' : 'review');

    if (isKnown) {
      setScore(s => s + 1);
      if (currentQ.card) {
        setMasteredCardIds(prev => new Set(prev).add(currentQ.card.id));
        removeFutureDuplicatesOfCard(currentQ.card.id);
      }
      setStreak(s => {
        const next = s + 1;
        setMaxStreak(m => Math.max(m, next));
        return next;
      });
    } else {
      if (currentQ.card) {
        requeueWrongQuestion(currentQ.card);
        setWrongItems(prev => prev.some(c => c.id === currentQ.card.id) ? prev : [...prev, currentQ.card]);
      }
      setStreak(0);
    }

    if (currentDeck && currentQ.card) {
      speakWordAuto(currentQ.card.term, currentDeck.targetLanguage || 'en-US');
    }

    setTimeout(() => {
      handleNext();
      setFlashcardSlide(null);
      isFlashcardAnimatingRef.current = false;
    }, 360);
  };

  const handleNext = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    // If user has mastered all words in the deck:
    if (totalWords > 0 && masteredCardIds.size >= totalWords) {
      setIsCompleted(true);
      return;
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
      resetSingleQuestionState();
    } else {
      // End of questions list, but some words are still not mastered:
      const unmastered = (currentDeck?.cards || []).filter(c => !masteredCardIds.has(c.id));
      if (unmastered.length > 0) {
        const nextQuestions = shuffle(unmastered).map(c => makeQuestionForCard(c));
        setQuestions(prev => [...prev, ...nextQuestions]);
        setCurrentIndex(i => i + 1);
        resetSingleQuestionState();
      } else {
        setIsCompleted(true);
      }
    }
  };

  handleNextRef.current = handleNext;

  // Update ref for draggingTermId
  useEffect(() => {
    draggingTermIdRef.current = draggingTermId;
  }, [draggingTermId]);

  // Global dragover & pointermove listeners to follow mouse/touch coordinates
  useEffect(() => {
    let animId = null;

    const updateCoord = (clientX, clientY) => {
      if (!draggingTermIdRef.current) return;
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        setDragLine(prev => {
          if (!prev || prev.status === 'matched' || prev.status === 'fading') return prev;
          return {
            ...prev,
            toX: clientX,
            toY: clientY
          };
        });
      });
    };

    const handleGlobalDragOver = (e) => {
      updateCoord(e.clientX, e.clientY);
      if (draggingTermIdRef.current) {
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const meaningCard = targetEl?.closest('[data-meaning-id]');
        const meaningId = meaningCard ? meaningCard.getAttribute('data-meaning-id') : null;
        setDragOverMeaningId(prev => (prev === meaningId ? prev : meaningId));
      }
    };

    const handlePointerMove = (e) => {
      updateCoord(e.clientX, e.clientY);
      if (draggingTermIdRef.current) {
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const meaningCard = targetEl?.closest('[data-meaning-id]');
        const meaningId = meaningCard ? meaningCard.getAttribute('data-meaning-id') : null;
        setDragOverMeaningId(prev => (prev === meaningId ? prev : meaningId));
      }
    };

    const handlePointerUp = (e) => {
      if (!draggingTermIdRef.current) return;
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const meaningCard = targetEl?.closest('[data-meaning-id]');
      setDragOverMeaningId(null);
      if (meaningCard) {
        const meaningId = meaningCard.getAttribute('data-meaning-id');
        if (meaningId) {
          handleAttemptMatch(draggingTermIdRef.current, meaningId);
          return;
        }
      }

      setDraggingTermId(null);
      setDragLine(prev => {
        if (!prev) return null;
        if (prev.status === 'matched' || prev.status === 'fading') return prev;
        return null;
      });
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  // Keyboard navigation shortcuts in flashcard mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentQ?.type === 'flashcard' && !isCompleted && !showSettings && !isFlashcardAnimatingRef.current) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.code === 'Space') {
          e.preventDefault();
          setIsCardFlipped(prev => !prev);
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          handleFlashcardAnswer(false);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          handleFlashcardAnswer(true);
        } else if (e.code === 'ArrowUp' && currentQ?.card) {
          e.preventDefault();
          speakWord(currentQ.card.term, currentDeck?.targetLanguage || 'en-US');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, isCompleted, showSettings, currentDeck, handleFlashcardAnswer]);

  // Practice only missed items
  const handlePracticeMissed = () => {
    if (wrongItems.length === 0) return;
    const cards = shuffle([...wrongItems]);
    const isTermToMeaning = direction === 'term-to-meaning';

    if (allowMatching && !allowChoice && !allowWritten && !allowFlashcard && cards.length >= 2) {
      const pairCount = Math.min(4, cards.length);
      const chunk = cards.slice(0, pairCount);
      const terms = shuffle(chunk.map(c => ({
        id: c.id,
        text: isTermToMeaning ? c.term : c.meaning,
        card: c
      })));
      const meanings = shuffle(chunk.map(c => ({
        id: c.id,
        text: isTermToMeaning ? c.meaning : c.term,
        card: c
      })));
      setQuestions([{
        type: 'matching',
        cards: chunk,
        terms,
        meanings,
        totalPairs: chunk.length
      }]);
    } else {
      const activeTypes = [];
      if (allowChoice) activeTypes.push('choice');
      if (allowWritten) activeTypes.push('written');
      if (allowFlashcard) activeTypes.push('flashcard');
      if (activeTypes.length === 0) activeTypes.push('choice');

      const generated = cards.map((card, idx) => {
        const prompt = isTermToMeaning ? card.term : card.meaning;
        const correctAnswer = isTermToMeaning ? card.meaning : card.term;
        const type = activeTypes[idx % activeTypes.length];

        const otherCards = (currentDeck.cards || []).filter(c => c.id !== card.id);
        const shuffledOthers = shuffle(otherCards).slice(0, 3);
        const distractors = shuffledOthers.map(c => isTermToMeaning ? c.meaning : c.term);
        const allOptions = shuffle([correctAnswer, ...distractors]);
        const correctIdx = allOptions.indexOf(correctAnswer);

        return {
          card,
          type,
          prompt,
          correctAnswer,
          options: allOptions,
          correctIdx
        };
      });
      setQuestions(generated);
    }

    resetQuestionStates();
  };

  if (!currentDeck || !currentDeck.cards || currentDeck.cards.length < 2) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Bộ từ này cần ít nhất 2 từ để bắt đầu học</p>
        <button
          onClick={() => navigate('/vocab-editor')}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
        >
          Thêm từ vựng vào bộ
        </button>
      </div>
    );
  }

  // Completed view
  if (isCompleted) {
    const total = questions.length;
    const percent = Math.round((score / total) * 100);

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center max-w-md mx-auto space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Hoàn thành bài học
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Kết quả Chế độ Học
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {currentDeck.name}
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 max-w-xs mx-auto border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="text-3xl font-mono font-bold text-slate-900 dark:text-slate-100 mb-1">
            {totalWords} / {totalWords}
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ Đã thuộc toàn bộ {totalWords} từ vựng
          </div>
          {maxStreak >= 3 && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
              <span className="streak-flame-icon">🔥</span>
              <span>Chuỗi đúng dài nhất: {maxStreak} câu</span>
            </div>
          )}
        </div>

        {wrongItems.length > 0 && (
          <div className="text-left bg-[#fdf2f2] dark:bg-red-950/20 border border-[#f8d7da] dark:border-red-900/40 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-semibold text-[#842029] dark:text-red-300">
              Các từ cần ôn lại ({wrongItems.length}):
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
              {wrongItems.map((item, i) => {
                const c = item.partOfSpeech ? getBadgeColor(item.badgeColor, item.partOfSpeech) : null;
                return (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.term}</span>
                      {c && (
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${c.bg} ${c.text} ${c.border}`}>
                          {item.partOfSpeech}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 font-sans truncate">{item.meaning}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 max-w-xs mx-auto pt-2">
          {wrongItems.length > 0 && (
            <button
              onClick={handlePracticeMissed}
              className="bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 rounded-lg text-xs font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <IconRotate className="w-3.5 h-3.5" />
              <span>Chỉ ôn lại {wrongItems.length} từ sai</span>
            </button>
          )}

          <button
            onClick={generateQuiz}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <IconRotate className="w-3.5 h-3.5" />
            <span>Học lại toàn bộ bộ từ</span>
          </button>
          <button
            onClick={() => navigate('/vocab-learn', { state: { deckId: currentDeck.id } })}
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-tight transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <IconCards className="w-3.5 h-3.5 text-slate-500" />
            <span>Ôn bằng thẻ Flashcard</span>
          </button>
          <button
            onClick={() => navigate('/vocab')}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 pt-2 cursor-pointer"
          >
            Quay lại Thư viện
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto overflow-x-clip">
      {/* Top Bar: Back button on Left, Settings on Right */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/vocab');
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer group shadow-2xs shrink-0"
          title="Quay lại"
        >
          <IconArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-500 dark:text-slate-400" />
          <span>Quay lại</span>
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs shrink-0"
          title="Cài đặt hình thức học"
        >
          <IconSettings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Cài đặt</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
            {(() => {
              const active = [];
              if (allowChoice) active.push('Trắc nghiệm');
              if (allowWritten) active.push('Gõ chữ');
              if (allowFlashcard) active.push('Flashcard');
              if (allowMatching) active.push('Nối từ');
              if (active.length === 4) return 'Tất cả (4)';
              if (active.length === 3) return 'Cả 3';
              if (active.length === 2) return `${active[0]} + ${active[1]}`;
              return active[0] || 'Trắc nghiệm';
            })()}
          </span>
        </button>
      </div>

      {/* Deck Title Header */}
      {currentDeck && (
        <div className="pt-0.5">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words" title={currentDeck.name}>
            {currentDeck.name}
          </h2>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <IconSettings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Cài đặt bài học</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Hình thức làm bài: Trắc nghiệm / Gõ chữ / Flashcard / Nối từ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hình thức câu hỏi:
                </label>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  {(() => {
                    const active = [];
                    if (allowChoice) active.push('Trắc nghiệm');
                    if (allowWritten) active.push('Gõ chữ');
                    if (allowFlashcard) active.push('Flashcard');
                    if (allowMatching) active.push('Nối từ');
                    if (active.length === 4) return 'Đang chọn: Cả 4';
                    if (active.length === 3) return 'Đang chọn: 3 hình thức';
                    if (active.length === 2) return `Đang chọn: ${active[0]} & ${active[1]}`;
                    return `Đang chọn: ${active[0] || 'Trắc nghiệm'}`;
                  })()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Trắc nghiệm card */}
                <button
                  type="button"
                  onClick={handleToggleChoice}
                  className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    allowChoice
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">Trắc nghiệm</span>
                  <span className="text-[9.5px] font-normal opacity-75">4 lựa chọn</span>
                </button>

                {/* Gõ chữ card */}
                <button
                  type="button"
                  onClick={handleToggleWritten}
                  className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    allowWritten
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">Gõ chữ</span>
                  <span className="text-[9.5px] font-normal opacity-75">Tự luận</span>
                </button>

                {/* Flashcard card */}
                <button
                  type="button"
                  onClick={handleToggleFlashcard}
                  className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    allowFlashcard
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">Flashcard</span>
                  <span className="text-[9.5px] font-normal opacity-75">Lật thẻ</span>
                </button>

                {/* Nối từ card */}
                <button
                  type="button"
                  onClick={handleToggleMatching}
                  className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    allowMatching
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">Nối từ</span>
                  <span className="text-[9.5px] font-normal opacity-75">Kéo thả 4 từ</span>
                </button>
              </div>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 text-center">
                Có thể chọn 1, 2, 3 hoặc cả 4 hình thức cùng lúc
              </p>
            </div>

            {/* Hướng câu hỏi */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hướng câu hỏi:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('term-to-meaning')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                    direction === 'term-to-meaning'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Từ &rarr; Nghĩa
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('meaning-to-term')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                    direction === 'meaning-to-term'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Nghĩa &rarr; Từ
                </button>
              </div>
            </div>

            {/* Ẩn phiên âm */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div
                onClick={handleToggleHidePhonetic}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors select-none"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Ẩn phiên âm
                  </span>
                  <span className="text-[10.5px] text-slate-400 dark:text-slate-500 block">
                    Không hiển thị phiên âm (IPA) khi làm bài
                  </span>
                </div>

                <div
                  role="switch"
                  aria-checked={hidePhonetic}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    hidePhonetic ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      hidePhonetic ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-800 transition-colors shadow-2xs"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quizlet-style Segmented Progress Bar */}
      <div className="flex items-center gap-2 sm:gap-2.5 w-full py-1">
        {/* Left Circle: Number of correct/mastered words */}
        <div
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200"
          title={`Số câu làm đúng: ${masteredCount}`}
        >
          {masteredCount}
        </div>

        {/* Progress Line: Segmented pills matching Quizlet design */}
        <div className="flex-1 flex items-center gap-1.5 sm:gap-2">
          {(() => {
            const numSegments = totalWords > 0 ? (totalWords <= 10 ? totalWords : 6) : 6;
            const wordsPerSeg = totalWords > 0 ? totalWords / numSegments : 1;

            return Array.from({ length: numSegments }).map((_, segIdx) => {
              const segStart = segIdx * wordsPerSeg;
              const segProgress = Math.max(0, Math.min(1, (masteredCount - segStart) / wordsPerSeg));

              return (
                <div
                  key={segIdx}
                  className="flex-1 h-2 sm:h-2.5 bg-slate-200/90 dark:bg-slate-800 rounded-full overflow-hidden relative"
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${segProgress * 100}%` }}
                  />
                </div>
              );
            });
          })()}
        </div>

        {/* Right Circle: Total words */}
        <div
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] sm:text-xs flex items-center justify-center shrink-0 shadow-2xs"
          title={`Tổng số từ: ${totalWords}`}
        >
          {totalWords}
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div
          className={`space-y-5 ${
            currentQ.type === 'flashcard'
              ? 'bg-transparent border-0 p-0 shadow-none'
              : 'bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800'
          }`}
        >
          {/* Prompt Section (for choice and written) */}
          {currentQ.type !== 'matching' && currentQ.type !== 'flashcard' && currentQ.card && (
            <div className="text-center py-2 space-y-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              {/* Audio Button */}
              <div className="flex justify-center pb-0.5">
                <button
                  type="button"
                  onClick={() => speakWord(currentQ.card.term, currentDeck.targetLanguage || 'en-US')}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
                  title="Nghe phát âm"
                >
                  <IconSpeaker className="w-4 h-4" />
                </button>
              </div>


              {/* Prompt text (Từ vựng) */}
              <div className="pt-0.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  {currentQ.prompt}
                </h2>
              </div>

              {direction === 'term-to-meaning' && currentQ.card.phonetic && !hidePhonetic && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {currentQ.card.phonetic}
                </p>
              )}
            </div>
          )}

          {/* MODE 1: MULTIPLE CHOICE QUESTION */}
          {currentQ.type === 'choice' && (
            <div className="grid gap-2.5">
              {currentQ.options.map((optText, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrectAnswer = optIdx === currentQ.correctIdx;

                let btnStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-slate-100';

                if (isAnswered) {
                  if (isCorrectAnswer) {
                    btnStyle = 'border-[#c5e1cb] bg-[#edf3ec] dark:bg-emerald-950/40 text-[#1a5524] dark:text-emerald-200 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'border-[#f5c2c7] bg-[#fdf2f2] dark:bg-red-950/40 text-[#911b22] dark:text-red-200 font-bold';
                  } else {
                    btnStyle = 'border-slate-200 dark:border-slate-800 opacity-40';
                  }
                }

                const labels = ['A', 'B', 'C', 'D'];

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={isAnswered}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center gap-3 cursor-pointer ${btnStyle}`}
                  >
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                      isAnswered && isCorrectAnswer
                        ? 'bg-[#228b53] text-white'
                        : isAnswered && isSelected
                          ? 'bg-[#cf3333] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {labels[optIdx]}
                    </span>
                    <span className="flex-1 font-semibold text-slate-900 dark:text-slate-100 leading-snug">{optText}</span>
                    {isAnswered && isCorrectAnswer && <IconCheck className="w-4 h-4 text-[#228b53] shrink-0" />}
                    {isAnswered && isSelected && !isCorrectAnswer && <IconCross className="w-4 h-4 text-[#cf3333] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* MODE 2: WRITTEN / TYPING QUESTION (Quizlet Style) */}
          {currentQ.type === 'written' && (
            <div className="space-y-4">
              <form onSubmit={handleWrittenSubmit} className="space-y-3">
                <input
                  type="text"
                  autoFocus
                  disabled={isAnswered}
                  value={typedAnswer}
                  onChange={e => setTypedAnswer(e.target.value)}
                  placeholder={direction === 'term-to-meaning' ? 'Gõ định nghĩa, nghĩa tiếng Việt...' : 'Gõ từ tiếng Anh tương ứng...'}
                  className={`w-full px-4 py-3 rounded-xl border text-sm sm:text-base outline-none transition-all ${
                    isAnswered
                      ? isCorrectWritten
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold'
                        : 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400'
                  }`}
                />

                {!isAnswered && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDontKnow}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Tôi không biết
                    </button>

                    <button
                      type="submit"
                      disabled={!typedAnswer.trim()}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${
                        typedAnswer.trim()
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-98 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>Trả lời</span>
                      <span className="text-[10px] font-mono opacity-60">(Enter)</span>
                    </button>
                  </div>
                )}
              </form>

              {/* Feedback when answered */}
              {isAnswered && (
                <div className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                  isCorrectWritten
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {isCorrectWritten ? (
                      <>
                        <IconCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">Chính xác! Làm rất tốt.</span>
                      </>
                    ) : (
                      <>
                        <IconCross className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span className="text-rose-700 dark:text-rose-300">Chưa chính xác</span>
                      </>
                    )}
                  </div>

                  {!isCorrectWritten && (
                    <div className="space-y-1.5 pt-1">
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Câu trả lời của bạn:</div>
                        <div className="line-through text-rose-600 dark:text-rose-400 font-semibold">{typedAnswer || '(Bỏ qua)'}</div>
                      </div>

                      <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Đáp án chính xác:</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{currentQ.correctAnswer}</div>
                      </div>

                      {/* Quizlet Copy-Down Feature: Gõ lại đáp án đúng để ghi nhớ */}
                      <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Gõ lại đáp án đúng để ghi nhớ:
                        </label>
                        <input
                          type="text"
                          autoFocus
                          value={retypedText}
                          onChange={e => setRetypedText(e.target.value)}
                          placeholder={`Gõ lại: ${currentQ.correctAnswer}`}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-all ${
                            checkAnswerMatch(retypedText, currentQ.correctAnswer)
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-purple-500'
                          }`}
                        />
                        {checkAnswerMatch(retypedText, currentQ.correctAnswer) && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                            <IconCheck className="w-3.5 h-3.5" />
                            <span>Đã gõ đúng! Bạn có thể chuyển sang câu tiếp theo.</span>
                          </p>
                        )}
                      </div>

                      {/* Override Button ("Đáp án của tôi đúng") */}
                      {!isOverridden && (
                        <div className="pt-1 text-right">
                          <button
                            type="button"
                            onClick={handleOverrideCorrect}
                            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                          >
                            Đáp án của tôi đúng (Cộng điểm)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE 2: FLASHCARD QUESTION (Lật thẻ) */}
          {currentQ.type === 'flashcard' && currentQ.card && (
            <div className="space-y-4">
              {/* 3D Tactile Flashcard with Slide Animation */}
              <div
                className={`card-perspective w-full h-[370px] sm:h-[410px] select-none transition-all duration-360 ease-out ${
                  flashcardSlide === 'remembered'
                    ? 'translate-x-[110%] rotate-6 opacity-0 pointer-events-none'
                    : flashcardSlide === 'review'
                    ? '-translate-x-[110%] -rotate-6 opacity-0 pointer-events-none'
                    : 'translate-x-0 rotate-0 opacity-100 cursor-pointer'
                }`}
                onClick={() => {
                  if (flashcardSlide) return;
                  setIsCardFlipped(prev => !prev);
                }}
              >
                <div className={`w-full h-full relative card-preserve-3d ${isCardFlipped ? 'card-flipped' : ''}`}>
                  {/* FRONT */}
                  <div
                    className={`absolute inset-0 card-backface-hidden rounded-2xl p-6 sm:p-7 border flex flex-col justify-between transition-colors duration-200 overflow-y-auto shadow-sm ${
                      flashcardSlide === 'remembered'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-600/30'
                        : flashcardSlide === 'review'
                        ? 'bg-rose-600 border-rose-500 text-white shadow-2xl shadow-rose-600/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
                          flashcardSlide
                            ? 'bg-white/20 border-white/40 text-white'
                            : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200/60 dark:border-purple-800'
                        }`}
                      >
                        {direction === 'term-to-meaning' ? 'Từ vựng' : 'Định nghĩa'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(currentQ.card.term, currentDeck.targetLanguage || 'en-US');
                        }}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                          flashcardSlide
                            ? 'border-white/30 bg-white/20 text-white'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        title="Nghe phát âm"
                      >
                        <IconSpeaker className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-center my-auto space-y-2 py-3">
                      {currentQ.card.image && (
                        <div className="flex justify-center mb-2">
                          <img
                            src={currentQ.card.image}
                            alt={currentQ.card.term}
                            className="max-h-24 max-w-full rounded-xl object-contain border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                          />
                        </div>
                      )}
                      <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${flashcardSlide ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
                        {direction === 'term-to-meaning' ? currentQ.card.term : currentQ.card.meaning}
                      </h2>
                      {direction === 'term-to-meaning' && currentQ.card.phonetic && !hidePhonetic && (
                        <p className={`text-xs font-medium ${flashcardSlide ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                          {currentQ.card.phonetic}
                        </p>
                      )}
                    </div>

                    <div
                      className={`text-center pt-2.5 border-t text-xs flex items-center justify-center gap-1.5 font-sans ${
                        flashcardSlide
                          ? 'border-white/20 text-white/80'
                          : 'border-slate-100 dark:border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <IconRotate className={`w-3.5 h-3.5 ${flashcardSlide ? 'text-white' : 'text-slate-400'}`} />
                      <span>Bấm vào thẻ hoặc phím <strong className={flashcardSlide ? 'text-white font-bold' : 'font-semibold text-slate-600 dark:text-slate-300'}>Space</strong> để lật</span>
                    </div>
                  </div>

                  {/* BACK */}
                  <div
                    className={`absolute inset-0 card-backface-hidden card-rotate-back rounded-2xl p-6 sm:p-7 border flex flex-col justify-between transition-colors duration-200 overflow-y-auto shadow-sm ${
                      flashcardSlide === 'remembered'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-600/30'
                        : flashcardSlide === 'review'
                        ? 'bg-rose-600 border-rose-500 text-white shadow-2xl shadow-rose-600/30'
                        : 'bg-[#fafaf9] dark:bg-[#0e131f] border-slate-300/80 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
                          flashcardSlide
                            ? 'bg-white/20 border-white/40 text-white'
                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800'
                        }`}
                      >
                        {direction === 'term-to-meaning' ? 'Định nghĩa' : 'Từ vựng'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(currentQ.card.term, currentDeck.targetLanguage || 'en-US');
                        }}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                          flashcardSlide
                            ? 'border-white/30 bg-white/20 text-white'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        title="Nghe lại phát âm"
                      >
                        <IconSpeaker className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-center my-auto space-y-2.5 px-2 py-2">
                      <h3 className={`text-xl sm:text-2xl font-bold ${flashcardSlide ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                        {direction === 'term-to-meaning' ? currentQ.card.meaning : currentQ.card.term}
                      </h3>
                      {direction === 'meaning-to-term' && currentQ.card.phonetic && !hidePhonetic && (
                        <p className={`text-xs font-medium ${flashcardSlide ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                          {currentQ.card.phonetic}
                        </p>
                      )}

                      {currentQ.card.example && (
                        <div className="pt-2">
                          <p className={`text-xs italic ${flashcardSlide ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                            "{currentQ.card.example}"
                          </p>
                        </div>
                      )}

                      {currentQ.card.note && (
                        <p className={`text-[11px] ${flashcardSlide ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                          {currentQ.card.note}
                        </p>
                      )}
                    </div>

                    <div
                      className={`text-center pt-2.5 border-t text-xs flex items-center justify-center gap-1.5 ${
                        flashcardSlide
                          ? 'border-white/20 text-white/80'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <IconRotate className={`w-3.5 h-3.5 ${flashcardSlide ? 'text-white' : 'text-slate-400'}`} />
                      <span>Bấm để lật lại mặt trước</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleFlashcardAnswer(false)}
                  disabled={flashcardSlide !== null}
                  className={`py-3 px-3 bg-[#fff1f2] dark:bg-rose-950/40 border border-[#fecdd3] dark:border-rose-900/60 hover:bg-[#ffe4e6] dark:hover:bg-rose-900/50 text-[#e11d48] dark:text-rose-300 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                    flashcardSlide === 'review' ? 'ring-2 ring-rose-500 scale-98 bg-rose-200 dark:bg-rose-900/80 font-bold' : ''
                  }`}
                >
                  <IconCross className="w-4 h-4 text-[#e11d48] dark:text-rose-400 shrink-0" />
                  <span>Cần ôn lại (←)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFlashcardAnswer(true)}
                  disabled={flashcardSlide !== null}
                  className={`py-3 px-3 bg-[#f0fdf4] dark:bg-emerald-950/40 border border-[#bbf7d0] dark:border-emerald-900/60 hover:bg-[#dcfce7] dark:hover:bg-emerald-900/50 text-[#16a34a] dark:text-emerald-300 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                    flashcardSlide === 'remembered' ? 'ring-2 ring-emerald-500 scale-98 bg-emerald-200 dark:bg-emerald-900/80 font-bold' : ''
                  }`}
                >
                  <IconCheck className="w-4 h-4 text-[#16a34a] dark:text-emerald-400 shrink-0" />
                  <span>Đã nhớ (→)</span>
                </button>
              </div>

              {/* Keyboard Shortcuts in Physical Keys */}
              <div className="text-center text-[10px] text-slate-400 pt-1 space-x-2 font-sans">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Space</kbd> Lật
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] ml-1.5">&larr;</kbd> Cần ôn lại
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] ml-1.5">&rarr;</kbd> Đã nhớ
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] ml-1.5">&uarr;</kbd> Nghe
              </div>
            </div>
          )}

          {/* MODE 3: MATCHING QUESTION (Nối từ: Kéo thả 4 từ tương ứng 4 nghĩa) */}
          {currentQ.type === 'matching' && (
            <div className="space-y-4">
              {/* Matching Header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold shadow-2xs">
                      <IconLink className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Nối từ với nghĩa đúng</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Giữ và kéo từ bên trái thả vào ô nghĩa đúng bên phải (hoặc chạm để chọn)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-300 shrink-0">
                    <span>Đã nối:</span>
                    <span className="font-mono font-bold text-sm">
                      {matchedPairIds.length}/{currentQ.totalPairs}
                    </span>
                    <span>cặp</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Matching Board */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Cột Từ vựng (Bên trái) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>Từ vựng ({currentQ.terms.filter(t => !matchedPairIds.includes(t.id)).length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Kéo hoặc chạm
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentQ.terms.map((item) => {
                      const isMatched = matchedPairIds.includes(item.id);
                      const isSelected = selectedTermId === item.id;
                      const isDragging = draggingTermId === item.id;


                      if (isMatched) {
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between opacity-60 transition-all select-none"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                                ✓
                              </span>
                              <span className="font-bold text-xs sm:text-sm line-through truncate">
                                {item.text}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Đã nối
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          id={`term-card-${item.id}`}
                          data-term-id={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', item.id);
                            e.dataTransfer.effectAllowed = 'move';
                            if (EMPTY_DRAG_IMAGE && e.dataTransfer.setDragImage) {
                              e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
                            }
                            setDraggingTermId(item.id);
                            setSelectedTermId(item.id);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDragLine({
                              fromX: rect.right,
                              fromY: rect.top + rect.height / 2,
                              toX: e.clientX,
                              toY: e.clientY,
                              termId: item.id,
                              status: 'dragging'
                            });
                          }}
                          onDragEnd={() => {
                            setDraggingTermId(null);
                            setDragOverMeaningId(null);
                            if (dragLine && dragLine.status === 'dragging') {
                              setDragLine(null);
                            }
                          }}
                          onPointerDown={(e) => {
                            if (e.button !== undefined && e.button !== 0) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDraggingTermId(item.id);
                            setSelectedTermId(item.id);
                            setDragLine({
                              fromX: rect.right,
                              fromY: rect.top + rect.height / 2,
                              toX: e.clientX,
                              toY: e.clientY,
                              termId: item.id,
                              status: 'dragging'
                            });
                          }}
                          onClick={() => {
                            setSelectedTermId(prev => (prev === item.id ? null : item.id));
                          }}
                          className={`p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none group relative ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50/90 dark:bg-purple-950/70 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/30 shadow-md scale-[1.01]'
                              : isDragging
                              ? 'opacity-40 border-purple-400 bg-purple-50/50'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                            {/* Grip handle dots */}
                            <span className="text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0 text-sm leading-none select-none">
                              ⋮⋮
                            </span>

                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs sm:text-sm">
                              {item.text}
                            </span>
                          </div>

                          {/* Quick speaker button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(item.card.term, currentDeck.targetLanguage || 'en-US');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <IconSpeaker className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cột Định nghĩa (Bên phải - Drop Target) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Định nghĩa</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Thả từ vào đây
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentQ.meanings.map((item) => {
                      const isMatched = matchedPairIds.includes(item.id);
                      const isOver = dragOverMeaningId === item.id;
                      const isWrong = wrongFeedback && wrongFeedback.meaningId === item.id;

                      if (isMatched) {
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 space-y-1 transition-all"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                                  ✓
                                </span>
                                <span>{item.card.term}</span>
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Nối thành công
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-5.5">
                              {item.text}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          id={`meaning-card-${item.id}`}
                          data-meaning-id={item.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverMeaningId !== item.id) {
                              setDragOverMeaningId(item.id);
                            }
                          }}
                          onDragLeave={(e) => {
                            if (e.currentTarget.contains(e.relatedTarget)) return;
                            if (dragOverMeaningId === item.id) {
                              setDragOverMeaningId(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const termId = e.dataTransfer.getData('text/plain') || draggingTermId || selectedTermId;
                            setDragOverMeaningId(null);
                            if (termId) {
                              handleAttemptMatch(termId, item.id);
                            }
                          }}
                          onClick={() => {
                            if (selectedTermId) {
                              handleAttemptMatch(selectedTermId, item.id);
                            }
                          }}
                          className={`p-3 rounded-xl border-2 transition-colors duration-150 min-h-[58px] flex flex-col justify-center relative cursor-pointer ${
                            isWrong
                              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 animate-shake ring-2 ring-rose-400/40'
                              : isOver
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 ring-2 ring-purple-400/50 shadow-md'
                              : selectedTermId
                              ? 'border-dashed border-purple-300 dark:border-purple-800/80 bg-purple-50/20 dark:bg-purple-950/20 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/50'
                              : 'border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug pointer-events-none select-none">
                            {item.text}
                          </p>

                          {isWrong && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 pt-0.5 pointer-events-none select-none">
                              ✕ Chưa chính xác, thử lại nhé!
                            </span>
                          )}

                          {isOver && !isWrong && (
                            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 pt-0.5 flex items-center gap-1 pointer-events-none select-none">
                              <span>Thả để nối</span> &darr;
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Success celebration when round finished */}
              {isAnswered && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center space-y-1 animate-fadeIn">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    <IconCheck className="w-4 h-4" />
                    <span>Xuất sắc! Bạn đã nối chính xác toàn bộ {currentQ.totalPairs} từ!</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Bấm "Câu tiếp theo" để tiếp tục luyện tập.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Explanation & Next Button when answered */}
          {isAnswered && currentQ.type !== 'flashcard' && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              {currentQ.type !== 'matching' && currentQ.card && (
                <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {currentQ.card.term} {currentQ.card.phonetic && !hidePhonetic && <span className="text-slate-400 font-normal">({currentQ.card.phonetic})</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakWord(currentQ.card.term, currentDeck.targetLanguage || 'en-US')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <IconSpeaker className="w-3.5 h-3.5" />
                      <span>Nghe</span>
                    </button>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {currentQ.card.meaning}
                  </p>
                  {currentQ.card.example && (
                    <p className="text-slate-500 dark:text-slate-400 italic font-serif">
                      "{currentQ.card.example}"
                      {currentQ.card.exampleMeaning && ` \u2192 ${currentQ.card.exampleMeaning}`}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>{masteredCount >= totalWords ? 'Xem kết quả' : 'Câu tiếp theo'} &rarr;</span>
                <span className="text-[11px] opacity-70 font-normal">(tự chuyển sau 2s)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SVG Elastic Connecting Wire Overlay (Sợi dây nối từ vựng kéo đến trỏ chuột) */}
      {dragLine && (
        <svg
          className={`pointer-events-none fixed inset-0 z-50 w-full h-full transition-opacity duration-300 ${
            dragLine.status === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ willChange: 'opacity' }}
        >
          <defs>
            <linearGradient id="wireGradientStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                stopColor={dragLine.status === 'matched' ? '#10b981' : dragLine.status === 'wrong' ? '#ef4444' : '#9333ea'}
              />
              <stop
                offset="100%"
                stopColor={dragLine.status === 'matched' ? '#34d399' : dragLine.status === 'wrong' ? '#f87171' : '#c084fc'}
              />
            </linearGradient>
            <filter id="wireGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {(() => {
            const { fromX, fromY, toX, toY, status } = dragLine;
            const dist = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
            const curveOffset = Math.min(130, Math.max(40, dist * 0.4));
            const pathD = `M ${fromX} ${fromY} C ${fromX + curveOffset} ${fromY}, ${toX - curveOffset} ${toY}, ${toX} ${toY}`;
            const color = status === 'matched' ? '#10b981' : status === 'wrong' ? '#ef4444' : '#a855f7';

            return (
              <g>
                {/* Wider ambient aura */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                />

                {/* Primary glowing wire */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#wireGradientStroke)"
                  strokeWidth={status === 'matched' ? '4.5' : '3.5'}
                  strokeLinecap="round"
                  filter="url(#wireGlowFilter)"
                />

                {/* Origin Terminal Socket */}
                <circle cx={fromX} cy={fromY} r="5" fill={color} stroke="#ffffff" strokeWidth="2" />

                {/* Mouse Cursor Terminal Tip */}
                <circle
                  cx={toX}
                  cy={toY}
                  r={status === 'matched' ? '8' : '6'}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className={status === 'dragging' ? 'animate-pulse' : ''}
                />
              </g>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
