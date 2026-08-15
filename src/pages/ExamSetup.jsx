import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { getFilteredTests, getCollectionName, escHtml } from '../data/storage';

const TIME_PRESETS = [15, 20, 25, 30, 45, 60];

export default function ExamSetup() {
  const { data, update, showAlert } = useQuiz();
  const navigate = useNavigate();

  const [filterId, setFilterId] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [numQuestions, setNumQuestions] = useState(20);
  // timeLimit stored in minutes; 0 = chưa chọn (bắt buộc)
  const [timeLimit, setTimeLimit] = useState(30);
  const [customTime, setCustomTime] = useState('');
  const [shuffleOptions, setShuffleOptions] = useState(data.settings.shuffleOptions === true);
  const [practiceMode, setPracticeMode] = useState('instant');

  const filteredTests = useMemo(() => getFilteredTests(data, filterId), [data, filterId]);
  const selectedTests = data.tests.filter(t => selectedIds.has(t.id));
  const totalAvailable = useMemo(() => {
    let n = 0;
    selectedTests.forEach(t => n += t.questions.length);
    return n;
  }, [selectedTests]);

  const toggleTest = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chooseTime = (minutes) => {
    setTimeLimit(minutes);
    setCustomTime('');
  };

  const handleCustomTime = (val) => {
    setCustomTime(val);
    const m = parseInt(val, 10);
    if (Number.isFinite(m) && m > 0) setTimeLimit(m);
  };

  const handleStart = () => {
    if (selectedIds.size === 0) { showAlert('Chưa chọn bài', 'Vui lòng chọn ít nhất 1 bài kiểm tra.', 'warning'); return; }
    if (totalAvailable === 0) { showAlert('Không có câu hỏi', 'Các bài đã chọn không có câu hỏi nào.', 'warning'); return; }

    const requested = numQuestions > 0 ? numQuestions : totalAvailable;
    const n = Math.min(requested, totalAvailable);
    const effectiveTime = timeLimit > 0 ? timeLimit : 30;

    // Gom pool câu hỏi từ các bài đã chọn, gắn _testName
    let pool = [];
    selectedTests.forEach(test => {
      test.questions.forEach(q => pool.push({ ...q, _testName: test.name }));
    });

    // Fisher–Yates partial: bốc n câu ngẫu nhiên không trùng
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let picked = pool.slice(0, n);

    if (shuffleOptions) {
      picked = picked.map(q => {
        const indices = q.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
        const map = {}; indices.forEach((o, i) => { map[o] = i; });
        const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return { ...q, options: indices.map((o, i) => ({ ...q.options[o], label: labels[i] })), correctIndices: q.correctIndices.map(ci => map[ci]).sort((a, b) => a - b) };
      });
    }

    // Lưu cài đặt mặc định (chỉ trộn đáp án)
    const d = { ...data, settings: { ...data.settings, shuffleOptions } };
    update(d);

    navigate('/practice', {
      state: {
        sessionQuestions: picked,
        sessionNames: selectedTests.map(t => t.name),
        practiceMode,
        timeLimit: effectiveTime,
        isExam: true,
      }
    });
  };

  const requested = numQuestions > 0 ? numQuestions : totalAvailable;
  const nValid = totalAvailable > 0 && requested >= 1 && requested <= totalAvailable;

  return (
    <div>
      <h3 className="text-base font-semibold mb-1">Tạo bài kiểm tra</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Chọn nhiều bài, hệ thống sẽ bốc ngẫu nhiên đủ số câu và tính giờ làm bài.
      </p>

      {/* Lọc collection */}
      <div className="mb-4">
        <label className="font-semibold text-sm block mb-1.5">Lọc theo collection:</label>
        <select value={filterId} onChange={e => setFilterId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-200 outline-none">
          <option value="">Tất cả collection</option>
          {data.collections.map(c => <option key={c.id} value={c.id}>{escHtml(c.name)}</option>)}
        </select>
      </div>

      {/* Chọn bài */}
      <h4 className="text-sm font-semibold mb-2">Chọn bài để tạo kiểm tra</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Có thể chọn nhiều bài.</p>

      {filteredTests.length === 0 ? (
        <div className="text-center py-14 px-5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 mb-5">
          <p className="text-sm">Chưa có bài nào. Hãy soạn bài trước!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-5">
          {filteredTests.map(test => {
            const selected = selectedIds.has(test.id);
            return (
              <label key={test.id} onClick={() => toggleTest(test.id)}
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

      {/* Số câu cần bốc */}
      {selectedIds.size > 0 && (
        <div className="mb-5">
          <label className="font-semibold text-sm block mb-1.5">
            Số câu cần bốc <span className="text-slate-500 font-normal">(có {totalAvailable} câu trong {selectedTests.length} bài)</span>
          </label>
          <div className="flex gap-2">
            <input type="number" min={1} max={totalAvailable} value={numQuestions}
              onChange={e => setNumQuestions(parseInt(e.target.value, 10) || 0)}
              className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-primary-500" />
            <button onClick={() => setNumQuestions(totalAvailable)} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Tất cả ({totalAvailable})</button>
          </div>
          {requested > totalAvailable && (
            <p className="text-xs text-warning-600 mt-1">Số câu vượt quá tổng hiện có. Sẽ bốc tối đa {totalAvailable} câu.</p>
          )}
        </div>
      )}

      {/* Thời gian làm bài */}
      <div className="mb-5">
        <label className="font-semibold text-sm block mb-1.5">Thời gian làm bài</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {TIME_PRESETS.map(m => (
            <button key={m} onClick={() => chooseTime(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeLimit === m && !customTime ? 'bg-primary-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              {m} phút
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Hoặc tự nhập:</span>
          <input type="number" min={1} value={customTime} onChange={e => handleCustomTime(e.target.value)}
            placeholder="Số phút..."
            className="w-28 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-primary-500" />
          <span className="text-xs text-slate-500">phút</span>
        </div>
      </div>

      {/* Trộn đáp án */}
      <label className="flex items-center gap-2 cursor-pointer text-sm mb-4">
        <input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} /> Trộn đáp án
      </label>

      {/* Chế độ xem đáp án */}
      <div className="mb-6">
        <label className="font-semibold text-sm block mb-1.5">Xem đáp án:</label>
        <select value={practiceMode} onChange={e => setPracticeMode(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-primary-500">
          <option value="instant">Xem đáp án ngay (sau mỗi câu)</option>
          <option value="submit">Nộp bài mới xem kết quả</option>
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {practiceMode === 'instant' ? 'Chọn đáp án → "Xem đáp án" để xem đúng/sai ngay tại câu đó.' : 'Làm hết bài rồi nộp, đáp án hiển thị ở trang kết quả.'}
        </p>
      </div>

      <button onClick={handleStart} disabled={selectedIds.size === 0 || totalAvailable === 0 || !nValid}
        className="w-full bg-primary-600 text-white px-4 py-3.5 rounded-lg text-base font-semibold hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none">
        Bắt đầu làm bài kiểm tra
      </button>
    </div>
  );
}