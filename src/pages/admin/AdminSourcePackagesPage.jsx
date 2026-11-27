import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSourceAccessCode,
  createSourcePackage,
  fetchAdminSourceOverview,
  revokeSourceAccessCode,
  rotateSourceAccessCode,
  updateSourcePackage,
  uploadSourcePackageZip,
} from '../../services/sourceService';
import {
  formatFileSize,
  validateAccessCodeInput,
  validateExternalHttpsUrl,
  validateSourceZipFile,
} from '../../lib/sourceValidation';
import { fmtDate } from '../../data/storage';
import { IconCheck, IconCross, IconDownload, IconEdit, IconPlus } from '../../components/Icons';

const STATUS_BADGE = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  INACTIVE: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  ARCHIVED: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
};

export default function AdminSourcePackagesPage() {
  const [overview, setOverview] = useState(null);
  const [packages, setPackages] = useState([]);
  const [codes, setCodes] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Create / Edit package modal
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [pkgForm, setPkgForm] = useState({
    name: '',
    description: '',
    instructions: '',
    category: '',
    version: '1.0.0',
    delivery_type: 'FILE',
    external_url: '',
    status: 'DRAFT',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savingPkg, setSavingPkg] = useState(false);
  const uploadTaskRef = useRef(null);

  // Manage codes modal
  const [codeModalPkg, setCodeModalPkg] = useState(null);
  const [codeMode, setCodeMode] = useState('random');
  const [manualCode, setManualCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [maxPerUser, setMaxPerUser] = useState('1');
  const [creatingCode, setCreatingCode] = useState(false);
  const [revealedCode, setRevealedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [totalFilteredPackages, setTotalFilteredPackages] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminSourceOverview({
        page,
        pageSize,
        search,
        statusFilter,
        typeFilter,
      });
      setOverview(res.overview || null);
      setPackages(res.packages || []);
      setTotalFilteredPackages(res.totalFilteredPackages ?? (res.packages || []).length);
      setCodes(res.codes || []);
      setRedemptions(res.redemptions || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách gói SRC.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, typeFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const codesByPkg = useMemo(() => {
    const map = new Map();
    for (const c of codes) {
      if (!map.has(c.source_package_id)) map.set(c.source_package_id, []);
      map.get(c.source_package_id).push(c);
    }
    return map;
  }, [codes]);

  const pkgById = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);

  const totalPages = Math.max(1, Math.ceil(totalFilteredPackages / pageSize));
  const pagedPackages = packages;

  const openCreateModal = () => {
    setEditingPkg(null);
    setPkgForm({
      name: '',
      description: '',
      instructions: '',
      category: '',
      version: '1.0.0',
      delivery_type: 'FILE',
      external_url: '',
      status: 'DRAFT',
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setPkgModalOpen(true);
  };

  const openEditModal = (pkg) => {
    setEditingPkg(pkg);
    setPkgForm({
      name: pkg.name || '',
      description: pkg.description || '',
      instructions: pkg.instructions || '',
      category: pkg.category || '',
      version: pkg.version || '',
      delivery_type: pkg.delivery_type || 'FILE',
      external_url: pkg.external_url || '',
      status: pkg.status || 'DRAFT',
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setPkgModalOpen(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (savingPkg) return;
    setMessage(null);

    if (!pkgForm.name.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên gói SRC.' });
      return;
    }
    if (pkgForm.delivery_type === 'LINK') {
      const urlCheck = validateExternalHttpsUrl(pkgForm.external_url);
      if (!urlCheck.ok) {
        setMessage({ type: 'error', text: urlCheck.error });
        return;
      }
    }
    if (selectedFile) {
      const fileErr = validateSourceZipFile(selectedFile);
      if (fileErr) {
        setMessage({ type: 'error', text: fileErr });
        return;
      }
    }

    setSavingPkg(true);
    try {
      let targetPkg;
      if (editingPkg) {
        const res = await updateSourcePackage({
          id: editingPkg.id,
          ...pkgForm,
          status: selectedFile && pkgForm.delivery_type === 'FILE' && pkgForm.status === 'ACTIVE' && !editingPkg.storage_path
            ? 'DRAFT'
            : pkgForm.status,
        });
        targetPkg = res.package;
      } else {
        const res = await createSourcePackage(pkgForm);
        targetPkg = res.package;
      }

      if (pkgForm.delivery_type === 'FILE' && selectedFile && targetPkg?.id) {
        const task = uploadSourcePackageZip({
          packageId: targetPkg.id,
          file: selectedFile,
          onProgress: (pct) => setUploadProgress(pct),
        });
        uploadTaskRef.current = task;
        await task.promise;
        uploadTaskRef.current = null;

        if (pkgForm.status === 'ACTIVE') {
          await updateSourcePackage({ id: targetPkg.id, ...pkgForm, status: 'ACTIVE' });
        }
      }

      setPkgModalOpen(false);
      setMessage({ type: 'success', text: editingPkg ? 'Đã cập nhật gói SRC.' : 'Đã tạo gói SRC mới.' });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Lưu gói SRC thất bại.' });
    } finally {
      uploadTaskRef.current = null;
      setSavingPkg(false);
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!codeModalPkg || creatingCode) return;
    setMessage(null);

    if (codeMode === 'manual') {
      const errMsg = validateAccessCodeInput(manualCode);
      if (errMsg) {
        setMessage({ type: 'error', text: errMsg });
        return;
      }
    }

    setCreatingCode(true);
    setRevealedCode('');
    setCopiedCode(false);
    try {
      const res = await createSourceAccessCode({
        source_package_id: codeModalPkg.id,
        mode: codeMode,
        code: codeMode === 'manual' ? manualCode : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        max_redemptions_per_user: maxPerUser ? Number(maxPerUser) : null,
      });
      setRevealedCode(res.plaintextCode || '');
      setManualCode('');
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Không thể tạo mã truy cập.' });
    } finally {
      setCreatingCode(false);
    }
  };

  const handleRevokeCode = async (codeId) => {
    setMessage(null);
    try {
      await revokeSourceAccessCode(codeId);
      setMessage({ type: 'success', text: 'Đã thu hồi mã truy cập.' });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Thu hồi mã thất bại.' });
    }
  };

  const handleRotateCode = async (oldCode) => {
    setMessage(null);
    setRevealedCode('');
    setCopiedCode(false);
    try {
      const res = await rotateSourceAccessCode({
        source_package_id: oldCode.source_package_id,
        revoke_code_id: oldCode.id,
        mode: 'random',
        expires_at: oldCode.expires_at,
        max_redemptions: oldCode.max_redemptions,
        max_redemptions_per_user: oldCode.max_redemptions_per_user,
      });
      setRevealedCode(res.plaintextCode || '');
      setMessage({ type: 'success', text: 'Đã xoay mã mới và thu hồi mã cũ.' });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Xoay mã thất bại.' });
    }
  };

  const handleCopyRevealed = async () => {
    if (!revealedCode) return;
    await navigator.clipboard.writeText(revealedCode);
    setCopiedCode(true);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div role="alert" className={`p-3 rounded-xl text-xs font-medium border ${
          message.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Tổng gói SRC', value: overview?.totalPackages ?? 0 },
          { label: 'Đang hoạt động', value: overview?.activePackages ?? 0 },
          { label: 'Đã khóa / Lưu trữ', value: overview?.lockedPackages ?? 0 },
          { label: 'Tổng lượt nhận', value: overview?.totalRedemptions ?? 0 },
          { label: 'Mã hoạt động', value: overview?.activeCodes ?? 0 },
          { label: 'Mã hết hạn', value: overview?.expiredCodes ?? 0 },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="text-xl font-extrabold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar & Packages Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Quản lý Gói Source Code</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lưu trữ ZIP riêng tư trên Supabase Storage hoặc liên kết HTTPS bảo mật bằng mã truy cập.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>Tạo gói SRC</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên, danh mục, phiên bản..."
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          >
            <option value="ALL">Tất cả loại</option>
            <option value="FILE">FILE (.zip)</option>
            <option value="LINK">LINK (HTTPS)</option>
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Đang tải danh sách gói SRC...</p>
        ) : error ? (
          <p className="py-8 text-center text-xs text-rose-500">{error}</p>
        ) : pagedPackages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Chưa có gói Source Code nào phù hợp.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">Tên SRC</th>
                  <th className="py-2.5 pr-3 font-semibold">Danh mục / Ver</th>
                  <th className="py-2.5 pr-3 font-semibold">Tài nguyên</th>
                  <th className="py-2.5 pr-3 font-semibold">Trạng thái</th>
                  <th className="py-2.5 pr-3 font-semibold">Mã / Lượt</th>
                  <th className="py-2.5 pr-3 font-semibold">Ngày tạo</th>
                  <th className="py-2.5 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedPackages.map((pkg) => {
                  const pkgCodes = codesByPkg.get(pkg.id) || [];
                  const totalUses = pkgCodes.reduce((acc, c) => acc + (c.redemption_count || 0), 0);
                  return (
                    <tr key={pkg.id}>
                      <td className="py-3 pr-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{pkg.name}</p>
                        {pkg.description && <p className="text-[11px] text-slate-500 line-clamp-1">{pkg.description}</p>}
                      </td>
                      <td className="py-3 pr-3">
                        <span>{pkg.category || '—'}</span>
                        {pkg.version && <span className="ml-1.5 font-mono text-[11px] text-slate-500">v{pkg.version.replace(/^v/i, '')}</span>}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="font-mono text-[11px]">
                          {pkg.delivery_type === 'FILE'
                            ? `ZIP · ${formatFileSize(pkg.file_size)}`
                            : 'HTTPS LINK'}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${STATUS_BADGE[pkg.status] || STATUS_BADGE.DRAFT}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-mono">
                        {pkgCodes.length} mã / {totalUses} lượt
                      </td>
                      <td className="py-3 pr-3 text-slate-500">{fmtDate(pkg.created_at)}</td>
                      <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(pkg)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <IconEdit className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCodeModalPkg(pkg);
                            setRevealedCode('');
                            setCopiedCode(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer"
                        >
                          <IconDownload className="w-3.5 h-3.5" />
                          <span>Mã truy cập</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-500">Trang {page} / {totalPages}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">Trước</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Redemption History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold">Lịch sử nhận SRC gần đây</h3>
        {redemptions.length === 0 ? (
          <p className="py-4 text-xs text-slate-400">Chưa có lượt nhận SRC nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Người dùng</th>
                  <th className="py-2 pr-3 font-semibold">Gói SRC</th>
                  <th className="py-2 pr-3 font-semibold">Mã đã che</th>
                  <th className="py-2 pr-3 font-semibold">Thời gian nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {redemptions.map((r) => {
                  const pkg = pkgById.get(r.source_package_id);
                  const codeRow = codes.find((c) => c.id === r.access_code_id);
                  return (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{r.user_name || 'User'}</span>
                        <span className="ml-1.5 text-slate-500">({r.user_email})</span>
                      </td>
                      <td className="py-2.5 pr-3 font-medium">{pkg?.name || r.source_package_id}</td>
                      <td className="py-2.5 pr-3 font-mono text-slate-500">{codeRow?.code_label || '****'}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{fmtDate(r.redeemed_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Package Modal */}
      {pkgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">{editingPkg ? 'Chỉnh sửa gói SRC' : 'Tạo gói SRC mới'}</h3>
              <button type="button" onClick={() => setPkgModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <IconCross className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tên Source Code *</label>
                <input type="text" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Danh mục / Môn</label>
                  <input type="text" value={pkgForm.category} onChange={(e) => setPkgForm({ ...pkgForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phiên bản</label>
                  <input type="text" value={pkgForm.version} onChange={(e) => setPkgForm({ ...pkgForm, version: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Mô tả</label>
                <textarea rows={2} value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Hướng dẫn sử dụng</label>
                <textarea rows={2} value={pkgForm.instructions} onChange={(e) => setPkgForm({ ...pkgForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Hình thức cung cấp</label>
                  <select value={pkgForm.delivery_type} onChange={(e) => setPkgForm({ ...pkgForm, delivery_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <option value="FILE">Upload file (.zip)</option>
                    <option value="LINK">External Link (HTTPS)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Trạng thái</label>
                  <select value={pkgForm.status} onChange={(e) => setPkgForm({ ...pkgForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <option value="DRAFT">DRAFT</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              {pkgForm.delivery_type === 'FILE' ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block font-semibold">Tệp ZIP (tối đa 20 MB)</label>
                  <input type="file" accept=".zip,application/zip" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="block w-full text-xs" />
                  {selectedFile ? (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      Đã chọn: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  ) : editingPkg?.file_name ? (
                    <p className="text-[11px] text-slate-500 font-mono">
                      Tệp hiện tại: {editingPkg.file_name} ({formatFileSize(editingPkg.file_size)})
                    </p>
                  ) : null}
                  {savingPkg && uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 dark:bg-white transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Đang tải lên: {uploadProgress}%</span>
                        <button type="button" onClick={() => uploadTaskRef.current?.abort()} className="text-rose-600 font-semibold cursor-pointer">Hủy tải</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-semibold mb-1">Liên kết HTTPS (GitHub / Drive / URL)</label>
                  <input type="url" value={pkgForm.external_url} onChange={(e) => setPkgForm({ ...pkgForm, external_url: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={savingPkg} className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer disabled:opacity-50">
                  {savingPkg ? 'Đang lưu...' : 'Lưu gói SRC'}
                </button>
                <button type="button" onClick={() => setPkgModalOpen(false)} className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Access Codes Modal */}
      {codeModalPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Mã truy cập: {codeModalPkg.name}</h3>
                <p className="text-slate-500">Mã chỉ hiển thị 1 lần khi tạo mới hoặc xoay mã.</p>
              </div>
              <button type="button" onClick={() => setCodeModalPkg(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <IconCross className="w-4 h-4" />
              </button>
            </div>

            {revealedCode && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-2">
                <p className="font-bold text-emerald-800 dark:text-emerald-200">Mã mới đã tạo (chỉ hiển thị 1 lần):</p>
                <div className="flex items-center gap-2">
                  <code data-testid="revealed-access-code" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 font-mono text-sm font-bold select-all">
                    {revealedCode}
                  </code>
                  <button type="button" onClick={handleCopyRevealed} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer">
                    {copiedCode ? <IconCheck className="w-3.5 h-3.5" /> : null}
                    <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateCode} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="font-bold">Tạo mã truy cập mới</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Kiểu tạo mã</label>
                  <select value={codeMode} onChange={(e) => setCodeMode(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <option value="random">Ngẫu nhiên bảo mật (12 ký tự)</option>
                    <option value="manual">Tự nhập mã (phân biệt hoa/thường)</option>
                  </select>
                </div>
                {codeMode === 'manual' && (
                  <div>
                    <label className="block mb-1 font-medium">Mã thủ công (&gt;= 8 ký tự)</label>
                    <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="VD: QuizApp2026" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                  </div>
                )}
                <div>
                  <label className="block mb-1 font-medium">Hạn sử dụng (tùy chọn)</label>
                  <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Giới hạn tổng lượt (trống = không GH)</label>
                  <input type="number" min="1" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Giới hạn / tài khoản</label>
                  <input type="number" min="1" value={maxPerUser} onChange={(e) => setMaxPerUser(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
              </div>
              <button type="submit" disabled={creatingCode} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer disabled:opacity-50">
                {creatingCode ? 'Đang tạo mã...' : '+ Tạo mã truy cập'}
              </button>
            </form>

            <div className="space-y-2">
              <p className="font-bold">Danh sách mã của gói</p>
              {(codesByPkg.get(codeModalPkg.id) || []).length === 0 ? (
                <p className="text-slate-400 py-2">Chưa có mã nào.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {(codesByPkg.get(codeModalPkg.id) || []).map((c) => (
                    <div key={c.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold">{c.code_label}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {c.status}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Lượt: {c.redemption_count}/{c.max_redemptions ?? '∞'} · Mỗi user: {c.max_redemptions_per_user ?? '∞'}
                          {c.expires_at ? ` · Hết hạn: ${fmtDate(c.expires_at)}` : ''}
                        </p>
                      </div>
                      {c.status === 'ACTIVE' && (
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => handleRotateCode(c)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            Xoay mã
                          </button>
                          <button type="button" onClick={() => handleRevokeCode(c.id)} className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 cursor-pointer">
                            Thu hồi
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
