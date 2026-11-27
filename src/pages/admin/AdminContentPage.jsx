import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../../App';

export default function AdminContentPage() {
  const { data } = useQuiz();
  const navigate = useNavigate();

  const tests = data.tests || [];
  const decks = data.vocabDecks || [];

  return (
    <div className="space-y-6">
      {/* Shared Quiz Sets */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold">Bộ đề Quiz dùng chung ({tests.length})</h2>
            <p className="text-xs text-slate-500">Chỉ Quản trị viên có quyền thêm, sửa, xóa nội dung học tập chung.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/editor')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
          >
            + Soạn bộ đề mới
          </button>
        </div>

        {tests.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Chưa có bộ đề Quiz nào trong hệ thống.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tests.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-[11px] text-slate-500">{t.questions?.length || 0} câu hỏi</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/editor/${t.id}`)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Chỉnh sửa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Vocab Decks */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold">Bộ từ vựng &amp; Flashcard dùng chung ({decks.length})</h2>
            <p className="text-xs text-slate-500">Mọi người dùng đang hoạt động đều có thể học các bộ từ này.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/vocab-editor')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
          >
            + Tạo bộ từ mới
          </button>
        </div>

        {decks.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Chưa có bộ từ vựng nào trong hệ thống.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {decks.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-[11px] text-slate-500">{d.cards?.length || 0} thẻ từ vựng</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/vocab-editor/${d.id}`)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Chỉnh sửa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
