import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { exportPersonalLearningData } from '../services/backupService';
import { APP_VERSION } from '../version';
import {
  IconCross,
  IconSettings,
  IconSpeaker,
  IconSpeakerMute,
  IconDownload,
  IconLock,
  IconShield,
} from './Icons';

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'account',
  dark,
  toggleDark,
  ttsMuted,
  toggleTts,
  fontSizeState,
  onOpenChangelog,
}) {
  const navigate = useNavigate();
  const { data, update, syncStatus, showToast } = useQuiz();
  const { profile, user, isAdmin, needsPasswordChangeNotice, updateProfile, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [fullNameInput, setFullNameInput] = useState(profile?.full_name || '');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFullNameInput(profile?.full_name || '');
    }
  }, [isOpen, initialTab, profile?.full_name]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    min,
    max,
  } = fontSizeState;

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      showToast('Họ và tên không được để trống.', 'error');
      return;
    }
    setSavingName(true);
    try {
      await updateProfile({ full_name: fullNameInput.trim() });
      showToast('Đã cập nhật thông tin tài khoản.', 'success');
    } catch (err) {
      showToast(err.message || 'Cập nhật thất bại.', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleExportPersonal = () => {
    const jsonText = exportPersonalLearningData(user, data);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-learning-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất dữ liệu học tập cá nhân.', 'success');
  };

  const tabs = [
    { id: 'account', label: 'Tài khoản' },
    { id: 'appearance', label: 'Giao diện' },
    { id: 'learning', label: 'Học tập' },
    { id: 'system', label: 'Hệ thống' },
  ];

  const syncLabels = {
    synced: { text: 'Đã kết nối PostgreSQL', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
    syncing: { text: 'Đang đồng bộ...', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
    error: { text: 'Lỗi kết nối', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
    unauthenticated: { text: 'Chưa đăng nhập', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  };
  const syncBadge = syncLabels[syncStatus] || syncLabels.synced;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <IconSettings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cài đặt hệ thống</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Đóng"
          >
            <IconCross className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {activeTab === 'account' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveName} className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Họ và tên</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={savingName}
                      className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {savingName ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <div>
                  <p className="text-[11px] text-slate-500">Email</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Vai trò &amp; Trạng thái</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {profile?.role} · {profile?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Bị khóa'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { onClose(); navigate('/change-password'); }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-semibold cursor-pointer ${
                    needsPasswordChangeNotice
                      ? 'border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <IconLock className="w-3.5 h-3.5" />
                  <span>Đổi mật khẩu</span>
                  {needsPasswordChangeNotice && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate('/admin'); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 font-semibold cursor-pointer"
                  >
                    <IconShield className="w-3.5 h-3.5" />
                    <span>Khu vực Quản trị</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => { onClose(); await signOut(); navigate('/login', { replace: true }); }}
                  className="ml-auto px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <p className="font-semibold">Chế độ tối (Dark Mode)</p>
                  <p className="text-[11px] text-slate-500">Bảo vệ mắt khi học vào ban đêm</p>
                </div>
                <button
                  type="button"
                  onClick={toggleDark}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                    dark ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {dark ? 'Đang bật' : 'Đang tắt'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Cỡ chữ hiển thị</p>
                    <p className="text-[11px] text-slate-500">Hiện tại: {fontSize}%</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={fontSize <= min}
                      onClick={decreaseFontSize}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      onClick={resetFontSize}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      disabled={fontSize >= max}
                      onClick={increaseFontSize}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'learning' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  {ttsMuted ? <IconSpeakerMute className="w-4 h-4 text-slate-400" /> : <IconSpeaker className="w-4 h-4 text-indigo-600" />}
                  <div>
                    <p className="font-semibold">Tự động phát âm (Text-to-Speech)</p>
                    <p className="text-[11px] text-slate-500">Đọc từ vựng khi chuyển thẻ hoặc câu hỏi</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTts}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                    !ttsMuted ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {!ttsMuted ? 'Đang bật' : 'Đang tắt'}
                </button>
              </div>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold">Xáo trộn thứ tự câu hỏi mặc định</p>
                  <p className="text-[11px] text-slate-500">Áp dụng khi bắt đầu luyện tập Quiz</p>
                </div>
                <input
                  type="checkbox"
                  checked={data.settings?.shuffleQuestions ?? true}
                  onChange={(e) => update({ ...data, settings: { ...data.settings, shuffleQuestions: e.target.checked } })}
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold">Xáo trộn thứ tự đáp án mặc định</p>
                  <p className="text-[11px] text-slate-500">Trộn các lựa chọn A, B, C, D</p>
                </div>
                <input
                  type="checkbox"
                  checked={data.settings?.shuffleOptions ?? false}
                  onChange={(e) => update({ ...data, settings: { ...data.settings, shuffleOptions: e.target.checked } })}
                />
              </label>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phiên bản ứng dụng</span>
                  <button
                    type="button"
                    onClick={onOpenChangelog}
                    className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {APP_VERSION} (Xem Changelog)
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái kết nối</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold ${syncBadge.cls}`}>
                    {syncBadge.text}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Xuất dữ liệu học tập cá nhân</p>
                  <p className="text-[11px] text-slate-500">Chỉ xuất lịch sử thi, tiến độ từ vựng và streak của riêng bạn.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportPersonal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  <span>Xuất JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
