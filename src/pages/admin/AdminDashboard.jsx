import { useEffect, useState } from 'react';
import { fetchAdminDashboardStats } from '../../services/userService';
import { fmtDate } from '../../data/storage';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchAdminDashboardStats();
        if (active) setStats(res);
      } catch (err) {
        if (active) setError(err.message || 'Không thể tải thống kê hệ thống.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
        {error}
      </div>
    );
  }

  const cards = [
    { label: 'Tổng số tài khoản', value: stats.totalUsers, tone: 'text-slate-900 dark:text-slate-100' },
    { label: 'Đang hoạt động', value: stats.activeUsers, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Tài khoản bị khóa', value: stats.disabledUsers, tone: 'text-rose-600 dark:text-rose-400' },
    { label: 'Tổng số phiên học', value: stats.totalLearningSessions, tone: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Tổng số bộ đề Quiz', value: stats.totalQuizSets, tone: 'text-slate-900 dark:text-slate-100' },
    { label: 'Tổng số câu hỏi', value: stats.totalQuestions, tone: 'text-slate-900 dark:text-slate-100' },
    { label: 'Tổng số bộ từ vựng', value: stats.totalVocabDecks, tone: 'text-slate-900 dark:text-slate-100' },
    { label: 'Tổng số Flashcard', value: stats.totalFlashcards, tone: 'text-slate-900 dark:text-slate-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4"
          >
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* System Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-3">Trạng thái hệ thống</h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Cơ sở dữ liệu</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                PostgreSQL Tập trung
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Xác thực</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                Supabase Auth (Private)
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">Chế độ phòng cũ</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                Đã gỡ bỏ
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-3">Hoạt động gần đây</h2>
          {stats.recentActivities.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Chưa có hoạt động nào được ghi nhận.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{act.action}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {act.actor?.email || 'Hệ thống'} · {act.entity_type}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(act.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
