import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { getFilteredTests, getCollectionName, escHtml, truncate, fmtDate } from '../data/storage';

export default function Dashboard() {
  const { data, update, showConfirm } = useQuiz();
  const navigate = useNavigate();
  const [filterId, setFilterId] = useState('');

  const filteredTests = useMemo(() => getFilteredTests(data, filterId), [data, filterId]);

  const handleDelete = (idx) => {
    const test = data.tests[idx];
    showConfirm(`Xóa bài "${test.name}" (${test.questions.length} câu)? Hành động này không thể hoàn tác.`, () => {
      const d = { ...data, tests: data.tests.filter((_, i) => i !== idx) };
      update(d);
    });
  };

  const handleEdit = (idx) => {
    navigate(`/editor/${data.tests[idx].id}`);
  };

  const handlePracticeCard = (idx) => {
    navigate('/practice-setup', { state: { preSelectIdx: idx } });
  };

  const handleReviewWrong = () => {
    const stats = data.questionStats || {};
    let wrongQuestions = [];
    data.tests.forEach(test => {
      test.questions.forEach(q => {
        if (stats[q.id] && stats[q.id].wrongCount > 0) {
          wrongQuestions.push({ ...q, _wrongCount: stats[q.id].wrongCount, _testName: test.name });
        }
      });
    });
    if (wrongQuestions.length === 0) { alert('Chưa có câu nào bị sai. Hãy luyện tập thêm!'); return; }
    wrongQuestions.sort((a, b) => b._wrongCount - a._wrongCount);
    navigate('/practice', {
      state: {
        sessionQuestions: wrongQuestions,
        sessionNames: [`Ôn lại câu sai (${wrongQuestions.length} câu)`],
        practiceMode: data.settings.practiceMode || 'submit'
      }
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <select value={filterId} onChange={e => setFilterId(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold bg-white outline-none focus:border-primary-500">
          <option value="">Tất cả collection</option>
          {data.collections.map(c => (
            <option key={c.id} value={c.id}>{escHtml(c.name)}</option>
          ))}
        </select>
        <button onClick={() => navigate('/editor')} className="bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">+ Thêm bài mới</button>
        <button onClick={handleReviewWrong} className="bg-warning-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-warning-700 active:scale-95 transition-all">Ôn lại câu sai</button>
        <span className="flex-1" />
        <button onClick={() => navigate('/data')} className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-slate-600">Xuất JSON</button>
        <button onClick={() => navigate('/data')} className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-slate-600">Nhập JSON</button>
      </div>

      {filteredTests.length === 0 ? (
        <div className="text-center py-16 px-5 text-slate-500 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-full border-2 border-slate-300 mx-auto mb-3" />
          <p className="text-sm mb-4">Chưa có bài nào.<br />Nhấn "<strong>+ Thêm bài mới</strong>" để bắt đầu!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredTests.map(test => {
            const idx = data.tests.indexOf(test);
            const collName = getCollectionName(data.collections, test.collectionId);
            return (
              <div key={test.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-semibold">{escHtml(test.name)}</h3>
                  <span className="text-[0.7rem] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">{test.questions.length} câu</span>
                </div>
                <p className="text-[0.65rem] text-primary-600 font-medium mb-1">{escHtml(collName)}</p>
                <p className="text-[0.7rem] text-slate-500 mb-3">{fmtDate(test.createdAt)} &middot; {fmtDate(test.updatedAt)}</p>
                {test.questions.length > 0 && (
                  <p className="text-[0.7rem] text-slate-500 mb-3">
                    {test.questions.slice(0, 3).map(q => '• ' + escHtml(truncate(q.prompt, 60))).join('\n')}
                    {test.questions.length > 3 && '\n• ...'}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(idx)} className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-slate-600">Sửa</button>
                  <button onClick={() => handlePracticeCard(idx)} className="bg-success-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-success-700 active:scale-95 transition-all">Luyện tập</button>
                  <button onClick={() => handleDelete(idx)} className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all text-danger-600">Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
