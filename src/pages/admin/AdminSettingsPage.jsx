import { useEffect, useState } from 'react';
import { fetchSystemSettings, saveSystemSetting } from '../../services/settingsService';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [bannerText, setBannerText] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const settings = await fetchSystemSettings();
        if (settings.announcement_banner?.text) {
          setBannerText(settings.announcement_banner.text);
        }
      } catch {
        // ignore if empty
      }
    })();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    try {
      await saveSystemSetting('announcement_banner', { text: bannerText.trim() }, user.id);
      setStatusMsg('Đã lưu cài đặt hệ thống.');
    } catch (err) {
      setStatusMsg('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold mb-1">Cài đặt hệ thống</h2>
        <p className="text-xs text-slate-500 mb-4">Cấu hình chung lưu tập trung trong bảng `system_settings`.</p>

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Thông báo toàn hệ thống (tuỳ chọn)</label>
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="Ví dụ: Lịch bảo trì định kỳ..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          {statusMsg && <p className="text-emerald-600 dark:text-emerald-400 font-medium">{statusMsg}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 text-xs space-y-2">
        <h3 className="text-sm font-bold">Checklist bảo mật Supabase Production</h3>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
          <li>Tắt <strong>Allow new users to sign up</strong> trong Supabase Dashboard → Authentication → Providers → Email.</li>
          <li>Cấu hình Edge Function secrets: <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, <code>CLOUDINARY_API_SECRET</code>.</li>
          <li>Không đưa <code>SUPABASE_SERVICE_ROLE_KEY</code> vào biến môi trường frontend (<code>VITE_*</code>).</li>
        </ul>
      </div>
    </div>
  );
}
