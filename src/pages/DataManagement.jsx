import { useState, useRef } from 'react';
import { useQuiz } from '../App';
import { getSyncConfig, isSyncConfigured } from '../data/sync';

export default function DataManagement() {
  const { data, update, syncStatus, doPush, doPull, doSetupSync, doDisconnectSync, showConfirm } = useQuiz();
  const [token, setToken] = useState(() => getSyncConfig()?.github_token || '');
  const [gistId, setGistId] = useState(() => getSyncConfig()?.gist_id || '');
  const [showToken, setShowToken] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState('');
  const [showConfig, setShowConfig] = useState(!isSyncConfigured());
  const fileRef = useRef(null);

  const cfg = getSyncConfig();
  const configured = isSyncConfigured();

  const exportJson = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportJson);
    alert('✅ Đã sao chép JSON vào clipboard!');
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
      if (!imported.tests) throw new Error('JSON không đúng định dạng: thiếu trường "tests".');
      showConfirm(`⚠️ Dữ liệu hiện tại sẽ bị GHI ĐÈ bởi dữ liệu nhập vào (${imported.tests.length} bài test). Tiếp tục?`, () => {
        update({
          collections: imported.collections || [],
          tests: imported.tests || [],
          history: imported.history || [],
          settings: imported.settings || { shuffleQuestions: true, shuffleOptions: false, practiceMode: 'submit' },
          questionStats: imported.questionStats || {}
        });
        setImportFeedback('✅ Đã nhập thành công!');
        setImportText('');
      });
    } catch (e) { setImportFeedback('❌ Lỗi: ' + e.message); }
  };

  const handleSetupSync = async () => {
    try { await doSetupSync(token, gistId); setShowConfig(false); alert('✅ Đã kết nối GitHub Gist thành công!'); }
    catch (e) { alert('❌ Lỗi kết nối: ' + e.message); }
  };

  const handleDisconnect = () => {
    showConfirm('⚠️ Ngắt kết nối GitHub Gist? Dữ liệu local vẫn được giữ nguyên.', () => {
      doDisconnectSync(); setShowConfig(true); setToken('');
    });
  };

  const handleReconfig = () => { setShowConfig(true); };

  const statusLabels = { synced: 'Đã đồng bộ', syncing: 'Đang đồng bộ...', error: 'Lỗi đồng bộ', unconfigured: 'Chưa cấu hình' };
  const statusColors = { synced: 'bg-success-50 text-success-700', syncing: 'bg-warning-50 text-warning-700', error: 'bg-danger-50 text-danger-700', unconfigured: 'bg-slate-50 dark:bg-slate-800 text-slate-500' };

  return (
    <div>
      {/* Sync */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border-t-2 border-primary-600 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Đồng bộ GitHub Gist</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0">Đồng bộ dữ liệu giữa laptop và điện thoại qua GitHub Gist (miễn phí, private).</p>

        {!configured || showConfig ? (
          <div className="mt-3">
            <label className="font-semibold text-sm block mb-1.5">GitHub Token:</label>
            <div className="flex gap-2">
              <input type={showToken ? 'text' : 'password'} value={token} onChange={e => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:border-primary-500 outline-none" />
              <button onClick={() => setShowToken(!showToken)} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-500">{showToken ? 'Ẩn' : 'Hiện'}</button>
            </div>
            <label className="font-semibold text-sm block mb-1.5 mt-3">Gist ID (bỏ trống để tạo mới):</label>
            <input type="text" value={gistId} onChange={e => setGistId(e.target.value)}
              placeholder="Nhập Gist ID từ thiết bị kia, hoặc bỏ trống để tạo Gist mới"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:border-primary-500 outline-none" />
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg mt-2">
              <strong>Cách lấy token:</strong> Vào <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-xs">github.com/settings/tokens</code> &rarr; Generate new token (classic) &rarr; Chọn scope <strong>gist</strong> &rarr; Copy token paste vào đây.
            </div>
            <button onClick={handleSetupSync} className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 active:scale-95">Lưu token & Kết nối</button>
            {configured && <button onClick={() => setShowConfig(false)} className="mt-3 ml-2 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm text-slate-600">Hủy</button>}
          </div>
        ) : (
          <div>
            <div className={`flex items-center gap-1.5 text-sm py-2 px-3 rounded-lg mt-3 ${statusColors[syncStatus] || 'bg-slate-50'}`}>
              <span>{statusLabels[syncStatus] || statusLabels.synced}</span>
              {cfg?.last_synced_at && <span className="text-xs ml-auto">Lúc {new Date(cfg.last_synced_at).toLocaleTimeString('vi-VN')}</span>}
            </div>
            {cfg?.gist_id && (
              <div className="text-xs text-slate-500 dark:text-slate-400 my-2">
                Gist ID: <code className="text-xs">{cfg.gist_id}</code>
                <a href={`https://gist.github.com/${cfg.gist_id}`} target="_blank" className="text-xs ml-1 text-primary-600 underline" rel="noreferrer">Mở trên GitHub</a>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={doPush} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95">Push lên cloud</button>
              <button onClick={doPull} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Pull từ cloud</button>
              <button onClick={handleReconfig} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Cấu hình lại</button>
              <button onClick={handleDisconnect} className="border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Ngắt kết nối</button>
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Xuất dữ liệu</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sao lưu toàn bộ câu hỏi, bài test và lịch sử ra file JSON.</p>
        <textarea readOnly value={exportJson} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none min-h-[120px] resize-y bg-slate-50 dark:bg-slate-800 dark:text-slate-300" />
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={handleCopy} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95">Sao chép</button>
          <button onClick={handleDownload} className="border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600">Tải xuống file</button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Nhập dữ liệu</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Nhập file JSON đã xuất trước đó. Dữ liệu hiện tại sẽ bị ghi đè.</p>
        <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste JSON vào đây..."
          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none min-h-[120px] resize-y" />
        {importFeedback && <div className={`text-sm py-2 px-3 rounded-lg mt-2 ${importFeedback.includes('✅') ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>{importFeedback}</div>}
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
