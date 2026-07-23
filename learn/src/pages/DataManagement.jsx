import { useState, useRef } from 'react';
import { useQuiz } from '../App';
import { getSyncConfig, isSyncConfigured } from '../data/sync';

export default function DataManagement() {
  const { data, update, syncStatus, doPush, doPull, doSetupSync, doDisconnectSync, showConfirm } = useQuiz();
  const [token, setToken] = useState(() => getSyncConfig()?.github_token || '');
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
    try { await doSetupSync(token); setShowConfig(false); alert('✅ Đã kết nối GitHub Gist thành công!'); }
    catch (e) { alert('❌ Lỗi kết nối: ' + e.message); }
  };

  const handleDisconnect = () => {
    showConfirm('⚠️ Ngắt kết nối GitHub Gist? Dữ liệu local vẫn được giữ nguyên.', () => {
      doDisconnectSync(); setShowConfig(true); setToken('');
    });
  };

  const handleReconfig = () => { setShowConfig(true); };

  const statusLabels = { synced: 'Đã đồng bộ', syncing: 'Đang đồng bộ...', error: 'Lỗi đồng bộ', unconfigured: 'Chưa cấu hình' };
  const statusColors = { synced: 'bg-success-50 text-success-700', syncing: 'bg-warning-50 text-warning-700', error: 'bg-danger-50 text-danger-700', unconfigured: 'bg-slate-50 text-slate-500' };

  return (
    <div>
      {/* Sync */}
      <div className="bg-white rounded-xl shadow-sm border-t-2 border-primary-600 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Đồng bộ GitHub Gist</h3>
        <p className="text-xs text-slate-500 mb-0">Đồng bộ dữ liệu giữa laptop và điện thoại qua GitHub Gist (miễn phí, private).</p>

        {!configured || showConfig ? (
          <div className="mt-3">
            <label className="font-semibold text-sm block mb-1.5">GitHub Token:</label>
            <div className="flex gap-2">
              <input type={showToken ? 'text' : 'password'} value={token} onChange={e => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-mono focus:border-primary-500 outline-none" />
              <button onClick={() => setShowToken(!showToken)} className="border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-500">{showToken ? 'Ẩn' : 'Hiện'}</button>
            </div>
            <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg mt-2">
              <strong>Cách lấy token:</strong> Vào <code className="bg-white px-1 py-0.5 rounded text-xs">github.com/settings/tokens</code> &rarr; Generate new token (classic) &rarr; Chọn scope <strong>gist</strong> &rarr; Copy token paste vào đây.
            </div>
            <button onClick={handleSetupSync} className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 active:scale-95">Lưu token & Kết nối</button>
            {configured && <button onClick={() => setShowConfig(false)} className="mt-3 ml-2 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-600">Hủy</button>}
          </div>
        ) : (
          <div>
            <div className={`flex items-center gap-1.5 text-sm py-2 px-3 rounded-lg mt-3 ${statusColors[syncStatus] || 'bg-slate-50'}`}>
              <span>{statusLabels[syncStatus] || statusLabels.synced}</span>
              {cfg?.last_synced_at && <span className="text-xs ml-auto">Lúc {new Date(cfg.last_synced_at).toLocaleTimeString('vi-VN')}</span>}
            </div>
            {cfg?.gist_id && (
              <div className="text-xs text-slate-500 my-2">
                Gist ID: <code className="text-xs">{cfg.gist_id}</code>
                <a href={`https://gist.github.com/${cfg.gist_id}`} target="_blank" className="text-xs ml-1 text-primary-600 underline" rel="noreferrer">Mở trên GitHub</a>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={doPush} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95">Push lên cloud</button>
              <button onClick={doPull} className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-600">Pull từ cloud</button>
              <button onClick={handleReconfig} className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-600">Cấu hình lại</button>
              <button onClick={handleDisconnect} className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-600">Ngắt kết nối</button>
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Xuất dữ liệu</h3>
        <p className="text-xs text-slate-500 mb-3">Sao lưu toàn bộ câu hỏi, bài test và lịch sử ra file JSON.</p>
        <textarea readOnly value={exportJson} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-mono outline-none min-h-[120px] resize-y bg-slate-50" />
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={handleCopy} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-700 active:scale-95">Sao chép</button>
          <button onClick={handleDownload} className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-600">Tải xuống file</button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
        <h3 className="text-base font-semibold mb-1">Nhập dữ liệu</h3>
        <p className="text-xs text-slate-500 mb-3">Nhập file JSON đã xuất trước đó. Dữ liệu hiện tại sẽ bị ghi đè.</p>
        <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste JSON vào đây..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-mono outline-none min-h-[120px] resize-y" />
        {importFeedback && <div className={`text-sm py-2 px-3 rounded-lg mt-2 ${importFeedback.includes('✅') ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>{importFeedback}</div>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={handleImport} className="bg-warning-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-warning-700 active:scale-95">Nhập (ghi đè)</button>
          <input type="file" ref={fileRef} accept=".json" className="hidden" onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setImportText(ev.target.result); r.readAsText(f); }} />
          <button onClick={() => fileRef.current?.click()} className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-600">Chọn file</button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl shadow-sm border border-danger-600 p-4">
        <h3 className="text-base font-semibold mb-1 text-danger-600">Vùng nguy hiểm</h3>
        <button onClick={() => showConfirm('⚠️ XÓA TOÀN BỘ dữ liệu? Tất cả bài test, câu hỏi, lịch sử sẽ mất vĩnh viễn.', () => {
          localStorage.removeItem('quiz_data');
          window.location.reload();
        })} className="bg-danger-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-danger-700 active:scale-95">Xóa toàn bộ dữ liệu</button>
      </div>
    </div>
  );
}
