import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { getFilteredTests, getCollectionName, escHtml, truncate, fmtDate } from '../data/storage';
import StreakHeatmap from '../components/StreakHeatmap';
import { recordAuditLog, AUDIT_TYPES, AUDIT_CATEGORIES } from '../data/auditTrail';

const SUBJECT_ACCENTS = [
  { border: 'border-l-amber-500', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { border: 'border-l-emerald-500', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { border: 'border-l-sky-500', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { border: 'border-l-rose-500', badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  { border: 'border-l-indigo-500', badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  { border: 'border-l-orange-500', badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  { border: 'border-l-violet-500', badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { border: 'border-l-teal-500', badge: 'bg-teal-500/15 text-teal-700 dark:text-teal-300' },
];

function getSubjectAccent(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SUBJECT_ACCENTS[hash % SUBJECT_ACCENTS.length];
}

function getSubjectCode(name = '') {
  const clean = name.trim();
  if (!clean) return 'SUB';
  const match = clean.match(/^[A-Za-z]{2,4}/);
  if (match) return match[0].toUpperCase();
  return clean.slice(0, 3).toUpperCase();
}

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
        term: (c.term || '').trim() || 'Chung',
        description: c.description || '',
        testCount: colTests.length,
        questionCount,
      };
    });

    const uncategorized = tests.filter((t) => !t.collectionId);
    if (uncategorized.length > 0) {
      cols.push({
        id: '__uncategorized__',
        name: 'Chưa phân loại',
        term: 'Khác',
        description: 'Các bài kiểm tra chưa gán vào môn',
        testCount: uncategorized.length,
        questionCount: uncategorized.reduce((acc, t) => acc + (t.questions?.length || 0), 0),
      });
    }

    return cols;
  }, [data.collections, data.tests]);

  const termGroups = useMemo(() => {
    const map = new Map();
    for (const col of collectionCards) {
      const key = col.term || 'Chung';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(col);
    }
    return Array.from(map.entries()).map(([term, subjects]) => ({
      term,
      subjects,
    }));
  }, [collectionCards]);

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
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={() => setSelectedCollectionId(null)}
            className={`transition-colors cursor-pointer ${
              selectedCollectionId === null
                ? 'font-bold text-slate-900 dark:text-slate-100'
                : 'font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Kho đề thi
          </button>
          {activeCollection && (
            <>
              <span className="text-slate-400 select-none">&gt;</span>
              <button
                type="button"
                onClick={() => setSelectedCollectionId(null)}
                className="font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
              >
                {escHtml(activeCollection.term)}
              </button>
              <span className="text-slate-400 select-none">&gt;</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
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

      {/* Level 1: Term sections + Subject cards */}
      {selectedCollectionId === null ? (
        termGroups.length === 0 ? (
          <div className="text-center py-16 px-5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full border-2 border-slate-300 mx-auto mb-3" />
            <p className="text-sm">Chưa có kỳ học hoặc môn học nào.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {termGroups.map((group) => (
              <section key={group.term} className="space-y-3">
                {/* Term heading: plain text + pill count + divider */}
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {escHtml(group.term)}
                  </h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/70">
                    {group.subjects.length} môn
                  </span>
                  <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800" />
                </div>

                {/* Subject cards grid */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {group.subjects.map((sub) => {
                    const accent = getSubjectAccent(sub.name);
                    const code = getSubjectCode(sub.name);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedCollectionId(sub.id)}
                        className={`text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 border-l-4 ${accent.border} p-3.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3 group`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-10 h-10 rounded-lg text-[11px] font-extrabold tracking-tight flex items-center justify-center shrink-0 ${accent.badge}`}>
                            {code}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {escHtml(sub.name)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {sub.testCount} đề
                            </div>
                          </div>
                        </div>

                        <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                          &gt;
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        /* Level 2: Test Cards inside selected Subject Collection */
        filteredTests.length === 0 ? (
          <div className="text-center py-16 px-5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-sm mb-3">Môn này chưa có bài kiểm tra nào.</p>
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
