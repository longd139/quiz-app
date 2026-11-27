import { useEffect, useState, useCallback } from 'react';
import { fetchAuditLogs } from '../../services/auditService';
import { fmtDate } from '../../data/storage';
import { IconSearch, IconDownload } from '../../components/Icons';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({ action: actionFilter, search, page, pageSize });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm action, entity..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
          >
            <option value="ALL">Tất cả sự kiện</option>
            <option value="ADMIN_USER">Quản lý tài khoản</option>
            <option value="ADMIN_QUIZ">Nội dung Quiz</option>
            <option value="ADMIN_VOCAB">Nội dung Từ vựng</option>
            <option value="ADMIN_BACKUP">Sao lưu &amp; Khôi phục</option>
            <option value="CLOUDINARY">Tải ảnh Cloudinary</option>
            <option value="USER_PASSWORD">Đổi mật khẩu</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
        >
          <IconDownload className="w-3.5 h-3.5" />
          <span>Xuất JSON</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Thời gian</th>
                <th className="py-3 px-4 font-semibold">Người thực hiện</th>
                <th className="py-3 px-4 font-semibold">Hành động</th>
                <th className="py-3 px-4 font-semibold">Đối tượng</th>
                <th className="py-3 px-4 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Đang tải nhật ký...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Chưa có bản ghi nhật ký nào.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{fmtDate(log.created_at)}</td>
                    <td className="py-2.5 px-4">{log.actor?.email || 'Hệ thống'}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{log.entity_type}</td>
                    <td className="py-2.5 px-4 max-w-xs truncate font-mono text-[11px] text-slate-500">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Tổng {total} sự kiện · Trang {page}/{totalPages}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">Trước</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
