import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validatePasswordStrength } from '../lib/passwordPolicy';
import { IconLock, IconEye, IconEyeOff, IconCheck } from '../components/Icons';

export default function ChangePasswordPage() {
  const { profile, mustChangePassword, changePassword, signOut } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    const strengthErr = validatePasswordStrength(newPassword);
    if (strengthErr) {
      setErrorMsg(strengthErr);
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMsg('Đổi mật khẩu thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 900);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể đổi mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfbfa] dark:bg-[#0c0f17] px-4 py-10">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <IconLock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {mustChangePassword ? 'Bắt buộc đổi mật khẩu lần đầu' : 'Đổi mật khẩu tài khoản'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile?.email}
            </p>
          </div>
        </div>

        {mustChangePassword && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
            Tài khoản của bạn đang sử dụng mật khẩu tạm thời. Vui lòng đổi sang mật khẩu mới để tiếp tục học tập.
          </div>
        )}

        {errorMsg && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div role="status" className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <IconCheck className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu hiện tại
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting}
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu mới
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            {showPasswords ? <IconEyeOff className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
            <span>{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
          </button>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer transition-all"
            >
              {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
            {mustChangePassword ? (
              <button
                type="button"
                onClick={signOut}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Đăng xuất
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Quay lại
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
