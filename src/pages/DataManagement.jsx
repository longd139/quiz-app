import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { exportPersonalLearningData } from '../services/backupService';
import { IconDownload, IconShield } from '../components/Icons';

export default function DataManagement() {
  const { data, showToast } = useQuiz();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

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
