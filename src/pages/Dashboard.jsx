import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { getFilteredTests, getCollectionName, escHtml, truncate, fmtDate } from '../data/storage';
import StreakHeatmap from '../components/StreakHeatmap';
import { IconFolder } from '../components/Icons';
import { recordAuditLog, AUDIT_TYPES, AUDIT_CATEGORIES } from '../data/auditTrail';

export default function Dashboard() {
  const { data, isAdmin, update, showConfirm, showAlert } = useQuiz();
  const navigate = useNavigate();
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);

  const collectionCards = useMemo(() => {
    const tests = data.tests || [];
    const cols = (data.collections || []).map((c) => {
      const colTests = tests.filter((t) => t.collectionId === c.id);
      const questionCount = colTests.reduce((acc, t) => acc + (t.questions?.length || 0), 0);
      return {
        id: c.id,
        name: c.name,
        description: c.description || '',
        testCount: colTests.length,
        questionCount,
        updatedAt: colTests[0]?.updatedAt || c.createdAt,
      };
    });

    const uncategorized = tests.filter((t) => !t.collectionId);
    if (uncategorized.length > 0) {
      cols.push({
        id: '__uncategorized__',
        name: 'Chưa phân loại',
        description: 'Các bài kiểm tra chưa gán vào collection',
        testCount: uncategorized.length,
        questionCount: uncategorized.reduce((acc, t) => acc + (t.questions?.length || 0), 0),
        updatedAt: uncategorized[0]?.updatedAt,
      });
    }

    return cols;
  }, [data.collections, data.tests]);

  const activeCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return collectionCards.find((c) => c.id === selectedCollectionId) || null;
  }, [selectedCollectionId, collectionCards]);

  const filteredTests = useMemo(() => {
    if (!selectedCollectionId) return [];
    if (selectedCollectionId === '__uncategorized__') {
      return (data.tests || []).filter((t) => !t.collectionId);
    }
    return getFilteredTests(data, selectedCollectionId);
  }, [data, selectedCollectionId]);

  const handleDelete = (idx) => {
    const test = data.tests[idx];
    showConfirm(`Xóa bài "${test.name}" (${test.questions.length} câu)? Hành động này không thể hoàn tác.`, () => {
      const d = { ...data, tests: data.tests.filter((_, i) => i !== idx) };
      update(d);
      recordAuditLog({
        type: AUDIT_TYPES.TEST_DELETE,
        category: AUDIT_CATEGORIES.TEST,
        title: `Xóa bài test: "${test.name}"`,
        detail: {
          testName: test.name,
          questionsCount: test.questions.length
        }
      });
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
        if (stats[q.id] && (stats[q.id].wrongCount > 0 || stats[q.id].wrong > 0)) {
          wrongQuestions.push({ ...q, _wrongCount: stats[q.id].wrongCount || stats[q.id].wrong, _testName: test.name });
        }
      });
    });
    if (wrongQuestions.length === 0) { showAlert('Không có câu sai', 'Chưa có câu nào bị sai. Hãy luyện tập thêm!', 'info'); return; }
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
    <div className="space-y-5">
      <StreakHeatmap />

      {/* Breadcrumb & Actions Toolbar */}
      <div className="flex flex-wrap gap-2.5 mb-5 items-center">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setSelectedCollectionId(null)}
            className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              selectedCollectionId === null
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Kho đề thi
          </button>
          {activeCollection && (
            <>
              <span className="text-slate-400 select-none px-0.5">&gt;</span>
              <span className="px-3 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                {escHtml(activeCollection.name)}
              </span>
            </>
          )}
        </nav>

        <span className="flex-1" />

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/editor')}
            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
          >
            + Thêm bài mới
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/exam-setup')}
          className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
        >
          Tạo bài kiểm tra
        </button>
        <button
          type="button"
          onClick={handleReviewWrong}
          className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
        >
          Ôn lại câu sai
        </button>
        <button
          type="button"
          onClick={() => navigate('/data')}
          className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          Xuất JSON
        </button>
      </div>

      {/* Level 1: Collection Cards */}
      {selectedCollectionId === null ? (
        collectionCards.length === 0 ? (
          <div className="text-center py-16 px-5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full border-2 border-slate-300 mx-auto mb-3" />
            <p className="text-sm">Chưa có bộ sưu tập đề thi nào.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {collectionCards.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setSelectedCollectionId(col.id)}
                className="text-left bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors">
                    <IconFolder className="w-4 h-4" />
                  </div>
                  <span className="text-[0.7rem] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {col.testCount} bài · {col.questionCount} câu
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {escHtml(col.name)}
                </h3>
                {col.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                    {escHtml(col.description)}
                  </p>
                )}
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors mt-2">
                  Nhấn để xem danh sách bài &rarr;
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        /* Level 2: Test Cards inside selected Collection */
        filteredTests.length === 0 ? (
          <div className="text-center py-16 px-5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-sm mb-3">Collection này chưa có bài kiểm tra nào.</p>
            <button
              type="button"
              onClick={() => setSelectedCollectionId(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              &larr; Quay lại Kho đề thi
            </button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTests.map(test => {
              const idx = data.tests.indexOf(test);
              const collName = getCollectionName(data.collections, test.collectionId);
              return (
                <div key={test.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-semibold">{escHtml(test.name)}</h3>
                    <span className="text-[0.7rem] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full whitespace-nowrap">{test.questions.length} câu</span>
                  </div>
                  <p className="text-[0.65rem] text-slate-500 dark:text-slate-400 font-medium mb-1">{escHtml(collName)}</p>
                  <p className="text-[0.7rem] text-slate-500 dark:text-slate-400 mb-3">{fmtDate(test.createdAt)} &middot; {fmtDate(test.updatedAt)}</p>
                  {test.questions.length > 0 && (
                    <p className="text-[0.7rem] text-slate-500 dark:text-slate-400 mb-3">
                      {test.questions.slice(0, 3).map(q => '• ' + escHtml(truncate(q.prompt, 60))).join('\n')}
                      {test.questions.length > 3 && '\n• ...'}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {isAdmin && (
                      <button onClick={() => handleEdit(idx)} className="border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 cursor-pointer">Sửa</button>
                    )}
                    <button onClick={() => handlePracticeCard(idx)} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-95 transition-all cursor-pointer">Luyện tập</button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(idx)} className="border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer">Xóa</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
