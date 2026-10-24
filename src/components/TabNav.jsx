import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';

const quizTabs = [
  { path: '/', label: 'Trang chủ' },
  { path: '/editor', label: 'Soạn bài' },
  { path: '/practice-setup', label: 'Luyện tập' },
  { path: '/history', label: 'Lịch sử' }
];

const languageTabs = [
  { path: '/vocab', label: 'Bộ từ vựng' },
  { path: '/vocab-editor', label: 'Soạn từ' },
  { path: '/vocab-learn', label: 'Flashcard' },
  { path: '/vocab-quiz', label: 'Trắc nghiệm' }
];

export default function TabNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appMode } = useQuiz();

  // Bỏ thanh card chọn nhanh (Bộ từ vựng, Soạn từ, ...) khi ở chế độ Học Ngôn Ngữ
  if (appMode === 'language' || location.pathname.startsWith('/vocab')) {
    return null;
  }

  const tabs = quizTabs;

  return (
    <nav className="flex gap-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs rounded-xl p-1 border border-slate-200/80 dark:border-slate-800 mb-6 overflow-x-auto">
      {tabs.map(t => {
        const isActive = location.pathname === t.path ||
          (t.path === '/vocab-editor' && location.pathname.startsWith('/vocab-editor')) ||
          (t.path === '/editor' && location.pathname.startsWith('/editor'));

        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`flex-1 min-w-[65px] py-2 px-2.5 text-xs font-medium rounded-lg transition-all tracking-tight whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
