import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { getRoomConfig, isConfigured, hasSupabase } from '../data/supabaseSync';
import {
  checkAndCreateDailyBackup,
  loadLocalBackups,
  saveLocalBackups,
  getTodayDateString,
  restoreFromBackup
} from '../data/backupManager';
import {
  loadAuditLogs,
  recordAuditLog,
  clearAuditLogs,
  exportAuditLogs,
  AUDIT_TYPES,
  AUDIT_CATEGORIES
} from '../data/auditTrail';
import {
  IconSettings,
  IconSpeaker,
  IconSpeakerMute,
  IconCross,
  IconRotate,
  IconDatabase,
  IconCloud,
  IconDownload,
  IconUpload,
  IconCheck,
  IconLock,
  IconShield,
  IconEye,
  IconEyeOff,
  IconSearch,
  IconTrash
} from './Icons';

export default function SettingsModal({
  isOpen,
  onClose,
  dark,
  toggleDark,
  ttsMuted,
  toggleTts,
  fontSizeState,
}) {
  const navigate = useNavigate();
  const {
    data,
    update,
    syncStatus,
    doPush,
    doPull,
    doCreateRoom,
    doJoinRoom,
    doDisconnectSync,
    showConfirm,
    showAlert,
    showToast
  } = useQuiz();

  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'data' | 'audit'

  // Cloud sync state inside modal
  const [roomSecretInput, setRoomSecretInput] = useState('');
  const [newRoomSecret, setNewRoomSecret] = useState('');
  const [showRoomConfig, setShowRoomConfig] = useState(!isConfigured());
  const fileInputRef = useRef(null);

  // Audit authentication & state
  const AUDIT_PASSWORD = import.meta.env.VITE_AUDIT_PASSWORD || import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
  const [isAuditUnlocked, setIsAuditUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('audit_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [auditPassInput, setAuditPassInput] = useState('');
  const [showAuditPassword, setShowAuditPassword] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditFilter, setAuditFilter] = useState('all'); // 'all' | 'vocab' | 'sync' | 'test' | 'backup'
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState(() => loadAuditLogs());

  // Listen for audit updates across the app
  useEffect(() => {
    const handleAuditUpdate = () => {
      setAuditLogs(loadAuditLogs());
    };
    window.addEventListener('quiz_audit_updated', handleAuditUpdate);
    return () => window.removeEventListener('quiz_audit_updated', handleAuditUpdate);
  }, []);

  const cfg = getRoomConfig();
  const configured = isConfigured();

  const {
    fontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    presets,
    min,
    max,
  } = fontSizeState;

  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Counts summary
  const testCount = Array.isArray(data?.tests) ? data.tests.length : 0;
  const questionCount = Array.isArray(data?.tests)
    ? data.tests.reduce((acc, t) => acc + (t.questions?.length || 0), 0)
    : 0;
  const deckCount = Array.isArray(data?.vocabDecks) ? data.vocabDecks.length : 0;
  const cardCount = Array.isArray(data?.vocabDecks)
    ? data.vocabDecks.reduce((acc, d) => acc + (d.cards?.length || 0), 0)
    : 0;
  const historyList = Array.isArray(data?.history) ? data.history : [];
  const activityLog = data?.activityLog || {};

  // Storage calculation
  const rawStorage = localStorage.getItem('quiz_data') || '';
  const storageBytes = new Blob([rawStorage]).size;
  const storageKb = (storageBytes / 1024).toFixed(1);
  const storagePercent = Math.min(100, Math.max(1, ((storageBytes / (5 * 1024 * 1024)) * 100).toFixed(1)));

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✅ Đã sao chép ${label}!`, 'success');
    } catch {
      showToast(`Không thể sao chép ${label}`, 'error');
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    recordAuditLog({
      type: AUDIT_TYPES.DATA_EXPORT,
      category: AUDIT_CATEGORIES.BACKUP,
      title: 'Xuất file sao lưu toàn bộ (.json)',
      detail: { testsCount: testCount, decksCount: deckCount }
    });
    showToast('✅ Đã tải file sao lưu về máy!', 'success');
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.tests && !imported.vocabDecks) {
          showAlert('Lỗi nhập dữ liệu', 'File JSON không đúng định dạng của Quiz App.', 'error');
          return;
        }
        const tCount = imported.tests ? imported.tests.length : 0;
        const dCount = imported.vocabDecks ? imported.vocabDecks.length : 0;
        showConfirm(
          `⚠️ Dữ liệu hiện tại sẽ được GHI ĐÈ bởi dữ liệu từ file (${tCount} bài test, ${dCount} bộ từ vựng). Tiếp tục?`,
          () => {
            update({
              collections: imported.collections || [],
              tests: imported.tests || [],
              history: imported.history || [],
              settings: imported.settings || { shuffleQuestions: true, shuffleOptions: false, practiceMode: 'submit' },
              questionStats: imported.questionStats || {},
              vocabCollections: imported.vocabCollections || data.vocabCollections || [],
              vocabDecks: imported.vocabDecks || data.vocabDecks || [],
              vocabStats: imported.vocabStats || data.vocabStats || {},
              activityLog: imported.activityLog || data.activityLog || {}
            });
            recordAuditLog({
              type: AUDIT_TYPES.DATA_IMPORT,
              category: AUDIT_CATEGORIES.BACKUP,
              title: `Nhập dữ liệu từ file JSON (${tCount} bài test, ${dCount} bộ từ)`,
              detail: { fileName: file.name, testCount: tCount, deckCount: dCount }
            });
            showToast('✅ Đã nhập dữ liệu thành công!', 'success');
          }
        );
      } catch (err) {
        showAlert('Lỗi đọc file JSON', err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateRoom = async () => {
    try {
      const result = await doCreateRoom();
      setNewRoomSecret(result.secret);
      setShowRoomConfig(false);
      showToast('✅ Đã tạo phòng mới thành công!', 'success');
    } catch (e) {
      showAlert('Lỗi tạo phòng', e.message, 'error');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomSecretInput.trim()) {
      showToast('Vui lòng nhập mã phòng.', 'error');
      return;
    }
    try {
      await doJoinRoom(roomSecretInput.trim());
      setShowRoomConfig(false);
      setRoomSecretInput('');
      showToast('✅ Đã kết nối phòng thành công!', 'success');
    } catch (e) {
      showAlert('Lỗi kết nối', e.message, 'error');
    }
  };

  const handlePushCloud = async () => {
    try {
      await doPush();
      showToast('✅ Đã đẩy dữ liệu lên Cloud!', 'success');
    } catch (e) {
      showAlert('Lỗi đồng bộ', e.message, 'error');
    }
  };

  const handlePullCloud = async () => {
    try {
      await doPull();
      showToast('✅ Đã cập nhật dữ liệu từ Cloud về máy!', 'success');
    } catch (e) {
      showAlert('Lỗi đồng bộ', e.message, 'error');
    }
  };

  const handleDisconnect = () => {
    showConfirm('⚠️ Ngắt kết nối phòng? Dữ liệu trên máy này vẫn được giữ nguyên.', () => {
      doDisconnectSync();
      setShowRoomConfig(true);
      setRoomSecretInput('');
      showToast('Đã ngắt kết nối Cloud', 'info');
    });
  };

  // Daily backup
  const todayDate = getTodayDateString();
  const backupsList = (data.dailyBackups && data.dailyBackups.length > 0)
    ? data.dailyBackups
    : loadLocalBackups();
  const latestBackup = backupsList.length > 0 ? backupsList[0] : null;

  const handleCreateBackupNow = () => {
    const nextBackups = checkAndCreateDailyBackup(data);
    saveLocalBackups(nextBackups);
    update({ ...data, dailyBackups: nextBackups });
    recordAuditLog({
      type: AUDIT_TYPES.BACKUP_CREATE,
      category: AUDIT_CATEGORIES.BACKUP,
      title: `Tạo bản sao lưu cục bộ ngày ${todayDate}`,
      detail: { date: todayDate, testCount, deckCount }
    });
    showToast('✅ Đã tạo bản sao lưu hôm nay thành công!', 'success');
  };

  const handleRestoreBackup = (backup) => {
    showConfirm(
      `⚠️ Khôi phục dữ liệu từ bản sao lưu ngày ${backup.date}? Trạng thái bài test và từ vựng sẽ quay về ngày này. Tiếp tục?`,
      () => {
        try {
          restoreFromBackup(backup, data, update);
          recordAuditLog({
            type: AUDIT_TYPES.BACKUP_RESTORE,
            category: AUDIT_CATEGORIES.BACKUP,
            title: `Khôi phục dữ liệu từ bản sao lưu ngày ${backup.date}`,
            detail: { date: backup.date }
          });
          showToast(`✅ Đã khôi phục thành công từ bản sao lưu ngày ${backup.date}!`, 'success');
        } catch (err) {
          showAlert('Lỗi khôi phục', err.message, 'error');
        }
      }
    );
  };

  // Audit Password Unlock Handler
  const handleUnlockAudit = (e) => {
    e.preventDefault();
    if (!auditPassInput) {
      setAuditError('Vui lòng nhập mật khẩu.');
      return;
    }
    if (auditPassInput === AUDIT_PASSWORD) {
      setIsAuditUnlocked(true);
      setAuditError('');
      setAuditPassInput('');
      try {
        sessionStorage.setItem('audit_unlocked', 'true');
      } catch {}
      showToast('✅ Đã mở khóa Nhật ký kiểm toán!', 'success');
    } else {
      setAuditError('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }
  };

  const handleLockAudit = () => {
    setIsAuditUnlocked(false);
    try {
      sessionStorage.removeItem('audit_unlocked');
    } catch {}
    showToast('🔒 Đã khóa lại Nhật ký kiểm toán.', 'info');
  };

  const handleClearAuditTrail = () => {
    showConfirm('⚠️ Xóa toàn bộ lịch sử thao tác Audit Trail? Thao tác này không thể hoàn tác.', () => {
      clearAuditLogs();
      setAuditLogs([]);
      showToast('Đã xóa sạch lịch sử Audit Trail', 'info');
    });
  };

  const handleExportAuditReport = () => {
    const reportJson = exportAuditLogs();
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Đã xuất báo cáo Audit Trail (.json)!', 'success');
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    let list = auditLogs;
    if (auditFilter !== 'all') {
      list = list.filter(l => l.category === auditFilter);
    }
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      list = list.filter(l => {
        const titleMatch = l.title && l.title.toLowerCase().includes(q);
        const detailStr = JSON.stringify(l.detail || {}).toLowerCase();
        return titleMatch || detailStr.includes(q);
      });
    }
    return list;
  }, [auditLogs, auditFilter, auditSearch]);

  const statusLabels = {
    synced: 'Đã đồng bộ Cloud ✓',
    syncing: 'Đang đồng bộ...',
    error: 'Lỗi đồng bộ Cloud',
    unconfigured: 'Chưa kết nối Cloud'
  };

  const statusColors = {
    synced: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    syncing: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    error: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    unconfigured: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop trong suốt, không làm tối màn hình */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover / Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Cài đặt hệ thống"
        className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-full mt-2 z-50 w-[calc(100vw-1.5rem)] sm:w-[480px] max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-800 dark:text-slate-100 page-enter select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <IconSettings className="w-4 h-4 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Cài đặt & Quản lý
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Giao diện, âm thanh, dữ liệu & kiểm toán thao tác
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng cài đặt"
          >
            <IconCross className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Hệ thống | Dữ liệu | Audit */}
        <div className="flex p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-xl mb-3.5 border border-slate-200/80 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <IconSettings className="w-3.5 h-3.5" />
            <span>Hệ thống</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer relative ${
              activeTab === 'data'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <IconDatabase className="w-3.5 h-3.5" />
            <span>Dữ liệu</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-emerald-500'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-500 animate-pulse'
                  : syncStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer relative ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-2xs border border-purple-200/60 dark:border-purple-800/60 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300'
            }`}
          >
            {isAuditUnlocked ? (
              <IconShield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            ) : (
              <IconLock className="w-3.5 h-3.5" />
            )}
            <span>Audit</span>
            {auditLogs.length > 0 && (
              <span className="text-[9px] px-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-3.5">
          {/* ======================================================== */}
          {/* TAB 1: HỆ THỐNG */}
          {/* ======================================================== */}
          {activeTab === 'system' && (
            <>
              {/* Section 1: Giao diện (Theme Dark / Light) */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{dark ? '☾' : '☼'}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Giao diện
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {dark ? 'Chế độ tối (Dark mode)' : 'Chế độ sáng (Light mode)'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { if (dark) toggleDark(); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      !dark
                        ? 'border-amber-400 bg-white text-amber-900 shadow-xs ring-2 ring-amber-400/20'
                        : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>☼</span>
                    <span>Sáng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { if (!dark) toggleDark(); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      dark
                        ? 'border-indigo-500 bg-slate-800 text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>☾</span>
                    <span>Tối</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Âm thanh giọng đọc */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                      {ttsMuted ? (
                        <IconSpeakerMute className="w-4 h-4 text-slate-400" />
                      ) : (
                        <IconSpeaker className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Âm thanh giọng đọc
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ttsMuted ? 'Đang tắt tự đọc khi chuyển câu' : 'Tự đọc khi chuyển câu hỏi'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={!ttsMuted}
                    onClick={toggleTts}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                      !ttsMuted ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        !ttsMuted ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Section 3: Cỡ chữ hệ thống */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-100 dark:border-emerald-900/40">
                      Aa
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Cỡ chữ hệ thống
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Toàn bộ app sẽ co giãn theo tỷ lệ
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                      {fontSize}%
                    </span>
                    {fontSize !== 100 && (
                      <button
                        type="button"
                        onClick={resetFontSize}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Đặt lại mặc định (100%)"
                      >
                        <IconRotate className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Presets */}
                <div className="grid grid-cols-4 gap-1 mb-2.5">
                  {presets.map((preset) => {
                    const isActive = fontSize === preset.percent;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFontSize(preset.percent)}
                        className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs'
                        }`}
                      >
                        <div className="text-[11px] leading-tight">{preset.label}</div>
                        <div className={`text-[9px] font-mono ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {preset.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Slider */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={decreaseFontSize}
                    disabled={fontSize <= min}
                    className="w-8 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Giảm kích thước (A-)"
                  >
                    A-
                  </button>

                  <input
                    type="range"
                    min={min}
                    max={max}
                    step="5"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />

                  <button
                    type="button"
                    onClick={increaseFontSize}
                    disabled={fontSize >= max}
                    className="w-8 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Tăng kích thước (A+)"
                  >
                    A+
                  </button>
                </div>

                {/* Preview */}
                <div className="mt-2.5 p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-center">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
                    Xem trước văn bản hiển thị:
                  </p>
                  <p className="text-xs font-medium">
                    Câu hỏi: Thủ đô của Việt Nam là Hà Nội.
                  </p>
                </div>
              </div>

              {/* Quick tip switch to data tab */}
              <div
                onClick={() => setActiveTab('data')}
                className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between cursor-pointer hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
                    Đồng bộ sang điện thoại & Sao lưu dữ liệu
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">→</span>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DỮ LIỆU & ĐỒNG BỘ */}
          {/* ======================================================== */}
          {activeTab === 'data' && (
            <>
              {/* Data Summary Chips */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">📚 Câu hỏi trắc nghiệm</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {testCount} <span className="text-xs font-normal text-slate-500">bài ({questionCount} câu)</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">🗂️ Bộ từ vựng</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {deckCount} <span className="text-xs font-normal text-slate-500">bộ ({cardCount} từ)</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Storage Mode (LocalStorage vs Cloud) */}
              <div className={`p-3 rounded-xl ${hasSupabase ? 'bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60' : 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40'} space-y-2.5`}>
                {!hasSupabase ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <IconDatabase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Lưu trữ dữ liệu (LocalStorage)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Đang lưu ở LocalStorage
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Ứng dụng đang chạy hoàn toàn ở chế độ nội bộ. Toàn bộ câu hỏi, từ vựng và lịch sử học tập được lưu an toàn trong trình duyệt của bạn (LocalStorage), không gửi lên cơ sở dữ liệu Cloud.
                    </p>

                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                      <span className="text-xs mt-0.5">💡</span>
                      <div className="leading-tight">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Tính năng Cloud đang ẩn:</span> Khi mở comment cấu hình Supabase trong file <code className="text-slate-800 dark:text-slate-200 font-mono text-[10px] px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">.env.local</code>, hệ thống sẽ hiện lại thông tin mã phòng và kết nối Cloud.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <IconCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Đồng bộ Cloud (Supabase)
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusColors[syncStatus] || statusColors.unconfigured}`}>
                        {statusLabels[syncStatus] || statusLabels.synced}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                      Đồng bộ tức thì giữa Laptop và Điện thoại. Dùng chung một mã phòng để xem chung dữ liệu.
                    </p>

                    {configured && !showRoomConfig ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 mt-2">
                        {cfg?.secret && (
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 font-mono">Mã phòng:</span>
                            <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 flex-1 truncate select-all">
                              {cfg.secret}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopy(cfg.secret, 'mã phòng')}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={handlePushCloud}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                            title="Đẩy toàn bộ dữ liệu máy này lên Cloud"
                          >
                            <IconUpload className="w-3.5 h-3.5" />
                            <span>Đẩy lên Cloud</span>
                          </button>

                          <button
                            type="button"
                            onClick={handlePullCloud}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            title="Tải dữ liệu mới nhất từ Cloud về máy này"
                          >
                            <IconDownload className="w-3.5 h-3.5" />
                            <span>Kéo từ Cloud</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <button
                            type="button"
                            onClick={() => setShowRoomConfig(true)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                          >
                            Đổi mã phòng khác
                          </button>
                          <button
                            type="button"
                            onClick={handleDisconnect}
                            className="text-rose-500 hover:underline cursor-pointer font-medium"
                          >
                            Ngắt kết nối
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 mt-2">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={roomSecretInput}
                            onChange={(e) => setRoomSecretInput(e.target.value)}
                            placeholder="Dán mã phòng từ thiết bị kia..."
                            className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={handleJoinRoom}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            Kết nối
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleCreateRoom}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            + Tạo mã phòng mới
                          </button>
                          {configured && (
                            <button
                              type="button"
                              onClick={() => setShowRoomConfig(false)}
                              className="text-xs text-slate-500 hover:underline cursor-pointer"
                            >
                              Hủy
                            </button>
                          )}
                        </div>

                        {newRoomSecret && (
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1">
                            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                              ✅ Đã tạo phòng mới. Copy mã này dán vào điện thoại:
                            </div>
                            <div className="flex items-center gap-1.5">
                              <code className="flex-1 text-[11px] font-mono p-1 bg-white dark:bg-slate-900 rounded border border-emerald-300 dark:border-emerald-700 truncate select-all">
                                {newRoomSecret}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopy(newRoomSecret, 'mã phòng')}
                                className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded cursor-pointer active:scale-95"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Sao lưu & Nhập file JSON */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <IconDownload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Sao lưu / Xuất & Nhập file JSON</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tải file sao lưu về máy để gửi qua Zalo/Drive hoặc nạp dữ liệu cũ vào app:
                </p>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileImport}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    <IconDownload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Xuất file (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    <IconUpload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Nhập file (.json)</span>
                  </button>
                </div>
              </div>

              {/* Section 3: Bản sao lưu hàng ngày (Daily Backup) */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <IconRotate className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Sao lưu tự động hàng ngày</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Lưu 2 ngày
                  </span>
                </div>

                {latestBackup ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {latestBackup.date} {latestBackup.date === todayDate && '(Hôm nay)'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {latestBackup.summary?.testCount || 0} bài test • {latestBackup.summary?.deckCount || 0} bộ từ
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreBackup(latestBackup)}
                      className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Khôi phục
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Chưa có bản sao lưu nào được lưu.</p>
                )}

                <button
                  type="button"
                  onClick={handleCreateBackupNow}
                  className="w-full py-1.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  + Tạo bản sao lưu cho ngày hôm nay
                </button>
              </div>

              {/* Link to full DataManagement page */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/data');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Mở trang Quản lý dữ liệu chi tiết</span>
                <span className="text-[10px]">↗</span>
              </button>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 3: AUDIT TRAIL & SYSTEM LOGS */}
          {/* ======================================================== */}
          {activeTab === 'audit' && (
            <>
              {!isAuditUnlocked ? (
                /* Password Gate Form */
                <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-3.5 my-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shadow-xs">
                    <IconLock className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Bảo vệ Nhật ký kiểm toán (Audit Trail)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Lưu vết chi tiết từng từ vựng tạo ra, chỉnh sửa, xóa và mọi request gửi đi. Vui lòng nhập mật khẩu quản trị:
                    </p>
                  </div>

                  <form onSubmit={handleUnlockAudit} className="space-y-2.5 max-w-xs mx-auto text-left">
                    <div className="relative">
                      <input
                        type={showAuditPassword ? 'text' : 'password'}
                        value={auditPassInput}
                        onChange={(e) => {
                          setAuditPassInput(e.target.value);
                          if (auditError) setAuditError('');
                        }}
                        placeholder="Nhập mật khẩu Audit..."
                        autoFocus
                        className={`w-full pl-3 pr-9 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg outline-none transition-colors ${
                          auditError
                            ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-400/20'
                            : 'border-slate-200 dark:border-slate-700 focus:border-purple-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuditPassword(!showAuditPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showAuditPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showAuditPassword ? <IconEyeOff className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {auditError && (
                      <p className="text-[11px] text-rose-500 font-medium">{auditError}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <IconShield className="w-3.5 h-3.5" />
                      <span>Mở khóa Nhật ký chi tiết</span>
                    </button>
                  </form>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-400 dark:text-slate-500">
                    💡 Mật khẩu cấu hình qua biến <code className="font-mono text-purple-600 dark:text-purple-400 font-bold">VITE_AUDIT_PASSWORD</code> trên Vercel.
                  </div>
                </div>
              ) : (
                /* Unlocked Audit Dashboard */
                <div className="space-y-3.5">
                  {/* Top Action Bar */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60">
                    <div className="flex items-center gap-2">
                      <IconShield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <div>
                        <div className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          Nhật ký thao tác & Request (Audit Trail)
                        </div>
                        <div className="text-[10px] text-purple-700/80 dark:text-purple-300/80">
                          Ghi nhận chi tiết từng từ vựng & request đồng bộ
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleExportAuditReport}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
                        title="Tải toàn bộ file log sự kiện (.json)"
                      >
                        <IconDownload className="w-3 h-3" />
                        <span>Xuất Log</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAuditTrail}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Xóa lịch sử log"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleLockAudit}
                        className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Khóa lại"
                      >
                        <IconLock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* System & Storage Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                      <div className="text-[10px] text-slate-400">Dung lượng Local</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {storageKb} KB
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${storagePercent}%` }} />
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                      <div className="text-[10px] text-slate-400">Sự kiện đã ghi</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {auditLogs.length} sự kiện
                      </div>
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                        Lưu chi tiết từng từ
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                      <div className="text-[10px] text-slate-400">{hasSupabase ? 'Đồng bộ Cloud' : 'Chế độ lưu trữ'}</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 truncate">
                        {hasSupabase ? (cfg?.secret ? cfg.secret : 'Chưa kết nối') : 'LocalStorage'}
                      </div>
                      <div className={`text-[9px] ${hasSupabase ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'} mt-1 font-medium`}>
                        {hasSupabase ? (statusLabels[syncStatus] || 'Sẵn sàng') : 'Nội bộ máy'}
                      </div>
                    </div>
                  </div>

                  {/* Search bar inside Audit Trail */}
                  <div className="relative">
                    <IconSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Tìm từ vựng, hành động, ngày giờ..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Filter Chips */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {[
                      { id: 'all', label: 'Tất cả log' },
                      { id: AUDIT_CATEGORIES.VOCAB, label: 'Từ vựng đã tạo' },
                      { id: AUDIT_CATEGORIES.SYNC, label: 'Cloud Request' },
                      { id: AUDIT_CATEGORIES.TEST, label: 'Bài test' },
                      { id: AUDIT_CATEGORIES.BACKUP, label: 'Sao lưu & Tệp' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAuditFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          auditFilter === f.id
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* AUDIT EVENTS LIST */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredAuditLogs.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {auditSearch ? 'Không tìm thấy sự kiện nào khớp.' : 'Chưa có sự kiện nào. Mọi thao tác tạo từ vựng, bài test và request Cloud sẽ tự động xuất hiện tại đây.'}
                        </p>
                      </div>
                    ) : (
                      filteredAuditLogs.map((log) => {
                        const isVocab = log.category === AUDIT_CATEGORIES.VOCAB;
                        const isSync = log.category === AUDIT_CATEGORIES.SYNC;
                        const isError = log.status === 'error';

                        return (
                          <div
                            key={log.id}
                            className={`p-2.5 rounded-xl border text-xs transition-colors ${
                              isError
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                                : isVocab
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50'
                                : isSync
                                ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-900/50'
                                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                    isVocab
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                      : isSync
                                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                                  }`}
                                >
                                  {log.category.toUpperCase()}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {log.title}
                                </span>
                              </div>

                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                              </span>
                            </div>

                            {/* Detail representation for Vocab */}
                            {isVocab && log.detail?.term && (
                              <div className="mt-1.5 p-2 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                                    {log.detail.term}
                                  </span>
                                  {log.detail.phonetic && (
                                    <span className="text-slate-400 font-mono text-[11px]">
                                      {log.detail.phonetic}
                                    </span>
                                  )}
                                  {log.detail.partOfSpeech && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-medium">
                                      {log.detail.partOfSpeech}
                                    </span>
                                  )}
                                  {log.detail.hasImage && (
                                    <span className="text-[9px] px-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800 rounded">
                                      Có ảnh
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                                  👉 <strong>Nghĩa:</strong> {log.detail.meaning}
                                </div>

                                {log.detail.deckName && (
                                  <div className="text-[10px] text-slate-400">
                                    📁 Bộ: <span className="text-slate-600 dark:text-slate-300 font-medium">{log.detail.deckName}</span>
                                  </div>
                                )}

                                {Array.isArray(log.detail.examples) && log.detail.examples.length > 0 && (
                                  <div className="text-[10px] text-slate-500 italic border-l-2 border-indigo-400 pl-1.5 mt-0.5">
                                    "{log.detail.examples[0]}"
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Detail representation for Sync / Requests */}
                            {isSync && (
                              <div className="mt-1 p-1.5 rounded bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-0.5">
                                {log.detail?.roomSecret && (
                                  <div>Mã phòng: <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.detail.roomSecret}</span></div>
                                )}
                                {log.detail?.testsCount !== undefined && (
                                  <div>Dữ liệu: {log.detail.testsCount} bài test, {log.detail.decksCount} bộ từ vựng</div>
                                )}
                                {log.detail?.error && (
                                  <div className="text-rose-500 font-sans">Lỗi: {log.detail.error}</div>
                                )}
                              </div>
                            )}

                            {/* Detail representation for Test or Other */}
                            {!isVocab && !isSync && log.detail && (
                              <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                {typeof log.detail === 'object'
                                  ? Object.entries(log.detail).map(([k, v]) => (
                                      <span key={k} className="mr-2 inline-block">
                                        <strong className="text-slate-400">{k}:</strong> {String(v)}
                                      </span>
                                    ))
                                  : String(log.detail)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-2 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          Cài đặt & Dữ liệu được lưu an toàn trên trình duyệt này
        </div>
      </div>
    </>
  );
}
