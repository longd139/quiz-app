import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Trang chủ' },
  { path: '/editor', label: 'Soạn bài' },
  { path: '/practice-setup', label: 'Luyện tập' },
  { path: '/history', label: 'Lịch sử' },
  { path: '/data', label: 'Dữ liệu' }
];

export default function TabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="flex gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm dark:shadow-none mb-5">
      {tabs.map(t => (
        <button
          key={t.path}
          onClick={() => navigate(t.path)}
          className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
            location.pathname === t.path ? 'bg-primary-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
