import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Trang chủ' },
  { path: '/editor', label: 'Soạn bài' },
  { path: '/practice-setup', label: 'Luyện tập' },
  { path: '/history', label: 'Lịch sử' },
  { path: '/data', label: 'Dữ liệu' }
];

export default function FooterNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex z-50 shadow-[0_-2px_10px_rgba(0,0,0,.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,.3)] pb-safe">
      {tabs.map(t => {
        const active = location.pathname === t.path;
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`flex-1 py-2.5 pb-3.5 border-0 bg-transparent text-[0.65rem] sm:text-xs cursor-pointer flex flex-col items-center gap-1 transition-colors ${active ? 'text-primary-600' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
