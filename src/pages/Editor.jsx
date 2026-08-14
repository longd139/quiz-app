import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuiz } from '../App';
import { createQuestion, createTest, createCollection, uid, escHtml, getFilteredTests, renderMd } from '../data/storage';
import { parseBulkPaste } from '../data/parser';

export default function Editor() {
  const { data, update, showConfirm, showAlert, showToast } = useQuiz();
  const navigate = useNavigate();
  const { testId } = useParams();

  // Find existing test if editing
  const existingTest = useMemo(() => testId ? data.tests.find(t => t.id === testId) : null, [testId, data.tests]);

  const [testName, setTestName] = useState(existingTest?.name || '');
  const [collectionId, setCollectionId] = useState(existingTest?.collectionId || '');
  const [questions, setQuestions] = useState(() => existingTest?.questions?.map(q => ({ ...q })) || []);
  const [bulkText, setBulkText] = useState('');
  const [parseFeedback, setParseFeedback] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [errors, setErrors] = useState({});

  // Refs for scroll-to-error
  const testNameRef = useRef(null);
  const collectionRef = useRef(null);
  const questionRefs = useRef({});
  const questionsSectionRef = useRef(null);
  const bulkSectionRef = useRef(null);
  const saveRef = useRef(null);

  // Question picker from other tests
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [pickerTestId, setPickerTestId] = useState(null);
  const [pickerSelections, setPickerSelections] = useState({});
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // Get other tests in same collection
  const otherTests = useMemo(() => {
    return getFilteredTests(data, collectionId).filter(t => t.id !== testId);
  }, [data, collectionId, testId]);

  const pickerTest = useMemo(() => {
    return pickerTestId ? data.tests.find(t => t.id === pickerTestId) : null;
  }, [data, pickerTestId]);

  const handleParse = () => {
    const result = parseBulkPaste(bulkText);
    if (result.questions.length === 0) {
      setParseFeedback(`<div class="text-sm py-2 px-3 rounded-lg bg-danger-50 dark:bg-danger-700/20 text-danger-700 dark:text-danger-300 border border-danger-100 dark:border-danger-700/50">${result.warnings.join('<br>')}</div>`);
      return;
    }
    let msg = `<div class="text-sm py-2 px-3 rounded-lg bg-success-50 dark:bg-success-700/20 text-success-700 dark:text-success-300 border border-success-100 dark:border-success-700/50">&check; Đã phân tích được <strong>${result.questions.length}</strong> câu hỏi.</div>`;
    if (result.warnings.length > 0) msg += `<div class="text-sm py-2 px-3 rounded-lg bg-warning-50 dark:bg-warning-700/20 text-warning-700 dark:text-warning-300 border border-warning-100 dark:border-warning-700/50 mt-2">${result.warnings.join('<br>')}</div>`;
    setParseFeedback(msg);

    if (questions.length > 0) {
      showConfirm(
        `Đã có ${questions.length} câu hỏi trong bài hiện tại. Bạn muốn làm gì?`,
        () => setQuestions([...questions, ...result.questions]),
        {
          title: 'Nhập hàng loạt',
          yesLabel: 'Thêm mới',
          noLabel: 'Thay thế',
          danger: false,
          onNo: () => setQuestions(result.questions),
        }
      );
    } else {
      setQuestions(result.questions);
    }
    setBulkText('');
  };

  const handleAddManual = () => {
    setQuestions([...questions, createQuestion()]);
  };

  const handleCreateCollection = () => {
    const name = newCollectionName.trim();
    if (!name) { showAlert('Chưa nhập tên', 'Vui lòng nhập tên collection.', 'warning'); return; }
    const newColl = createCollection(name);
    const d = { ...data, collections: [...data.collections, newColl] };
    update(d);
    setCollectionId(newColl.id);
    setShowNewCollection(false);
    setNewCollectionName('');
  };

  const handleCollectionChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') { setShowNewCollection(true); return; }
    setShowNewCollection(false);
    setCollectionId(val);
  };

  // Validate form, returns errors object
  const validate = useCallback(() => {
    const e = { questions: {} };

    if (!testName.trim()) e.testName = true;
    if (!collectionId) e.collectionId = true;
    if (questions.length === 0) e.noQuestions = true;

    // Check duplicate test name in same collection
    if (testName.trim() && collectionId) {
      const dup = data.tests.find(t =>
        t.collectionId === collectionId &&
        t.name.trim().toLowerCase() === testName.trim().toLowerCase() &&
        t.id !== testId
      );
      if (dup) e.duplicateName = true;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qe = {};
      if (!q.prompt.trim()) qe.prompt = true;
      if (q.correctIndices.length === 0) qe.correct = true;
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          if (!qe.option) qe.option = {};
          qe.option[j] = true;
        }
      }
      if (Object.keys(qe).length > 0) e.questions[i] = qe;
    }

    return e;
  }, [testName, collectionId, questions, data.tests, testId]);

  // Real-time validation
  useEffect(() => {
    setErrors(validate());
  }, [validate]);

  const scrollToError = (errs) => {
    setTimeout(() => {
      if ((errs.testName || errs.duplicateName) && testNameRef.current) {
        testNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        testNameRef.current.focus();
      } else if (errs.collectionId && collectionRef.current) {
        collectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        collectionRef.current.focus();
      } else if (errs.noQuestions && bulkSectionRef.current) {
        bulkSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const qIdx = Object.keys(errs.questions || {})[0];
        if (qIdx !== undefined) {
          const qErrs = errs.questions[qIdx];
          const el = questionRefs.current[qIdx];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              if (qErrs.prompt) {
                const inp = el.querySelector('input[placeholder="Nội dung câu hỏi"]');
                if (inp) inp.focus();
              } else if (qErrs.correct) {
                const cb = el.querySelector('input[type="checkbox"]');
                if (cb) cb.focus();
              } else if (qErrs.option) {
                const oi = Object.keys(qErrs.option)[0];
                const opts = el.querySelectorAll('input[placeholder^="Nội dung đáp án"]');
                if (opts[oi]) opts[oi].focus();
              }
            }, 150);
          }
        }
      }
    }, 100);
  };

  const handleSave = () => {
    const e = validate();
    setErrors(e);

    if (e.testName || e.collectionId || e.noQuestions || e.duplicateName || Object.keys(e.questions).length > 0) {
      scrollToError(e);
      return;
    }

    setErrors({});
    const now = new Date().toISOString();
    let d;
    if (existingTest) {
      const idx = data.tests.findIndex(t => t.id === testId);
      d = { ...data, tests: [...data.tests] };
      d.tests[idx] = { ...d.tests[idx], name: testName, collectionId, questions: questions.map(q => ({ ...q })), updatedAt: now };
    } else {
      const test = createTest(testName, collectionId);
      test.questions = questions.map(q => ({ ...q }));
      test.updatedAt = now;
      d = { ...data, tests: [...data.tests, test] };
    }
    update(d);
    if (existingTest) {
      showToast(`✅ Đã cập nhật bài test "${testName}" thành công.`, 'success');
    } else {
      showToast(`✅ Đã tạo bài test "${testName}" thành công!`, 'success');
    }
    navigate('/');
  };

  const scrollToSave = () => {
    saveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAddFromPicker = () => {
    const selectedIds = Object.entries(pickerSelections).filter(([, v]) => v).map(([id]) => id);
    if (selectedIds.length === 0) { showAlert('Chưa chọn câu hỏi', 'Vui lòng chọn ít nhất 1 câu hỏi.', 'warning'); return; }
    if (!pickerTest) return;
    const selectedQuestions = pickerTest.questions.filter(q => selectedIds.includes(q.id));
    setQuestions([...questions, ...selectedQuestions.map(q => ({ ...q, id: uid() }))]);
    setShowQuestionPicker(false);
    setPickerTestId(null);
    setPickerSelections({});
  };

  return (
    <div>
      {/* Collection */}
      <div className="mb-5">
        <label className="font-semibold text-sm block mb-1.5">Collection <span className="text-danger-600">*</span>:</label>
        <select ref={collectionRef} value={collectionId} onChange={handleCollectionChange}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-200 ${errors.collectionId ? 'border-danger-600' : 'border-slate-200'} bg-white dark:bg-slate-800 dark:text-slate-200`}>
          <option value="">-- Chọn collection --</option>
          {data.collections.map(c => (
            <option key={c.id} value={c.id}>{escHtml(c.name)}</option>
          ))}
          <option value="__new__">+ Tạo collection mới</option>
        </select>
        {showNewCollection && (
          <div className="mt-2 flex gap-2">
            <input type="text" value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} placeholder="Tên collection mới..." className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-500 outline-none" />
            <button onClick={handleCreateCollection} className="bg-success-600 text-white px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap">Tạo</button>
            <button onClick={() => { setShowNewCollection(false); setCollectionId(''); }} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-600">Hủy</button>
          </div>
        )}
      </div>

      {/* Import from other tests */}
      {collectionId && otherTests.length > 0 && (
        <div className="mb-5 p-3 bg-primary-50 dark:bg-primary-700/20 rounded-lg">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">Bạn có thể thêm câu hỏi từ bài khác trong cùng collection:</p>
          <button onClick={() => setShowQuestionPicker(!showQuestionPicker)} className="border border-primary-300 dark:border-primary-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-700/20 transition-all">
            {showQuestionPicker ? 'Ẩn' : 'Chọn câu hỏi từ bài khác'} ({otherTests.length} bài)
          </button>
        </div>
      )}

      {/* Question picker modal */}
      {showQuestionPicker && (
        <div className="mb-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            {otherTests.map(t => (
              <button key={t.id} onClick={() => { setPickerTestId(t.id); setPickerSelections({}); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pickerTestId === t.id ? 'bg-primary-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                {escHtml(t.name)} ({t.questions.length} câu)
              </button>
            ))}
          </div>

          {pickerTest && (
            <div className="max-h-64 overflow-y-auto">
              {pickerTest.questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <input type="checkbox" checked={!!pickerSelections[q.id]} onChange={e => setPickerSelections({ ...pickerSelections, [q.id]: e.target.checked })} className="w-4 h-4" />
                  <span className="flex-1 text-xs cursor-pointer hover:text-primary-600" onClick={() => setPreviewQuestion(previewQuestion?.id === q.id ? null : q)}>
                    Câu {i + 1}: <span dangerouslySetInnerHTML={{ __html: renderMd(q.prompt).substring(0, 80) || '' }} />{q.prompt.length > 80 ? '...' : ''}
                  </span>
                  <button onClick={() => setPreviewQuestion(previewQuestion?.id === q.id ? null : q)} className="text-[0.6rem] text-primary-600 underline whitespace-nowrap">
                    {previewQuestion?.id === q.id ? 'Ẩn' : 'Xem'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Question preview popup */}
          {previewQuestion && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <strong className="text-sm" dangerouslySetInnerHTML={{ __html: renderMd(previewQuestion.prompt) }} />
                <button onClick={() => setPreviewQuestion(null)} className="text-slate-400 text-lg">{'×'}</button>
              </div>
              {previewQuestion.options.map(opt => {
                const isCorrect = previewQuestion.correctIndices.includes(previewQuestion.options.indexOf(opt));
                return (
                  <div key={opt.label} className={`py-1 px-2 rounded text-xs flex items-center gap-2 ${isCorrect ? 'bg-success-100 dark:bg-success-700/20 text-success-700 dark:text-success-300 font-semibold' : ''}`}>
                    <span>{opt.label}.</span><span dangerouslySetInnerHTML={{ __html: renderMd(opt.text) }} />
                    {isCorrect && <span className="ml-auto">{'✓'}</span>}
                  </div>
                );
              })}
              {previewQuestion.explanation && (
                <p className="mt-2 text-xs text-slate-500"><strong>Giải thích:</strong> <span dangerouslySetInnerHTML={{ __html: renderMd(previewQuestion.explanation) }} /></p>
              )}
            </div>
          )}

          {pickerTest && (
            <button onClick={handleAddFromPicker} className="mt-3 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
              Thêm câu đã chọn vào bài
            </button>
          )}
        </div>
      )}

      {/* Test name */}
      <div className="mb-5">
        <label className="font-semibold text-sm block mb-1.5">Tên bài kiểm tra:</label>
        <input ref={testNameRef} type="text" value={testName} onChange={e => setTestName(e.target.value)}
          placeholder="VD: SWT Chương 1 - Tổng quan về kiểm thử"
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-200 ${(errors.testName || errors.duplicateName) ? 'border-danger-600' : 'border-slate-200'} bg-white dark:bg-slate-800 dark:text-slate-200`} />
        {errors.testName && <p className="text-xs text-danger-600 mt-1 error-msg">Vui lòng nhập tên bài kiểm tra.</p>}
        {errors.duplicateName && !errors.testName && <p className="text-xs text-danger-600 mt-1 error-msg">Tên bài kiểm tra đã tồn tại trong collection này.</p>}
      </div>

      {/* Bulk paste */}
      <div className="mb-5" ref={bulkSectionRef}>
        <label className="font-semibold text-sm block mb-1.5">Paste câu hỏi hàng loạt:</label>
        <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
          placeholder={`Paste câu hỏi vào đây...\n\nSWT là viết tắt của?\nA. Software Testing\nB. Software Technology\nC. System Web Testing\nD. Software Writing Tool\nĐáp án: A\nGiải thích: SWT = Software Testing\n\nKiểm thử hộp trắng là gì?\nA. Kiểm thử không cần code\nB. Kiểm thử dựa trên cấu trúc bên trong\nC. Kiểm thử giao diện\nD. Kiểm thử chức năng\nĐáp án: B\n\n(Hoặc dùng <1>, Câu 1:, 1. để đánh dấu đầu câu)`}
          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all min-h-[180px] resize-y" />
        <button onClick={handleParse} className="mt-3 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">Phân tích câu hỏi</button>
        {parseFeedback && <div className="mt-2" dangerouslySetInnerHTML={{ __html: parseFeedback }} />}
      </div>

      {/* Question editor */}
      <div className="mb-5" ref={questionsSectionRef}>
        <h3 className="text-base font-semibold mb-3">Câu hỏi đã phân tích (<span className="text-slate-500 dark:text-slate-400 font-normal">{questions.length}</span>)</h3>
        {errors.noQuestions && (
          <p className="text-sm text-danger-600 dark:text-danger-300 font-medium mb-3 bg-danger-50 dark:bg-danger-700/20 border border-danger-200 dark:border-danger-700/50 rounded-lg px-3 py-2 error-msg">Vui lòng thêm ít nhất 1 câu hỏi.</p>
        )}
        {questions.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-5">Chưa có câu hỏi nào. Paste câu hỏi và nhấn "Phân tích".</p>
        ) : (
          questions.map((q, i) => {
            const qe = errors.questions?.[i] || {};
            const hasErr = qe.prompt || qe.correct || qe.option;
            return (
            <div key={i} ref={el => questionRefs.current[i] = el}
              className={`bg-white dark:bg-slate-800 border rounded-xl p-4 mb-3 relative transition-all duration-200 ${hasErr ? 'border-danger-600' : 'border-slate-200'}`}>
              <button onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                className="absolute top-2 right-2 bg-transparent border-0 text-danger-600 cursor-pointer text-lg p-1 rounded hover:bg-danger-50 dark:hover:bg-danger-700/20" title="Xóa câu này">{'×'}</button>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="font-bold text-xs text-primary-600">Câu {i + 1}</span>
                {hasErr && <span className="text-[0.65rem] text-danger-600 dark:text-danger-300 font-medium bg-danger-50 dark:bg-danger-700/20 px-2 py-0.5 rounded-full error-msg">Thiếu thông tin</span>}
              </div>
              <input type="text" value={q.prompt} onChange={e => { const nq = [...questions]; nq[i] = { ...nq[i], prompt: e.target.value }; setQuestions(nq); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm font-medium mb-3 focus:border-primary-500 outline-none transition-all duration-200 ${qe.prompt ? 'border-danger-600' : 'border-slate-200'} bg-white dark:bg-slate-800 dark:text-slate-200`} placeholder="Nội dung câu hỏi" />
              {qe.prompt && <p className="text-xs text-danger-600 -mt-2 mb-2 error-msg">Vui lòng nhập nội dung câu hỏi.</p>}
              <div className="mb-2">
                {qe.correct && <p className="text-xs text-danger-600 mb-1.5 error-msg">Vui lòng chọn ít nhất 1 đáp án đúng.</p>}
                {q.options.map((opt, oi) => (
                  <div key={oi} className={`flex items-center gap-2.5 mb-1.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200`}>
                    <input type="checkbox" checked={q.correctIndices.includes(oi)}
                      onChange={e => {
                        const nq = [...questions];
                        if (e.target.checked) nq[i] = { ...nq[i], correctIndices: [...nq[i].correctIndices, oi] };
                        else nq[i] = { ...nq[i], correctIndices: nq[i].correctIndices.filter(ci => ci !== oi) };
                        setQuestions(nq);
                      }} className="w-4 h-4 cursor-pointer" title="Đánh dấu là đáp án đúng" />
                    <span className="font-bold text-xs text-slate-500 dark:text-slate-400 min-w-[24px]">{opt.label}.</span>
                    <input type="text" value={opt.text} onChange={e => { const nq = [...questions]; const no = [...nq[i].options]; no[oi] = { ...no[oi], text: e.target.value }; nq[i] = { ...nq[i], options: no }; setQuestions(nq); }}
                      className={`flex-1 px-2 py-1.5 border rounded text-xs focus:border-primary-500 outline-none transition-all duration-200 ${qe.option?.[oi] ? 'border-danger-600' : 'border-slate-200'} bg-white dark:bg-slate-800 dark:text-slate-200`} placeholder={`Nội dung đáp án ${opt.label}`} />
                    <button onClick={() => {
                      if (q.options.length <= 2) { showAlert('Chưa đủ đáp án', 'Mỗi câu hỏi cần ít nhất 2 đáp án.', 'warning'); return; }
                      const nq = [...questions];
                      nq[i] = { ...nq[i], options: nq[i].options.filter((_, idx) => idx !== oi), correctIndices: nq[i].correctIndices.filter(ci => ci !== oi).map(ci => ci > oi ? ci - 1 : ci) };
                      setQuestions(nq);
                    }} className="border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[0.6rem] text-slate-500">{'×'}</button>
                  </div>
                ))}
              </div>
              <button onClick={() => { const nq = [...questions]; const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; nq[i] = { ...nq[i], options: [...nq[i].options, { label: labels[nq[i].options.length] || '?', text: '' }] }; setQuestions(nq); }}
                className="border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded text-[0.7rem] font-semibold text-slate-600">+ Thêm đáp án</button>
              <input type="text" value={q.explanation || ''} onChange={e => { const nq = [...questions]; nq[i] = { ...nq[i], explanation: e.target.value }; setQuestions(nq); }}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-3 focus:border-primary-500 outline-none" placeholder="Giải thích (tùy chọn)" />
            </div>
            )
          })
        )}
      </div>

      <div className="mb-5">
        <button onClick={handleAddManual} className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">+ Thêm câu hỏi thủ công</button>
      </div>

      <div ref={saveRef} className="flex gap-2 mt-5">
        <button onClick={handleSave} className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg text-base font-semibold hover:bg-primary-700 active:scale-95 transition-all">Lưu bài</button>
        <button onClick={() => navigate('/')} className="border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Hủy</button>
      </div>

      {/* Floating scroll-to-save button */}
      {questions.length > 0 && (
        <button onClick={scrollToSave}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 active:scale-90 transition-all flex items-center justify-center text-xl"
          title="Xuống Lưu bài">
          ↓
        </button>
      )}
    </div>
  );
}
