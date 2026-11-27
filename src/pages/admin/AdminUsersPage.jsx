import { useEffect, useState, useCallback } from 'react';
import {
  listProfiles,
  createUserAccount,
  updateUserAccount,
  resetUserPassword,
} from '../../services/userService';
import { validatePasswordStrength } from '../../lib/passwordPolicy';
import { useAuth } from '../../contexts/AuthContext';
import { IconSearch } from '../../components/Icons';
import { fmtDate } from '../../data/storage';

export default function AdminUsersPage() {
  const { profile: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [toastMsg, setToastMsg] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
    status: 'ACTIVE',
    must_change_password: true,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset password state
  const [resetPw, setResetPw] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetMustChange, setResetMustChange] = useState(true);

  const notify = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProfiles({ search, role: roleFilter, status: statusFilter, page, pageSize });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      notify(err.message || 'Lỗi tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!createForm.full_name.trim()) return setFormError('Vui lòng nhập họ và tên.');
    if (!createForm.email.trim()) return setFormError('Vui lòng nhập email.');
    const pwErr = validatePasswordStrength(createForm.password);
    if (pwErr) return setFormError(pwErr);
    if (createForm.password !== createForm.confirmPassword) {
      return setFormError('Xác nhận mật khẩu không khớp.');
    }

    setSubmitting(true);
    try {
      await createUserAccount({
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        status: createForm.status,
        must_change_password: createForm.must_change_password,
      });
      setShowCreateModal(false);
      setCreateForm({
        full_name: '', email: '', password: '', confirmPassword: '',
        role: 'USER', status: 'ACTIVE', must_change_password: true,
      });
      notify('Đã tạo tài khoản mới thành công.');
      loadUsers();
    } catch (err) {
      setFormError(err.message || 'Không thể tạo tài khoản.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setFormError('');
    setSubmitting(true);
    try {
      await updateUserAccount(editTarget.id, {
        full_name: editTarget.full_name,
        role: editTarget.role,
        status: editTarget.status,
        must_change_password: editTarget.must_change_password,
      });
      setEditTarget(null);
      notify('Đã cập nhật thông tin tài khoản.');
      loadUsers();
    } catch (err) {
      setFormError(err.message || 'Cập nhật thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = (u) => {
    const nextStatus = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setConfirmAction({
      title: nextStatus === 'DISABLED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      message: `Bạn có chắc muốn ${nextStatus === 'DISABLED' ? 'khóa' : 'mở khóa'} tài khoản ${u.email}?`,
      onConfirm: async () => {
        try {
          await updateUserAccount(u.id, { status: nextStatus });
          notify(nextStatus === 'DISABLED' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
          loadUsers();
        } catch (err) {
          notify(err.message || 'Thao tác thất bại.', 'error');
        } finally {
          setConfirmAction(null);
        }
      },
    });
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    setFormError('');
    const pwErr = validatePasswordStrength(resetPw);
    if (pwErr) return setFormError(pwErr);
    if (resetPw !== resetConfirm) return setFormError('Xác nhận mật khẩu không khớp.');

    setSubmitting(true);
    try {
      await resetUserPassword(resetTarget.id, resetPw, resetMustChange);
      setResetTarget(null);
      setResetPw('');
      setResetConfirm('');
      notify('Đã đặt lại mật khẩu tạm thời cho tài khoản.');
      loadUsers();
    } catch (err) {
      setFormError(err.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div
          role="status"
          className={`p-3 rounded-xl text-xs font-medium border ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {toastMsg.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
            <option value="USER">Người dùng (USER)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="DISABLED">Đã khóa</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => { setFormError(''); setShowCreateModal(true); }}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-500 cursor-pointer"
        >
          + Tạo tài khoản
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Người dùng</th>
                <th className="py-3 px-4 font-semibold">Vai trò</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold">Đăng nhập gần nhất</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Đang tải danh sách tài khoản...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Không tìm thấy tài khoản nào phù hợp.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{u.full_name || '(Chưa đặt tên)'}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                      {u.must_change_password && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                          Bắt buộc đổi mật khẩu
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {u.last_login_at ? fmtDate(u.last_login_at) : 'Chưa đăng nhập'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => { setFormError(''); setEditTarget({ ...u }); }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFormError(''); setResetTarget(u); setResetPw(''); setResetConfirm(''); setResetMustChange(true); }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Đặt lại MK
                      </button>
                      {u.id !== currentAdmin?.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleLock(u)}
                          className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Tổng {total} tài khoản · Trang {page}/{totalPages}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-base font-bold mb-4">Tạo tài khoản mới</h3>
            {formError && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{formError}</p>}
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Mật khẩu tạm thời</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Vai trò</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Trạng thái</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.must_change_password}
                  onChange={(e) => setCreateForm({ ...createForm, must_change_password: e.target.checked })}
                />
                <span>Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên</span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-base font-bold mb-1">Cập nhật tài khoản</h3>
            <p className="text-xs text-slate-500 mb-4">{editTarget.email}</p>
            {formError && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{formError}</p>}
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={editTarget.full_name}
                  onChange={(e) => setEditTarget({ ...editTarget, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Vai trò</label>
                  <select
                    value={editTarget.role}
                    onChange={(e) => setEditTarget({ ...editTarget, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Trạng thái</label>
                  <select
                    value={editTarget.status}
                    onChange={(e) => setEditTarget({ ...editTarget, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTarget.must_change_password}
                  onChange={(e) => setEditTarget({ ...editTarget, must_change_password: e.target.checked })}
                />
                <span>Bắt buộc đổi mật khẩu ở lần đăng nhập tiếp theo</span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-semibold cursor-pointer disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-base font-bold mb-1">Đặt lại mật khẩu tạm thời</h3>
            <p className="text-xs text-slate-500 mb-4">{resetTarget.email}</p>
            {formError && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{formError}</p>}
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mật khẩu tạm thời mới</label>
                <input
                  type="password"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetMustChange}
                  onChange={(e) => setResetMustChange(e.target.checked)}
                />
                <span>Bắt buộc đổi mật khẩu khi đăng nhập</span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setResetTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-semibold cursor-pointer disabled:opacity-50">
                  {submitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-bold mb-2">{confirmAction.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">{confirmAction.message}</p>
            <div className="flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                Hủy
              </button>
              <button type="button" onClick={confirmAction.onConfirm} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold cursor-pointer">
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
