import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { exportPersonalLearningData } from '../services/backupService';
import { listMySourceRedemptions, getSourceDownloadUrl } from '../services/sourceService';
import { formatFileSize } from '../lib/sourceValidation';
import { fmtDate } from '../data/storage';
import { IconDownload, IconLink, IconShield } from '../components/Icons';

export default function DataManagement() {
  const { data, showToast } = useQuiz();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [redemptions, setRedemptions] = useState([]);
  const [loadingSrc, setLoadingSrc] = useState(true);
  const [srcError, setSrcError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadRedemptions = useCallback(async () => {
    setLoadingSrc(true);
    setSrcError('');
    try {
      const res = await listMySourceRedemptions();
      setRedemptions(res.redemptions || []);
    } catch (err) {
      setSrcError(err?.message || 'Không thể tải danh sách SRC đã nhận.');
    } finally {
      setLoadingSrc(false);
    }
  }, []);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  const handleReopenSource = async (r) => {
    if (busyId) return;
    setBusyId(r.id);
    try {
      const res = await getSourceDownloadUrl(r.id);
      if (res.deliveryType === 'LINK' && res.externalUrl) {
        window.open(res.externalUrl, '_blank', 'noopener,noreferrer');
      } else if (res.signedUrl) {
        const a = document.createElement('a');
        a.href = res.signedUrl;
        a.download = res.fileName || r.package?.file_name || 'source.zip';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      showToast(err?.message || 'Không thể mở lại tài nguyên SRC.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const handleDownloadPersonal = () => {
    const jsonText = exportPersonalLearningData(user, data);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-learning-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất dữ liệu học tập cá nhân!', 'success');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-bold mb-1">Dữ liệu học tập cá nhân</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Dữ liệu của bạn được lưu trữ tập trung và bảo mật trên PostgreSQL theo tài khoản cá nhân.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-slate-500">Lịch sử làm bài</p>
            <p className="text-lg font-bold mt-0.5">{(data.history || []).length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-slate-500">Từ vựng đã học</p>
            <p className="text-lg font-bold mt-0.5">{Object.keys(data.vocabStats || {}).length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-slate-500">Ngày hoạt động</p>
            <p className="text-lg font-bold mt-0.5">{Object.keys(data.activityLog || {}).length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-slate-500">Điểm Moosk</p>
            <p className="text-lg font-bold mt-0.5">{data.mooskCount || 0}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadPersonal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
        >
          <IconDownload className="w-4 h-4" />
          <span>Xuất dữ liệu cá nhân (.json)</span>
        </button>
      </div>

      {/* SRC đã nhận */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-bold mb-1">SRC đã nhận</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Danh sách các gói Source Code bạn đã xác nhận thành công.
        </p>

        {loadingSrc ? (
          <p className="py-4 text-xs text-slate-400">Đang tải lịch sử nhận SRC...</p>
        ) : srcError ? (
          <p className="py-4 text-xs text-rose-500">{srcError}</p>
        ) : redemptions.length === 0 ? (
          <p className="py-4 text-xs text-slate-400">Bạn chưa nhận gói Source Code nào.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            {redemptions.map((r) => {
              const pkg = r.package;
              const isActive = pkg?.status === 'ACTIVE';
              return (
                <div key={r.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{pkg?.name || 'Gói SRC'}</span>
                      {pkg?.version && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                          {pkg.version}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {isActive ? 'Khả dụng' : 'Đã khóa'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ngày nhận: {fmtDate(r.redeemed_at)}
                      {pkg?.delivery_type === 'FILE' && pkg?.file_size ? ` · ${formatFileSize(pkg.file_size)}` : ''}
                    </p>
                  </div>

                  {isActive && (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => handleReopenSource(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    >
                      {pkg?.delivery_type === 'FILE' ? <IconDownload className="w-3.5 h-3.5" /> : <IconLink className="w-3.5 h-3.5" />}
                      <span>{busyId === r.id ? 'Đang mở...' : pkg?.delivery_type === 'FILE' ? 'Tải lại' : 'Mở lại'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">Sao lưu &amp; Khôi phục toàn hệ thống</h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
              Chức năng sao lưu tập trung cho nội dung dùng chung nằm trong Khu vực Quản trị.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/backups')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
          >
            <IconShield className="w-4 h-4" />
            <span>Mở Quản lý Sao lưu</span>
          </button>
        </div>
      )}
    </div>
  );
}
