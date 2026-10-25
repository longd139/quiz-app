import { useState, useRef } from 'react';
import { useQuiz } from '../App';
import { getRoomConfig, isConfigured, hasSupabase } from '../data/supabaseSync';
import { getCloudinaryConfig, setCloudinaryCloudName } from '../lib/cloudinary';
import { loadLocalBackups, saveLocalBackups, checkAndCreateDailyBackup, restoreFromBackup, getTodayDateString } from '../data/backupManager';

export default function DataManagement() {
  const { data, update, syncStatus, doPush, doPull, doCreateRoom, doJoinRoom, doDisconnectSync, showConfirm, showAlert, showToast } = useQuiz();
  const [roomSecret, setRoomSecret] = useState('');
  const [newRoomSecret, setNewRoomSecret] = useState('');
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState('');
  const [showConfig, setShowConfig] = useState(!isConfigured());
  const fileRef = useRef(null);

  const cloudinaryCfg = getCloudinaryConfig();
  const [cloudinaryCloudName, setCloudinaryCloudNameInput] = useState(cloudinaryCfg.cloudName);

  const cfg = getRoomConfig();
  const configured = isConfigured();

  const exportJson = JSON.stringify(data, null, 2);

  const handleCopy = async (text, label) => {
    await navigator.clipboard.writeText(text);
    showToast(`✅ Đã sao chép ${label} vào clipboard!`, 'success');
  };

  const handleDownload = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importText.trim()) { setImportFeedback('Vui lòng paste JSON vào.'); return; }
    try {
      const imported = JSON.parse(importText);
      if (!imported.tests && !imported.vocabDecks) throw new Error('JSON không đúng định dạng: cần có ít nhất "tests" hoặc "vocabDecks".');
      const testCount = imported.tests ? imported.tests.length : 0;
      const deckCount = imported.vocabDecks ? imported.vocabDecks.length : 0;
      showConfirm(`⚠️ Dữ liệu hiện tại sẽ bị GHI ĐÈ bởi dữ liệu nhập vào (${testCount} bài test, ${deckCount} bộ từ vựng). Tiếp tục?`, () => {
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
        setImportFeedback('✅ Đã nhập thành công!');
        setImportText('');
      });
    } catch (e) { setImportFeedback('❌ Lỗi: ' + e.message); }
  };

  const handleCreateRoom = async () => {
    try {
      const result = await doCreateRoom();
      setNewRoomSecret(result.secret);
      setShowConfig(false);
      showToast('✅ Đã tạo phòng. Hãy copy mã phòng để dùng ở thiết bị khác.', 'success');
    } catch (e) { showAlert('Lỗi tạo phòng', e.message, 'error'); }
  };

  const handleJoinRoom = async () => {
    try { await doJoinRoom(roomSecret); setShowConfig(false); showToast('✅ Đã kết nối phòng thành công!', 'success'); }
    catch (e) { showAlert('Lỗi kết nối', e.message, 'error'); }
  };

  const handleSaveCloudinary = () => {
    if (!cloudinaryCloudName.trim()) {
      showToast('Vui lòng nhập Cloud Name từ Cloudinary', 'error');
      return;
    }
    setCloudinaryCloudName(cloudinaryCloudName.trim());
    showToast('✅ Đã lưu cấu hình Cloudinary thành công!', 'success');
  };

  const handleDisconnect = () => {
    showConfirm('⚠️ Ngắt kết nối phòng? Dữ liệu local vẫn được giữ nguyên.', () => {
      doDisconnectSync(); setShowConfig(true); setRoomSecret('');
    });
  };

  const handleReconfig = () => { setShowConfig(true); };

  const todayDate = getTodayDateString();
  const backupsList = (data.dailyBackups && data.dailyBackups.length > 0)
    ? data.dailyBackups
    : loadLocalBackups();

  const handleCreateBackupNow = () => {
    const nextBackups = checkAndCreateDailyBackup(data);
    saveLocalBackups(nextBackups);
    update({ ...data, dailyBackups: nextBackups });
    showToast('✅ Đã tạo bản sao lưu thành công cho ngày hôm nay!', 'success');
  };

  const handleRestoreBackup = (backup) => {
    showConfirm(
      `⚠️ Khôi phục dữ liệu từ bản sao lưu ngày ${backup.date}? Toàn bộ bài test, bộ từ vựng và lịch sử hiện tại sẽ được quay về trạng thái của ngày này. Tiếp tục?`,
      () => {
        try {
          restoreFromBackup(backup, data, update);
          showToast(`✅ Đã khôi phục thành công từ bản sao lưu ngày ${backup.date}!`, 'success');
        } catch (err) {
          showAlert('Lỗi khôi phục', err.message, 'error');
        }
      }
    );
  };

  const handleDownloadBackup = (backup) => {
    const jsonStr = JSON.stringify(backup.data || backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-backup-${backup.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ Đã tải file sao lưu ngày ${backup.date}`, 'success');
  };

  const handleDeleteBackup = (backup) => {
    showConfirm(`Bạn có chắc chắn muốn xóa bản sao lưu ngày ${backup.date}?`, () => {
      const filtered = backupsList.filter(b => b.date !== backup.date);
      saveLocalBackups(filtered);
      update({ ...data, dailyBackups: filtered });
      showToast(`Đã xóa bản sao lưu ngày ${backup.date}`, 'info');
    });
  };

  const statusLabels = { synced: 'Đã đồng bộ', syncing: 'Đang đồng bộ...', error: 'Lỗi đồng bộ', unconfigured: 'Chưa cấu hình' };
  const statusColors = { synced: 'bg-success-50 dark:bg-success-700/20 text-success-700 dark:text-success-300', syncing: 'bg-warning-50 dark:bg-warning-700/20 text-warning-700 dark:text-warning-300', error: 'bg-danger-50 dark:bg-danger-700/20 text-danger-700 dark:text-danger-300', unconfigured: 'bg-slate-50 dark:bg-slate-800 text-slate-500' };

  return (
    <div>
      {/* Sync / Storage Mode */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border-t-2 ${hasSupabase ? 'border-primary-600' : 'border-emerald-500'} p-4 mb-4`}>
        {!hasSupabase ? (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h3 className="text-base font-semibold">Lưu trữ dữ liệu (LocalStorage)</h3>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Đang lưu trong LocalStorage (Nội bộ máy)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              Ứng dụng đang chạy hoàn toàn ở chế độ nội bộ. Toàn bộ câu hỏi, từ vựng và lịch sử học tập được lưu an toàn trong trình duyệt của bạn, hoàn toàn không gửi hay đồng bộ lên cơ sở dữ liệu Cloud.
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">💡</span>
              <div className="flex-1">
                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">Tính năng Cloud & Mã phòng đang ẩn</div>
                <p className="text-[11px] leading-relaxed">
                  Các chức năng mã phòng và đồng bộ đám mây (Production) đã được ẩn vì cấu hình Supabase đang đóng. Khi mở comment cấu hình trong file <code className="text-slate-800 dark:text-slate-200 font-mono px-1 py-0.5 bg-slate-200/60 dark:bg-slate-800 rounded">.env.local</code>, hệ thống sẽ tự động hiển thị lại thông tin mã phòng và kết nối Cloud.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <h3 className="text-base font-semibold">Đồng bộ Cloud (Supabase)</h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                Cloud Sync đang bật
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0">Đồng bộ dữ liệu giữa các thiết bị qua Supabase (Postgres, realtime). Cùng một mã phòng = chung dữ liệu.</p>

            {!configured || showConfig ? (
              <div className="mt-3">
                <label className="font-semibold text-sm block mb-1.5">Nhập mã phòng:</label>
                <div className="flex gap-2">
                  <input type="text" value={roomSecret} onChange={e => setRoomSecret(e.target.value)}
                    placeholder="Dán mã phòng đã tạo ở thiết bị kia"
                    className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:border-primary-500 outline-none" />
                  <button onClick={handleJoinRoom} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 active:scale-95">Kết nối</button>
                </div>
                <div className="flex items-center gap-3 mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Chưa có phòng?</span>
                  <button onClick={handleCreateRoom} className="bg-success-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-success-700 active:scale-95">Tạo phòng mới</button>
                </div>
                {newRoomSecret && (
                  <div className="mt-3 bg-slate-50 dark:bg-slate-700/40 p-3 rounded-lg">
                    <div className="text-xs font-semibold mb-1">✅ Phòng đã tạo. Sao chép mã này và dán vào thiết bị khác:</div>
                    <div className="flex gap-2 items-center">
                      <code className="flex-1 break-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded text-xs">{newRoomSecret}</code>
                      <button onClick={() => handleCopy(newRoomSecret, 'mã phòng')} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95">Copy</button>
                    </div>
                  </div>
                )}
                {configured && <button onClick={() => setShowConfig(false)} className="mt-3 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm text-slate-600 dark:bg-slate-800">Hủy</button>}
              </div>
            ) : (
              <div>
                <div className={`flex items-center gap-1.5 text-sm py-2 px-3 rounded-lg mt-3 ${statusColors[syncStatus] || 'bg-slate-50 dark:bg-slate-800'}`}>
                  <span>{statusLabels[syncStatus] || statusLabels.synced}</span>
                  {cfg?.last_synced_at && <span className="text-xs ml-auto">Lúc {new Date(cfg.last_synced_at).toLocaleTimeString('vi-VN')}</span>}
                </div>
                {cfg?.secret && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 my-2 flex items-center gap-2">
                    <span className="flex-1 break-all">
                      Mã phòng: <code className="text-xs font-semibold">{cfg.secret}</code> {cfg.isDefault && <span className="text-primary-600 dark:text-primary-400 font-semibold">(Cơ sở dữ liệu đám mây chung)</span>}
                    </span>
                    <button onClick={() => handleCopy(cfg.secret, 'mã phòng')} className="text-primary-600 underline text-xs cursor-pointer">Copy</button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={doPush} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95">Push lên cloud</button>
                  <button onClick={doPull} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Pull từ cloud</button>
                  <button onClick={handleReconfig} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Đổi phòng</button>
                  <button onClick={handleDisconnect} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Ngắt kết nối</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Daily Backups & Auto-Retention */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Bản sao lưu hàng ngày (Daily Backup)</h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                Lưu 2 ngày gần nhất
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tự động sao lưu dữ liệu mỗi ngày. Cơ chế xoay vòng giữ lại đúng 2 bản sao lưu của 2 ngày gần nhất (sang ngày thứ 3 sẽ tự động xóa ngày thứ 1).
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateBackupNow}
            className="self-start sm:self-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            + Sao lưu hôm nay
          </button>
        </div>

        {/* Backups list */}
        {backupsList.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">Chưa có bản sao lưu nào. Hệ thống sẽ tự động tạo khi có dữ liệu mới.</p>
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {backupsList.map((backup, idx) => {
              const isToday = backup.date === todayDate;
              return (
                <div
                  key={backup.id || backup.date}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {backup.date}
                      </span>
                      {isToday ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                          Hôm nay (Bản mới nhất)
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {idx === 1 ? 'Hôm trước' : `Bản sao lưu #${idx + 1}`}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        • Cập nhật lúc {new Date(backup.updatedAt || backup.createdAt).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                      <span>📚 <strong>{backup.summary?.testCount || 0}</strong> bài test ({backup.summary?.questionCount || 0} câu)</span>
                      <span>•</span>
                      <span>🗂️ <strong>{backup.summary?.deckCount || 0}</strong> bộ từ ({backup.summary?.cardCount || 0} từ)</span>
                      <span>•</span>
                      <span>⏱️ <strong>{backup.summary?.historyCount || 0}</strong> lượt thi</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleRestoreBackup(backup)}
                      className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                      title="Khôi phục dữ liệu từ bản sao lưu này"
                    >
                      Khôi phục
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadBackup(backup)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                      title="Tải bản sao lưu này về máy"
                    >
                      Tải .json
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBackup(backup)}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 text-xs cursor-pointer transition-colors"
                      title="Xóa bản sao lưu này"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cloudinary Configuration */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold">Lưu trữ ảnh Cloudinary</h3>
          {cloudinaryCloudName ? (
            <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Đã cấu hình
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Cần nhập Cloud Name
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Tải ảnh flashcard trực tiếp lên Cloudinary CDN với API Key và API Secret đã kết nối.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1">
              Cloud Name <span className="text-rose-500">*</span>:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cloudinaryCloudName}
                onChange={e => setCloudinaryCloudNameInput(e.target.value)}
                placeholder="Nhập Cloud name từ dashboard Cloudinary (ví dụ: demo hoặc tên cloud của bạn)"
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:border-primary-500 bg-white dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={handleSaveCloudinary}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Lưu Cloud Name
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold block mb-1 text-slate-500">API Key:</label>
              <input
                type="text"
                readOnly
                value={cloudinaryCfg.apiKey}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1 text-slate-500">API Secret:</label>
              <input
                type="password"
                readOnly
                value="b1z1XZAwQKe58az9as900ORnnL8"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Xuất dữ liệu</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sao lưu toàn bộ câu hỏi, bài test và lịch sử ra file JSON.</p>
        <textarea readOnly value={exportJson} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none min-h-[120px] resize-y bg-slate-50 dark:bg-slate-800 dark:text-slate-300" />
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => handleCopy(exportJson, 'JSON')} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95">Sao chép</button>
          <button onClick={handleDownload} className="border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Tải xuống file</button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Nhập dữ liệu</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Nhập file JSON đã xuất trước đó. Dữ liệu hiện tại sẽ bị ghi đè.</p>
        <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste JSON vào đây..."
          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none min-h-[120px] resize-y" />
        {importFeedback && <div className={`text-sm py-2 px-3 rounded-lg mt-2 ${importFeedback.includes('✅') ? 'bg-success-50 dark:bg-success-700/20 text-success-700 dark:text-success-300' : 'bg-danger-50 dark:bg-danger-700/20 text-danger-700 dark:text-danger-300'}`}>{importFeedback}</div>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={handleImport} className="bg-warning-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-warning-700 active:scale-95">Nhập (ghi đè)</button>
          <input type="file" ref={fileRef} accept=".json" className="hidden" onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setImportText(ev.target.result); r.readAsText(f); }} />
          <button onClick={() => fileRef.current?.click()} className="border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Chọn file</button>
        </div>
      </div>

      {/* Manage collections */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Quản lý collection</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Xóa collection trống (không chứa bài test nào).</p>
        {data.collections.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Chưa có collection nào.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {data.collections.map(c => {
              const testCount = data.tests.filter(t => t.collectionId === c.id).length;
              return (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                  <span className="text-sm">{c.name} <span className="text-xs text-slate-400">({testCount} bài)</span></span>
                  <button
                    onClick={() => {
                      if (testCount > 0) {
                        showConfirm(`Collection "${c.name}" có ${testCount} bài test. Xóa collection này, các bài sẽ chuyển về "Chưa phân loại". Tiếp tục?`, () => {
                          const d = { ...data, collections: data.collections.filter(col => col.id !== c.id) };
                          d.tests = d.tests.map(t => t.collectionId === c.id ? { ...t, collectionId: null } : t);
                          update(d);
                        });
                      } else {
                        showConfirm(`Xóa collection "${c.name}"?`, () => {
                          update({ ...data, collections: data.collections.filter(col => col.id !== c.id) });
                        });
                      }
                    }}
                    className="text-[0.65rem] text-danger-600 underline hover:text-danger-700"
                  >
                    Xóa
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-danger-600 p-4">
        <h3 className="text-base font-semibold mb-1 text-danger-600">Vùng nguy hiểm</h3>
        <button onClick={() => showConfirm('⚠️ XÓA TOÀN BỘ dữ liệu? Tất cả bài test, câu hỏi, lịch sử sẽ mất vĩnh viễn.', () => {
          localStorage.removeItem('quiz_data');
          window.location.reload();
        })} className="bg-danger-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-danger-700 active:scale-95">Xóa toàn bộ dữ liệu</button>
      </div>
    </div>
  );
}
