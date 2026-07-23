import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { escHtml, arraysEqual } from '../data/storage';

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useQuiz();
  const { session, score, correctCount, total } = location.state || {};

  if (!session) return null;

  const pct = score || 0;
  const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  const stats = data.questionStats || {};

  return (
    <div>
      <div className="text-center p-8 bg-white rounded-xl shadow-sm border-2 border-primary-600 mb-6">
        <div className="text-5xl font-extrabold text-primary-600 leading-none">{pct}%</div>
        <div className="text-sm text-slate-500 mt-2">Đúng {correctCount}/{total} câu</div>
        <div className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>

      <div>
        {(session.questions || []).map((q, i) => {
          const ua = session.answers[q.id] || [];
          const c = q.correctIndices.slice().sort((a, b) => a - b);
          const us = ua.slice().sort((a, b) => a - b);
          const ok = arraysEqual(c, us);
          const ws = stats[q.id];

          return (
            <div key={i} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-3 ${ok ? 'border-l-4 border-l-success-600' : 'border-l-4 border-l-danger-600'}`}>
              <div className="font-semibold mb-3">
                {ok ? '✓' : '×'} Câu {i + 1}: {escHtml(q.prompt)}
                {q.correctIndices.length > 1 && <span className="text-[0.7rem] text-warning-600 ml-2">(Chọn nhiều)</span>}
                {ws && ws.wrongCount > 0 && <span className="text-[0.7rem] text-danger-500 ml-2">(Đã sai {ws.wrongCount} lần)</span>}
              </div>

              {q.options.map((opt, oi) => {
                const up = us.includes(oi), ic = c.includes(oi);
                let cls = '';
                if (up && ic) cls = 'bg-success-100 text-success-700';
                else if (up && !ic) cls = 'bg-danger-100 text-danger-700';
                else if (!up && ic) cls = 'bg-warning-100 text-warning-700';
                return (
                  <div key={oi} className={`py-2 px-3 mb-1 rounded-md text-sm flex items-center gap-2 ${cls}`}>
                    <span className="font-bold min-w-[24px]">{opt.label}.</span>
                    <span>{escHtml(opt.text)}</span>
                    {ic && <span className="ml-auto">{'✓'}</span>}
                    {up && !ic && <span className="ml-auto">{'×'}</span>}
                  </div>
                );
              })}

              {q.explanation && (
                <div className="mt-3 p-3 bg-primary-50 rounded-lg text-[0.8rem] leading-relaxed">
                  <strong>Giải thích:</strong> {escHtml(q.explanation)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={() => navigate('/practice-setup')} className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg text-base font-semibold hover:bg-primary-700 active:scale-95 transition-all">Làm lại</button>
        <button onClick={() => navigate('/')} className="border border-slate-200 px-4 py-3 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-600">Về trang chủ</button>
      </div>
    </div>
  );
}
