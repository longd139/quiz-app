import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { uid, escHtml, arraysEqual } from '../data/storage';

export default function Practice() {
  const { data, update } = useQuiz();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionQuestions, sessionNames, practiceMode } = location.state || {};

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

  // Touch swipe for mobile navigation
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe > 50px and more horizontal than vertical
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) handleNext();  // swipe left → next
    else handlePrev();          // swipe right → prev
  };

  // Redirect if no session
  useEffect(() => {
    if (!sessionQuestions || sessionQuestions.length === 0) navigate('/practice-setup');
  }, [sessionQuestions, navigate]);

  // Auto-show result when going back to a previously reviewed question
  useEffect(() => {
    if (reviewedIds.has(q.id)) {
      setShowingResult(true);
    } else {
      setShowingResult(false);
    }
  }, [currentIdx]);

  if (!sessionQuestions || sessionQuestions.length === 0) return null;

  const q = questions[currentIdx];
  const isInstant = practiceMode === 'instant';
  const isMulti = q.correctIndices.length > 1;
  const currentAnswers = answers[q.id] || [];
  const isLast = currentIdx >= questions.length - 1;

  const handleOptionClick = (oi) => {
    if (showingResult) return;
    setAnswers(prev => {
      const a = { ...prev };
      const cur = [...(a[q.id] || [])];
      if (isMulti) {
        const idx = cur.indexOf(oi);
        if (idx >= 0) cur.splice(idx, 1);
        else cur.push(oi);
      } else {
        cur.length = 0;
        cur.push(oi);
      }
      a[q.id] = cur;
      return a;
    });
  };

  const handleNext = () => {
    if (isInstant && !showingResult) {
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
      if (!correct) {
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
    if (isLast) { handleSubmit(); return; }
    setSlideFrom('right');
    setCurrentIdx(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIdx <= 0) return;
    setSlideFrom('left');
    setCurrentIdx(prev => prev - 1);
  };

  const handleSubmit = () => {
    let correctCount = 0;
    const d = { ...data, questionStats: { ...data.questionStats } };
    const originalQuestions = questions.filter(q => !q._retryOf);

    questions.forEach(q => {
      const ua = answers[q.id] || [];
      const c = q.correctIndices.slice().sort((a, b) => a - b);
      const us = ua.slice().sort((a, b) => a - b);
      const statsId = q._retryOf || q.id;
      const isCorrect = arraysEqual(c, us);
      // Only count original questions toward score
      if (!q._retryOf) {
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
      correctCount, score, startedAt: new Date().toISOString(), completedAt: new Date().toISOString()
    };

    d.history = [session, ...d.history].slice(0, 100);
    update(d);

    navigate('/results', { state: { session, score, correctCount, total } });
  };

  const handleQuit = () => {
    if (confirm('Thoát bài làm? Kết quả sẽ không được lưu.')) navigate('/');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
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
  }, [currentIdx, showingResult, answers, q]);

  const answeredCount = Object.values(answers).filter(a => a && a.length > 0).length;
  const progress = (answeredCount / questions.length) * 100;
  const stats = data.questionStats || {};
  const ws = stats[q.id];

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6 sticky top-[73px] z-[5] bg-slate-100 py-2">
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis">
          {(sessionNames || []).join(' + ')}
        </span>
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{answeredCount} / {questions.length}</span>
        <button onClick={handleQuit} className="border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-500" title="Thoát">{'×'}</button>
      </div>

      {/* Question */}
      <div key={currentIdx} className={slideFrom === 'right' ? 'slide-from-right' : 'slide-from-left'}>
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-slate-200 mb-5">
        <div className="text-base sm:text-lg font-semibold mb-5 leading-relaxed">{q.prompt}</div>
        {isMulti && !showingResult && (
          <span className="text-xs text-warning-600 font-medium mb-3 inline-block bg-warning-50 px-2.5 py-0.5 rounded-full">(Chọn nhiều đáp án)</span>
        )}

        <div>
          {q.options.map((opt, oi) => {
            const sel = currentAnswers.includes(oi);
            let cls = '', marker = '';
            if (showingResult) {
              const ic = q.correctIndices.includes(oi);
              if (sel && ic) { cls = 'border-2 border-success-600 bg-success-50 font-semibold'; marker = <span className="ml-auto text-success-600">{'✓'}</span>; }
              else if (sel && !ic) { cls = 'border-2 border-danger-600 bg-danger-50 font-semibold'; marker = <span className="ml-auto text-danger-600">{'×'}</span>; }
              else if (!sel && ic) { cls = 'border-2 border-warning-500 bg-warning-50'; marker = <span className="ml-auto text-warning-600">{'✓'}</span>; }
              else { cls = 'border-2 border-slate-200 bg-white opacity-60'; }
            } else if (sel) { cls = 'opt-selected border-2 border-primary-500 bg-primary-50 font-semibold'; }
            else { cls = 'border-2 border-slate-200 bg-white hover:border-blue-300'; }

            return (
              <button key={oi} onClick={() => handleOptionClick(oi)} disabled={showingResult}
                className={`opt-btn flex items-center gap-3 w-full p-3.5 mb-2 rounded-lg cursor-pointer text-sm text-left transition-all ${cls}`}>
                <span className={`font-bold text-xs min-w-[24px] ${showingResult ? '' : 'text-primary-600'}`}>{opt.label}.</span>
                <span>{escHtml(opt.text)}</span>
                {marker}
              </button>
            );
          })}
        </div>

        {showingResult && q.explanation && (
          <div className="mt-3 p-3 bg-primary-50 rounded-lg text-[0.8rem] leading-relaxed">
            <strong>{arraysEqual(currentAnswers.slice().sort((a,b)=>a-b), q.correctIndices.slice().sort((a,b)=>a-b)) ? 'Giải thích:' : 'Đáp án đúng - Giải thích:'}</strong> {escHtml(q.explanation)}
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
          className="border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all text-slate-600 disabled:opacity-50">
          Trước
        </button>
        <span className="text-xs text-slate-500 self-center">Câu {currentIdx + 1} / {questions.length}</span>
        <button onClick={handleNext} className={`px-4 py-2.5 rounded-lg text-sm font-semibold active:scale-95 transition-all text-white ${
          (isInstant && showingResult && isLast) || (!isInstant && isLast) ? 'bg-success-600 hover:bg-success-700' : 'bg-primary-600 hover:bg-primary-700'
        }`}>
          {isInstant && !showingResult ? 'Xem đáp án' : isInstant && showingResult && isLast ? 'Hoàn thành' : isInstant && showingResult ? 'Tiếp tục' : isLast ? 'Nộp bài' : 'Sau'}
        </button>
      </div>
    </div>
  );
}
