import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { shuffle } from '../data/storage';
import { speakWord, speakWordAuto } from '../lib/tts';
import { IconSpeaker, IconRotate, IconShuffle, IconCheck, IconCross, IconArrowLeft, IconTarget } from '../components/Icons';
import { getBadgeColor } from '../data/badgeColors';

export default function VocabFlashcard() {
  const { data, update, showAlert } = useQuiz();
  const navigate = useNavigate();
  const location = useLocation();

  const vocabDecks = data.vocabDecks || [];
  const initialDeckId = location.state?.deckId || (vocabDecks[0]?.id || '');

  const [selectedDeckId, setSelectedDeckId] = useState(initialDeckId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [slideStatus, setSlideStatus] = useState(null); // 'remembered' | 'review' | null
  const isAnimatingRef = useRef(false);
  const hidePhonetic = localStorage.getItem('vocab_quiz_hide_phonetic') === 'true';

  const currentDeck = useMemo(() => {
    return vocabDecks.find(d => d.id === selectedDeckId) || vocabDecks[0] || null;
  }, [vocabDecks, selectedDeckId]);

  const [cardsList, setCardsList] = useState([]);
  const [rememberedIds, setRememberedIds] = useState(new Set());
  const [reviewIds, setReviewIds] = useState(new Set());
  const [isFinished, setIsFinished] = useState(false);

  // Initialize cards
  useEffect(() => {
    if (currentDeck && currentDeck.cards) {
      let list = [...currentDeck.cards];
      if (isShuffled) list = shuffle(list);
      setCardsList(list);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsFinished(false);
      setRememberedIds(new Set());
      setReviewIds(new Set());
    }
  }, [currentDeck, isShuffled]);

  const currentCard = cardsList[currentIndex] || null;

  // Speak word when card appears if autoSpeak is enabled
  useEffect(() => {
    if (currentCard && autoSpeak && !isFinished && !isFlipped) {
      speakWordAuto(currentCard.term, currentDeck?.targetLanguage || 'en-US');
    }
  }, [currentIndex, currentCard, autoSpeak, isFinished, currentDeck]);

  const handleFlip = useCallback(() => {
    if (isAnimatingRef.current) return;
    setIsFlipped(prev => !prev);
  }, []);

  const handleNext = useCallback((isRemembered) => {
    if (!currentCard || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const status = isRemembered ? 'remembered' : 'review';
    setSlideStatus(status);

    if (isRemembered) {
      setRememberedIds(prev => new Set([...prev, currentCard.id]));
      const nextStats = {
        ...(data.vocabStats || {}),
        [currentCard.id]: {
          mastered: true,
          reviewCount: ((data.vocabStats?.[currentCard.id]?.reviewCount) || 0) + 1,
          lastReviewed: new Date().toISOString()
        }
      };
      update({ ...data, vocabStats: nextStats });
    } else {
      setReviewIds(prev => new Set([...prev, currentCard.id]));
      const nextStats = {
        ...(data.vocabStats || {}),
        [currentCard.id]: {
          mastered: false,
          reviewCount: ((data.vocabStats?.[currentCard.id]?.reviewCount) || 0) + 1,
          lastReviewed: new Date().toISOString()
        }
      };
      update({ ...data, vocabStats: nextStats });
    }

    setTimeout(() => {
      if (currentIndex + 1 < cardsList.length) {
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
      }
      setSlideStatus(null);
      isAnimatingRef.current = false;
    }, 360);
  }, [currentCard, currentIndex, cardsList.length, data, update]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished || isAnimatingRef.current) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleNext(false);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext(true);
      } else if (e.code === 'ArrowUp' && currentCard) {
        e.preventDefault();
        speakWord(currentCard.term, currentDeck?.targetLanguage || 'en-US');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, isFinished, currentCard, currentDeck]);

  const handleRestart = (onlyReview = false) => {
    if (!currentDeck || !currentDeck.cards) return;
    let list = [...currentDeck.cards];
    if (onlyReview) {
      list = list.filter(c => reviewIds.has(c.id));
      if (list.length === 0) {
        showAlert('Tuyệt vời!', 'Bạn đã thuộc toàn bộ các từ trong bộ này!', 'info');
        return;
      }
    }
    if (isShuffled) list = shuffle(list);
    setCardsList(list);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setSlideStatus(null);
    isAnimatingRef.current = false;
    setRememberedIds(new Set());
    setReviewIds(new Set());
  };

  if (!currentDeck || !cardsList || cardsList.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Chưa có thẻ từ vựng nào trong bộ này</p>
        <button
          onClick={() => navigate('/vocab-editor')}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
        >
          Thêm từ vựng ngay
        </button>
      </div>
    );
  }

  // Completion View
  if (isFinished) {
    const total = cardsList.length;
    const rememberedCount = rememberedIds.size;
    const reviewCount = reviewIds.size;
    const percent = Math.round((rememberedCount / total) * 100);

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center max-w-md mx-auto space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Session Completed
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Hoàn thành buổi học
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentDeck.name}
          </p>
        </div>

        {/* Minimalist Stat Cards */}
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="bg-[#edf3ec] dark:bg-emerald-950/40 border border-[#d2e4d0] dark:border-emerald-800/60 rounded-xl p-3.5 text-center">
            <div className="text-2xl font-mono font-bold text-[#2e5e34] dark:text-emerald-300">{rememberedCount}</div>
            <div className="text-[11px] font-medium text-[#4b7a51] dark:text-emerald-400 mt-0.5">Đã ghi nhớ ({percent}%)</div>
          </div>
          <div className="bg-[#fbf3db] dark:bg-amber-950/40 border border-[#eee0ba] dark:border-amber-800/60 rounded-xl p-3.5 text-center">
            <div className="text-2xl font-mono font-bold text-[#865903] dark:text-amber-300">{reviewCount}</div>
            <div className="text-[11px] font-medium text-[#865903] dark:text-amber-400 mt-0.5">Cần ôn lại</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 max-w-xs mx-auto pt-2">
          {reviewCount > 0 && (
            <button
              onClick={() => handleRestart(true)}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <IconRotate className="w-3.5 h-3.5" />
              <span>Ôn lại {reviewCount} từ chưa nhớ</span>
            </button>
          )}

          <button
            onClick={() => handleRestart(false)}
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-tight transition-colors cursor-pointer"
          >
            Học lại toàn bộ ({total} từ)
          </button>

          <button
            onClick={() => navigate('/vocab-quiz', { state: { deckId: currentDeck.id } })}
            className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-tight transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <IconTarget className="w-3.5 h-3.5 text-slate-500" />
            <span>Chuyển sang bài trắc nghiệm</span>
          </button>

          <button
            onClick={() => navigate('/vocab')}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 pt-2 cursor-pointer"
          >
            Quay lại thư viện
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Top Bar: Back button on Left, Controls on Right */}
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsShuffled(s => !s)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer shadow-2xs ${
              isShuffled
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Xáo trộn ngẫu nhiên"
          >
            <IconShuffle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setAutoSpeak(a => !a)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              autoSpeak
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
            title="Tự động phát âm khi chuyển thẻ"
          >
            <IconSpeaker className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">{autoSpeak ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>
      </div>

      {/* Deck Title Header */}
      {currentDeck && (
        <div className="pt-0.5">
          {vocabDecks.length > 1 ? (
            <div className="relative inline-flex items-center gap-1.5 cursor-pointer group">
              <select
                value={selectedDeckId}
                onChange={e => setSelectedDeckId(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                title="Đổi bộ từ vựng"
              >
                {(data.vocabCollections || []).map(col => {
                  const colDecks = vocabDecks.filter(d => d.collectionId === col.id);
                  if (colDecks.length === 0) return null;
                  return (
                    <optgroup key={col.id} label={col.name}>
                      {colDecks.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.cards?.length || 0})</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" title={currentDeck.name}>
                {currentDeck.name}
              </h2>
              <span className="text-slate-400 text-xs pointer-events-none group-hover:text-purple-500">▾</span>
            </div>
          ) : (
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words" title={currentDeck.name}>
              {currentDeck.name}
            </h2>
          )}
        </div>
      )}

      {/* Progress Meta */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Thẻ {currentIndex + 1} / {cardsList.length}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[#2e5e34] dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span>✓</span> {rememberedIds.size}
            </span>
            <span className="text-[#865903] dark:text-amber-400 font-semibold flex items-center gap-1">
              <span>?</span> {reviewIds.size}
            </span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-slate-900 dark:bg-slate-200 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cardsList.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 3D Tactile Flashcard with Slide Animation */}
      <div
        className={`card-perspective w-full h-[370px] sm:h-[410px] select-none transition-all duration-360 ease-out ${
          slideStatus === 'remembered'
            ? 'translate-x-[110%] rotate-6 opacity-0 pointer-events-none'
            : slideStatus === 'review'
            ? '-translate-x-[110%] -rotate-6 opacity-0 pointer-events-none'
            : 'translate-x-0 rotate-0 opacity-100 cursor-pointer'
        }`}
        onClick={handleFlip}
      >
        <div className={`w-full h-full relative card-preserve-3d ${isFlipped ? 'card-flipped' : ''}`}>
          {/* FRONT */}
          <div
            className={`absolute inset-0 card-backface-hidden rounded-2xl p-6 sm:p-7 border flex flex-col justify-between transition-colors duration-200 overflow-y-auto ${
              slideStatus === 'remembered'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-600/30'
                : slideStatus === 'review'
                ? 'bg-rose-600 border-rose-500 text-white shadow-2xl shadow-rose-600/30'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-50 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              {currentCard.partOfSpeech && (() => {
                const c = getBadgeColor(currentCard.badgeColor, currentCard.partOfSpeech);
                return (
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-md border ${
                      slideStatus
                        ? 'bg-white/20 border-white/40 text-white'
                        : `${c.bg} ${c.text} ${c.border}`
                    }`}
                  >
                    {currentCard.partOfSpeech}
                  </span>
                );
              })()}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakWord(currentCard.term, currentDeck.targetLanguage || 'en-US');
                }}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ml-auto ${
                  slideStatus
                    ? 'border-white/30 bg-white/20 text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Nghe phát âm (Phím ↑)"
              >
                <IconSpeaker className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center my-auto space-y-2 py-3">
              {currentCard.image && (
                <div className="flex justify-center mb-2">
                  <img
                    src={currentCard.image}
                    alt={currentCard.term}
                    className="max-h-28 max-w-full rounded-xl object-contain border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                  />
                </div>
              )}
              <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${slideStatus ? 'text-white' : 'text-slate-900 dark:text-slate-50'}`}>
                {currentCard.term}
              </h2>
              {currentCard.phonetic && !hidePhonetic && (
                <p className={`text-xs ${slideStatus ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                  {currentCard.phonetic}
                </p>
              )}
            </div>

            <div
              className={`text-center pt-2.5 border-t text-[11px] flex items-center justify-center gap-1.5 font-sans ${
                slideStatus
                  ? 'border-white/20 text-white/85'
                  : 'border-slate-100 dark:border-slate-800/80 text-slate-400'
              }`}
            >
              <IconRotate className="w-3 h-3" />
              <span>Bấm vào thẻ hoặc phím <strong className={slideStatus ? 'text-white font-bold' : 'text-slate-600 dark:text-slate-300'}>Space</strong> để lật</span>
            </div>
          </div>

          {/* BACK */}
          <div
            className={`absolute inset-0 card-backface-hidden card-rotate-back rounded-2xl p-6 sm:p-7 border flex flex-col justify-between transition-colors duration-200 overflow-y-auto ${
              slideStatus === 'remembered'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-600/30'
                : slideStatus === 'review'
                ? 'bg-rose-600 border-rose-500 text-white shadow-2xl shadow-rose-600/30'
                : 'bg-[#fafaf9] dark:bg-[#0e131f] border-slate-300/80 dark:border-slate-700 text-slate-900 dark:text-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${slideStatus ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                Định nghĩa
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakWord(currentCard.term, currentDeck.targetLanguage || 'en-US');
                }}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                  slideStatus
                    ? 'border-white/30 bg-white/20 text-white'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Nghe lại phát âm"
              >
                <IconSpeaker className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center my-auto space-y-2 px-2 py-2">
              <span
                className={`inline-block text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-md ${
                  slideStatus
                    ? 'bg-white/20 text-white'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80'
                }`}
              >
                Định nghĩa:
              </span>
              <h3 className={`text-xl sm:text-2xl font-bold tracking-tight whitespace-pre-line ${
                slideStatus ? 'text-white' : 'text-slate-900 dark:text-slate-50'
              }`}>
                {currentCard.meaning}
              </h3>

              {/* Examples List */}
              {((Array.isArray(currentCard.examples) && currentCard.examples.length > 0) ? currentCard.examples : (currentCard.example ? [currentCard.example] : [])).length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {((Array.isArray(currentCard.examples) && currentCard.examples.length > 0) ? currentCard.examples : [currentCard.example]).map((ex, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-2.5 border text-left space-y-1 ${
                        slideStatus
                          ? 'bg-white/15 border-white/25 text-white'
                          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs italic ${slideStatus ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          "{ex}"
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakWord(ex, currentDeck.targetLanguage || 'en-US');
                          }}
                          className={`p-1 cursor-pointer shrink-0 ${
                            slideStatus ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                          title="Đọc câu ví dụ"
                        >
                          <IconSpeaker className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {i === 0 && currentCard.exampleMeaning && (
                        <p className={`text-[11px] pt-0.5 ${slideStatus ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                              &rarr; {currentCard.exampleMeaning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Note */}
              {currentCard.note && (
                <div
                  className={`rounded-xl p-2.5 border text-left text-xs ${
                    slideStatus
                      ? 'bg-white/15 border-white/25 text-white'
                      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <span
                    className={`font-semibold text-[10px] uppercase tracking-wider block mb-0.5 ${
                      slideStatus ? 'text-white/90' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    Ghi chú
                  </span>
                  <p className="whitespace-pre-line leading-relaxed">{currentCard.note}</p>
                </div>
              )}
            </div>

            <div
              className={`text-center pt-2.5 border-t text-[11px] ${
                slideStatus
                  ? 'border-white/20 text-white/80'
                  : 'border-slate-200/60 dark:border-slate-800 text-slate-400'
              }`}
            >
              <span>Đánh giá độ nhớ của bạn ở bên dưới</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Minimalist Tactile Controls */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          onClick={() => handleNext(false)}
          disabled={slideStatus !== null}
          className={`py-3 px-3 bg-[#fff1f2] dark:bg-rose-950/40 border border-[#fecdd3] dark:border-rose-900/60 hover:bg-[#ffe4e6] dark:hover:bg-rose-900/50 text-[#e11d48] dark:text-rose-300 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
            slideStatus === 'review' ? 'ring-2 ring-rose-500 scale-98 bg-rose-200 dark:bg-rose-900/80 font-bold' : ''
          }`}
        >
          <IconCross className="w-4 h-4 text-[#e11d48] dark:text-rose-400 shrink-0" />
          <span>Cần ôn lại (←)</span>
        </button>

        <button
          onClick={() => handleNext(true)}
          disabled={slideStatus !== null}
          className={`py-3 px-3 bg-[#f0fdf4] dark:bg-emerald-950/40 border border-[#bbf7d0] dark:border-emerald-900/60 hover:bg-[#dcfce7] dark:hover:bg-emerald-900/50 text-[#16a34a] dark:text-emerald-300 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
            slideStatus === 'remembered' ? 'ring-2 ring-emerald-500 scale-98 bg-emerald-200 dark:bg-emerald-900/80 font-bold' : ''
          }`}
        >
          <IconCheck className="w-4 h-4 text-[#16a34a] dark:text-emerald-400 shrink-0" />
          <span>Đã nhớ (→)</span>
        </button>
      </div>

      {/* Keyboard Shortcuts in Physical Keys */}
      <div className="text-center text-[10px] text-slate-400 pt-2 space-x-2">
        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Space</kbd> Lật
        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] ml-1.5">&larr;</kbd> Cần ôn lại
        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] ml-1.5">&rarr;</kbd> Đã nhớ
        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] ml-1.5">&uarr;</kbd> Nghe
      </div>
    </div>
  );
}
