import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { uid, arraysEqual, renderMd } from '../data/storage';

export default function Practice() {
  const { data, update, showConfirm } = useQuiz();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionQuestions, sessionNames, practiceMode, timeLimit, isExam } = location.state || {};

  // ---- Exam timer ----
  const timeLimitMs = (timeLimit && timeLimit > 0) ? timeLimit * 60000 : 0;
  const startRef = useRef(Date.now());
  const [timeLeftMs, setTimeLeftMs] = useState(timeLimitMs);
  const submittedRef = useRef(false);
  const submitRef = useRef(null);
  const isTimed = timeLimitMs > 0;

  const handleSubmitRef = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submitRef.current?.();
  }, []);

  useEffect(() => {
    if (!isTimed) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, timeLimitMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        handleSubmitRef();
      }
    }, 250);
    return () => clearInterval(id);
  }, [isTimed, timeLimitMs, handleSubmitRef]);

  const [questions, setQuestions] = useState(() => sessionQuestions || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(() => {
    const a = {};
    (sessionQuestions || []).forEach(q => { a[q.id] = []; });
    return a;
  });
  const [showingResult, setShowingResult] = useState(false);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [slideFrom, setSlideFrom] = useState('right'); // 'right' | 'left' - direction card slides in from
  const [toast, setToast] = useState('');

  // Touch swipe for mobile navigation
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    isSwiping.current = true;
    setTimeout(() => { isSwiping.current = false; }, 100);
    if (dx < 0) handleNext();  // swipe left → next
    else handlePrev();          // swipe right → prev
  };

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  // Redirect if no session
  useEffect(() => {
    if (!sessionQuestions || sessionQuestions.length === 0) navigate('/practice-setup');
  }, [sessionQuestions, navigate]);

  // Auto-show result when going back to a previously reviewed question
  useEffect(() => {
    if (!sessionQuestions || sessionQuestions.length === 0) return;
    const cur = questions[currentIdx];
    if (!cur) return;
    setShowingResult(reviewedIds.has(cur.id));
  }, [currentIdx, reviewedIds, sessionQuestions, questions]);

  const q = questions[currentIdx];
  const qId = q ? q.id : null;
  const isInstant = practiceMode === 'instant';
  const isMulti = q ? q.correctIndices.length > 1 : false;
  const currentAnswers = useMemo(() => qId ? (answers[qId] || []) : [], [qId, answers]);
  const isLast = currentIdx >= questions.length - 1;

  const handleSubmit = useCallback(() => {
    let correctCount = 0;
    const d = { ...data, questionStats: { ...data.questionStats } };
    const originalQuestions = questions.filter(qq => !qq._retryOf);

    questions.forEach(qq => {
      const ua = answers[qq.id] || [];
      const c = qq.correctIndices.slice().sort((a, b) => a - b);
      const us = ua.slice().sort((a, b) => a - b);
      const statsId = qq._retryOf || qq.id;
      const isCorrect = arraysEqual(c, us);
      // Only count original questions toward score
      if (!qq._retryOf) {
        if (isCorrect) correctCount++;
        else {
          if (!d.questionStats[statsId]) d.questionStats[statsId] = { wrongCount: 0 };
          d.questionStats[statsId].wrongCount++;
          d.questionStats[statsId].lastWrong = new Date().toISOString();
        }
      }
    });

    const total = originalQuestions.length;
    const score = Math.round((correctCount / total) * 100);
    const session = {
      id: uid(), testNames: sessionNames, questions, answers, totalQuestions: total,
      correctCount, score, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      ...(isTimed ? { timeLimit, isExam, elapsedMs: Math.min(timeLimitMs, Date.now() - startRef.current) } : {})
    };

    d.history = [session, ...d.history].slice(0, 100);
    update(d);

    navigate('/results', { state: { session, score, correctCount, total } });
  }, [data, update, navigate, sessionNames, questions, answers, isTimed, timeLimit, isExam, timeLimitMs]);

  // Keep latest handleSubmit available to the timer (avoids stale closure)
  useEffect(() => { submitRef.current = handleSubmit; });

  const requireAnswer = useCallback(() => {
    if (currentAnswers.length === 0) {
      showToast('Vui lòng chọn đáp án trước khi tiếp tục');
      return false;
    }
    return true;
  }, [currentAnswers, showToast]);

  const handleOptionClick = useCallback((oi) => {
    if (showingResult || isSwiping.current) return;
    setAnswers(prev => {
      const a = { ...prev };
      const cur = [...(a[q.id] || [])];
      if (isMulti) {
        const idx = cur.indexOf(oi);
        if (idx >= 0) {
          cur.splice(idx, 1);
        } else {
          cur.push(oi);
          // Keep only the last N selections (FIFO: remove oldest)
          if (cur.length > q.correctIndices.length) {
            cur.shift();
          }
        }
      } else {
        cur.length = 0;
        cur.push(oi);
      }
      a[q.id] = cur;
      return a;
    });
  }, [showingResult, q, isMulti]);

  const handleNext = useCallback(() => {
    if (isInstant && !showingResult) {
      if (!requireAnswer()) return;
      setShowingResult(true);
      setReviewedIds(prev => new Set([...prev, q.id]));
      return;
    }
    if (isInstant && showingResult) {
      let insertedRetry = false;
      const correct = arraysEqual(
        currentAnswers.slice().sort((a,b)=>a-b),
        q.correctIndices.slice().sort((a,b)=>a-b)
      );
      const origId = q._retryOf || q.id;
      if (!correct && !isExam) {
        const gap = 2;
        const insertPos = Math.min(currentIdx + gap + 1, questions.length);
        const retryQuestion = { ...q, id: uid(), _retryOf: origId };
        setQuestions(prev => {
          const next = [...prev];
          next.splice(insertPos, 0, retryQuestion);
          return next;
        });
        setAnswers(prev => ({ ...prev, [retryQuestion.id]: [] }));
        insertedRetry = true;
      }
      setShowingResult(false);
      if (isLast && !insertedRetry) { handleSubmit(); return; }
      setSlideFrom('right');
      setCurrentIdx(prev => prev + 1);
      return;
    }
    if (!requireAnswer()) return;
    if (isLast) { handleSubmit(); return; }
    setSlideFrom('right');
    setCurrentIdx(prev => prev + 1);
  }, [isInstant, showingResult, requireAnswer, q, currentAnswers, isExam, currentIdx, questions, isLast, handleSubmit]);

  const handlePrev = useCallback(() => {
    if (currentIdx <= 0) return;
    setSlideFrom('left');
    setCurrentIdx(prev => prev - 1);
  }, [currentIdx]);

  const handleQuit = () => {
    showConfirm('Thoát bài làm? Kết quả sẽ không được lưu.', () => navigate('/'), {
      title: 'Thoát bài làm',
      yesLabel: 'Thoát',
      noLabel: 'Ở lại',
      danger: false,
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (!sessionQuestions || sessionQuestions.length === 0) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key >= '1' && e.key <= '9') {
        const oi = parseInt(e.key) - 1;
        if (oi < q.options.length) handleOptionClick(oi);
        e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { handleNext(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { handlePrev(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sessionQuestions, currentIdx, showingResult, answers, q, handleOptionClick, handleNext, handlePrev]);

  const answeredCount = Object.values(answers).filter(a => a && a.length > 0).length;
  const progress = (answeredCount / questions.length) * 100;
  const stats = data.questionStats || {};
  const ws = q ? stats[q.id] : undefined;

  if (!sessionQuestions || sessionQuestions.length === 0) return null;

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6 sticky top-[73px] z-[5] bg-slate-100 dark:bg-slate-900 py-2">
        {/* Exam countdown */}
        {isTimed && (() => {
          const s = Math.max(0, Math.ceil(timeLeftMs / 1000));
          const mm = Math.floor(s / 60);
          const ss = s % 60;
          let chipCls = 'text-success-600 bg-success-50 dark:bg-success-700/20 border-success-200 dark:border-success-700/50';
          if (s <= 60) chipCls = 'text-danger-600 bg-danger-50 dark:bg-danger-700/20 border-danger-200 dark:border-danger-700/50';
          else if (s <= 300) chipCls = 'text-warning-600 bg-warning-50 dark:bg-warning-700/20 border-warning-200 dark:border-warning-700/50';
          return (
            <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold whitespace-nowrap flex items-center gap-1.5 tabular-nums ${chipCls}`}>
              {mm}:{String(ss).padStart(2, '0')}
            </span>
          );
        })()}
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis">
          {(sessionNames || []).join(' + ')}
        </span>
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{answeredCount} / {questions.length}</span>
        <button onClick={handleQuit} className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-500" title="Thoát">{'×'}</button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-3 py-2.5 px-4 bg-warning-50 dark:bg-warning-700/20 text-warning-700 dark:text-warning-300 text-sm text-center rounded-lg border border-warning-100 dark:border-warning-700/50 toast-in">
          {toast}
        </div>
      )}

      {/* Question */}
      <div key={currentIdx} className={slideFrom === 'right' ? 'slide-from-right' : 'slide-from-left'}>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 mb-5">
        <div className="text-base sm:text-lg font-semibold mb-5 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(q.prompt) }} />
        {isMulti && !showingResult && (
          <span className="text-xs text-warning-600 dark:text-warning-400 font-medium mb-3 inline-block bg-warning-50 dark:bg-warning-700/20 px-2.5 py-0.5 rounded-full">(Chọn nhiều đáp án)</span>
        )}

        <div>
          {q.options.map((opt, oi) => {
            const sel = currentAnswers.includes(oi);
            let cls, marker = '';
            if (showingResult) {
              const ic = q.correctIndices.includes(oi);
              if (sel && ic) { cls = 'border-2 border-success-600 bg-success-50 dark:bg-success-700/20 dark:text-success-200 font-semibold'; marker = <span className="ml-auto text-success-600 dark:text-success-400">{'✓'}</span>; }
              else if (sel && !ic) { cls = 'border-2 border-danger-600 bg-danger-50 dark:bg-danger-700/20 dark:text-danger-200 font-semibold'; marker = <span className="ml-auto text-danger-600 dark:text-danger-400">{'×'}</span>; }
              else if (!sel && ic) { cls = 'border-2 border-warning-500 bg-warning-50 dark:bg-warning-700/20 dark:text-warning-200'; marker = <span className="ml-auto text-warning-600 dark:text-warning-400">{'✓'}</span>; }
              else { cls = 'border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'; }
            } else if (sel) { cls = 'opt-selected border-2 border-primary-500 bg-primary-50 dark:bg-primary-700/20 dark:text-primary-200 font-semibold'; }
            else { cls = 'border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'; }

            return (
              <button key={oi} onClick={() => handleOptionClick(oi)} disabled={showingResult}
                className={`opt-btn flex items-center gap-3 w-full p-3.5 mb-2 rounded-lg cursor-pointer text-sm text-left transition-all ${cls}`}>
                <span className={`font-bold text-xs min-w-[24px] ${showingResult ? '' : 'text-primary-600 dark:text-primary-400'}`}>{opt.label}.</span>
                <span dangerouslySetInnerHTML={{ __html: renderMd(opt.text) }} />
                {marker}
              </button>
            );
          })}
        </div>

        {showingResult && q.explanation && (
          <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-700/20 rounded-lg text-[0.8rem] leading-relaxed">
            <strong>{arraysEqual(currentAnswers.slice().sort((a,b)=>a-b), q.correctIndices.slice().sort((a,b)=>a-b)) ? 'Giải thích:' : 'Đáp án đúng - Giải thích:'}</strong>
            <span dangerouslySetInnerHTML={{ __html: renderMd(q.explanation) }} />
          </div>
        )}

        {showingResult && ws && ws.wrongCount > 0 && (
          <div className="mt-2 text-xs text-slate-500">Bạn đã sai câu này <strong className="text-danger-600">{ws.wrongCount}</strong> lần.</div>
        )}
      </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-between mt-3">
        <button onClick={handlePrev} disabled={currentIdx === 0}
          className="border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 disabled:opacity-50">
          Trước
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 self-center">Câu {currentIdx + 1} / {questions.length}</span>
        <button onClick={handleNext} className={`px-4 py-2.5 rounded-lg text-sm font-semibold active:scale-95 transition-all text-white ${
          (isInstant && showingResult && isLast) || (!isInstant && isLast) ? 'bg-success-600 hover:bg-success-700' : 'bg-primary-600 hover:bg-primary-700'
        }`}>
          {isInstant && !showingResult ? 'Xem đáp án' : isInstant && showingResult && isLast ? 'Hoàn thành' : isInstant && showingResult ? 'Tiếp tục' : isLast ? 'Nộp bài' : 'Sau'}
        </button>
      </div>
    </div>
  );
}
