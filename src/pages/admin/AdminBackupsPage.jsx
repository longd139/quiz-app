import { useEffect, useState, useCallback } from 'react';
import { listBackups, createCentralBackup, restoreCentralBackup } from '../../services/backupService';
import { useAuth } from '../../contexts/AuthContext';
import { useQuiz } from '../../App';
import { fmtDate } from '../../data/storage';

export default function AdminBackupsPage() {
  const { user } = useAuth();
  const { refresh } = useQuiz();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBackups();
      setBackups(res.backups || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Lỗi tải danh sách sao lưu.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateBackup = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await createCentralBackup(user.id);
      setMessage({ type: 'success', text: 'Đã tạo bản sao lưu tập trung thành công.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Tạo sao lưu thất bại.' });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setBusy(true);
    setMessage(null);
    try {
      await restoreCentralBackup(restoreTarget.id, { mode: 'merge', dryRun: false });
      await refresh();
      setMessage({ type: 'success', text: 'Khôi phục dữ liệu thành công (đã tự động tạo bản sao lưu an toàn trước khi khôi phục).' });
      setRestoreTarget(null);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Khôi phục thất bại.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${
          message.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Sao lưu &amp; Khôi phục Tập trung</h2>
          <p className="text-xs text-slate-500">
            Lưu trữ metadata &amp; snapshot nội dung học tập chung trên PostgreSQL. Chỉ hỗ trợ khôi phục chế độ merge (bảo toàn dữ liệu học tập cá nhân) và tự động tạo bản pre-restore.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handleCreateBackup}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Đang xử lý...' : '+ Tạo bản sao lưu ngay'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Đang tải danh sách sao lưu...</p>
        ) : backups.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Chưa có bản sao lưu tập trung nào.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {backups.map((b) => (
              <div key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{b.notes || b.scope}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                      {b.app_version}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                      {b.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {fmtDate(b.created_at)} · Bộ đề: {b.entity_counts?.quizSets ?? 0} · Câu hỏi: {b.entity_counts?.questions ?? 0} · Bộ từ: {b.entity_counts?.vocabDecks ?? 0} · Thẻ: {b.entity_counts?.flashcards ?? 0}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRestoreTarget(b)}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold cursor-pointer"
                >
                  Khôi phục
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-bold mb-2">Xác nhận khôi phục dữ liệu</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">
              Hệ thống sẽ tự động tạo một bản sao lưu dự phòng hiện tại trước khi khôi phục nội dung từ bản sao lưu ngày {fmtDate(restoreTarget.created_at)}. Tiếp tục?
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setRestoreTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">Hủy</button>
              <button type="button" disabled={busy} onClick={handleConfirmRestore} className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold cursor-pointer disabled:opacity-50">
                {busy ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
