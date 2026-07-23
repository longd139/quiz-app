import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';

export default function Header() {
  const { syncStatus, conflictRef, resolveConflict } = useQuiz();
  const navigate = useNavigate();

  const colors = { synced: 'bg-success-600', syncing: 'bg-warning-600 sync-pulse', error: 'bg-danger-600', unconfigured: 'bg-slate-300', conflict: 'bg-warning-600' };
  const titles = { synced: 'Đã đồng bộ', syncing: 'Đang đồng bộ...', error: 'Lỗi đồng bộ', unconfigured: 'Chưa cấu hình đồng bộ', conflict: 'Xung đột - Nhấn để giải quyết' };

  const handleDotClick = () => {
    if (syncStatus === 'conflict' && conflictRef.current) {
      const c = conflictRef.current;
      if (confirm(`⚠️ Dữ liệu trên cloud và local khác nhau.\n\nCloud: ${c.cloudData.tests.length} bài test, ${c.cloudData.history.length} lần làm\nLocal: ${c.localData.tests.length} bài test, ${c.localData.history.length} lần làm\n\nNhấn OK để GIỮ BẢN CLOUD.\nNhấn Cancel để GIỮ BẢN LOCAL.`)) {
        resolveConflict(true);
      } else {
        resolveConflict(false);
      }
    } else {
      navigate('/data');
    }
  };

  return (
    <header className="text-center py-5 sticky top-0 z-10 bg-slate-100 border-b border-slate-200 mb-5">
      <h1 className="text-xl font-bold text-primary-600">
        Quiz Luyện Tập
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ml-2 cursor-pointer align-middle ${colors[syncStatus] || 'bg-slate-300'}`}
          title={titles[syncStatus] || ''}
          onClick={handleDotClick}
        />
      </h1>
      <p className="text-xs text-slate-500 mt-0.5">Paste câu hỏi &mdash; Luyện tập &mdash; Nhớ ngay</p>
    </header>
  );
}
