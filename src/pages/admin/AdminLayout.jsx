import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconShield, IconDatabase, IconBook, IconSettings, IconLock, IconDownload } from '../../components/Icons';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_NAV = [
  { to: '/admin', end: true, label: 'Tổng quan', icon: IconShield },
  { to: '/admin/users', label: 'Tài khoản', icon: IconLock },
  { to: '/admin/content', label: 'Nội dung chung', icon: IconBook },
  { to: '/admin/source-packages', label: 'Quản lý SRC', icon: IconDownload },
  { to: '/admin/audit-logs', label: 'Nhật ký Audit', icon: IconDatabase },
  { to: '/admin/backups', label: 'Sao lưu & Khôi phục', icon: IconDatabase },
  { to: '/admin/settings', label: 'Cài đặt hệ thống', icon: IconSettings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#0c0f17] text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <IconArrowLeft className="w-3.5 h-3.5" />
              <span>Về ứng dụng học tập</span>
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight">Khu vực Quản trị Hệ thống</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đăng nhập với quyền Quản trị viên: {profile?.full_name || profile?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Responsive Sidebar */}
          <aside className="lg:col-span-3">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="lg:col-span-9 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
