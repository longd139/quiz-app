import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { getFilteredTests, getCollectionName, escHtml } from '../data/storage';

export default function PracticeSetup() {
  const { data, update, showAlert } = useQuiz();
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectIdx = location.state?.preSelectIdx;

  const [filterId, setFilterId] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => {
    if (preSelectIdx !== undefined && preSelectIdx !== null) {
      return new Set([data.tests[preSelectIdx]?.id].filter(Boolean));
    }
    return new Set();
  });
  const [shuffleQuestions, setShuffleQuestions] = useState(data.settings.shuffleQuestions !== false);
  const [shuffleOptions, setShuffleOptions] = useState(data.settings.shuffleOptions === true);
  const [practiceMode, setPracticeMode] = useState(data.settings.practiceMode || 'submit');

  const filteredTests = useMemo(() => getFilteredTests(data, filterId), [data, filterId]);

  const toggleTest = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    if (selectedIds.size === 0) return;
    const selectedTests = data.tests.filter(t => selectedIds.has(t.id));
    let allQuestions = [];
    selectedTests.forEach(test => {
      test.questions.forEach(q => allQuestions.push({ ...q, _testName: test.name }));
    });
    if (allQuestions.length === 0) { showAlert('Không có câu hỏi', 'Các bài đã chọn không có câu hỏi nào.', 'warning'); return; }

    if (shuffleQuestions) {
      const arr = allQuestions.slice();
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      allQuestions = arr;
    }

    if (shuffleOptions) {
      allQuestions = allQuestions.map(q => {
        const indices = q.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
        const map = {}; indices.forEach((o, n) => { map[o] = n; });
        const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return { ...q, options: indices.map((i, n) => ({ ...q.options[i], label: labels[n] })), correctIndices: q.correctIndices.map(ci => map[ci]).sort((a, b) => a - b) };
      });
    }

    // Save settings
    const d = { ...data, settings: { ...data.settings, shuffleQuestions, shuffleOptions, practiceMode } };
    update(d);

    navigate('/practice', {
      state: {
        sessionQuestions: allQuestions,
        sessionNames: selectedTests.map(t => t.name),
        practiceMode
      }
    });
  };

  return (
    <div>
      <div className="mb-4">
        <label className="font-semibold text-sm block mb-1.5">Lọc theo collection:</label>
        <select value={filterId} onChange={e => setFilterId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-200 outline-none">
          <option value="">Tất cả collection</option>
          {data.collections.map(c => <option key={c.id} value={c.id}>{escHtml(c.name)}</option>)}
        </select>
      </div>

      <h3 className="text-base font-semibold mb-2">Chọn bài để luyện tập</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Có thể chọn nhiều bài để gộp chung.</p>

      {filteredTests.length === 0 ? (
        <div className="text-center py-16 px-5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 mb-5">
          <p className="text-sm">Chưa có bài nào để luyện tập.<br />Hãy thêm bài mới trước!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-5">
          {filteredTests.map(test => {
            const selected = selectedIds.has(test.id);
            return (
              <label key={test.id}
                onClick={() => toggleTest(test.id)}
                className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${selected ? 'border-primary-500 bg-primary-100 dark:bg-primary-700/30 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-700/20'}`}>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{escHtml(test.name)}</div>
                  <div className="text-[0.7rem] text-slate-500">{escHtml(getCollectionName(data.collections, test.collectionId))} &middot; {test.questions.length} câu</div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-5">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} /> Trộn câu hỏi
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} /> Trộn đáp án
        </label>
      </div>

      <label className="font-semibold text-sm block mb-1.5">Chế độ luyện tập:</label>
      <select value={practiceMode} onChange={e => setPracticeMode(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm mb-5 bg-white dark:bg-slate-800 dark:text-slate-200">
        <option value="instant">Xem đáp án ngay (sau mỗi câu)</option>
        <option value="submit">Nộp bài mới xem kết quả</option>
      </select>

      <button onClick={handleStart} disabled={selectedIds.size === 0}
        className="w-full bg-primary-600 text-white px-4 py-3.5 rounded-lg text-base font-semibold hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none">
        Bắt đầu luyện tập
      </button>
    </div>
  );
}
