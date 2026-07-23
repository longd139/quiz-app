import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { escHtml, fmtDate } from '../data/storage';
import Results from './Results';

export default function History() {
  const { data, update, showConfirm } = useQuiz();
  const navigate = useNavigate();
  const [viewingSession, setViewingSession] = useState(null);

  if (viewingSession) {
    return (
      <div>
        <button onClick={() => setViewingSession(null)} className="border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-600 mb-4">
          Quay lại lịch sử
        </button>
        <ResultsWrapper session={viewingSession} data={data} navigate={navigate} />
      </div>
    );
  }

  const sessions = data.history || [];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <h3 className="text-base font-semibold">Lịch sử luyện tập</h3>
        <span className="flex-1" />
        <button onClick={() => {
          showConfirm('Xóa toàn bộ lịch sử luyện tập?', () => update({ ...data, history: [] }));
        }} className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50">
          Xóa lịch sử
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 px-5 text-slate-500 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-sm">Chưa có lịch sử luyện tập nào.</p>
        </div>
      ) : (
        sessions.map((s, idx) => {
          const pct = s.score || 0;
          const color = pct >= 80 ? 'text-success-600' : pct >= 50 ? 'text-warning-600' : 'text-danger-600';
          return (
            <div key={idx} onClick={() => setViewingSession(s)}
              className="flex items-center justify-between gap-3 p-3.5 bg-white rounded-xl shadow-sm border border-slate-200 mb-2 cursor-pointer hover:border-primary-500 transition-all">
              <div className={`text-xl font-extrabold min-w-[56px] text-center ${color}`}>{pct}%</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{escHtml((s.testNames || []).join(' + '))}</div>
                <div className="text-[0.7rem] text-slate-500">{fmtDate(s.completedAt)} &middot; {s.correctCount}/{s.totalQuestions} đúng</div>
              </div>
              <span className="text-slate-400">&rsaquo;</span>
            </div>
          );
        })
      )}
    </div>
  );
}

// Reuse results display for history detail
function ResultsWrapper({ session, data, navigate }) {
  if (!session) return null;
  const pct = session.score || 0;
  const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  const stats = data.questionStats || {};

  return (
    <div>
      <div className="text-center p-8 bg-white rounded-xl shadow-sm border-2 border-primary-600 mb-6">
        <div className="text-5xl font-extrabold text-primary-600 leading-none">{pct}%</div>
        <div className="text-sm text-slate-500 mt-2">Đúng {session.correctCount}/{session.totalQuestions} câu</div>
        <div className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>

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
                  <span className="font-bold min-w-[24px]">{opt.label}.</span><span>{escHtml(opt.text)}</span>
                  {ic && <span className="ml-auto">&check;</span>}
                  {up && !ic && <span className="ml-auto">&times;</span>}
                </div>
              );
            })}
            {q.explanation && (
              <div className="mt-3 p-3 bg-primary-50 rounded-lg text-[0.8rem] leading-relaxed"><strong>Giải thích:</strong> {escHtml(q.explanation)}</div>
            )}
          </div>
        );
      })}
      <button onClick={() => navigate('/history')} className="border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-600 mt-4 w-full">
        Quay lại lịch sử
      </button>
    </div>
  );
}

function arraysEqual(a, b) { if (a.length !== b.length) return false; return a.every((v, i) => v === b[i]); }
