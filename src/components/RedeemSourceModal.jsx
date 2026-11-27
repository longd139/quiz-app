import { useState, useRef, useEffect } from 'react';
import { IconCheck, IconCross, IconDownload, IconEye, IconEyeOff, IconLink } from './Icons';
import { redeemSourceByCode, getSourceDownloadUrl } from '../services/sourceService';
import { formatFileSize, normalizeAccessCodeInput, validateAccessCodeInput } from '../lib/sourceValidation';

export default function RedeemSourceModal({ open, onClose, onRedeemed }) {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const opIdRef = useRef(crypto.randomUUID());
  const lastCodeRef = useRef('');
  const sessionTokenRef = useRef(0);

  useEffect(() => {
    if (open) {
      opIdRef.current = crypto.randomUUID();
      lastCodeRef.current = '';
      sessionTokenRef.current += 1;
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    sessionTokenRef.current += 1;
    setCode('');
    setShowCode(false);
    setError('');
    setResult(null);
    setSubmitting(false);
    lastCodeRef.current = '';
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const normalized = normalizeAccessCodeInput(code);
    const clientErr = validateAccessCodeInput(normalized);
    if (clientErr) {
      setError(clientErr);
      return;
    }

    // Keep same operationId for retries of the same code; rotate only when code changes
    if (lastCodeRef.current && lastCodeRef.current !== normalized) {
      opIdRef.current = crypto.randomUUID();
    }
    lastCodeRef.current = normalized;

    const currentSessionToken = sessionTokenRef.current;
    setSubmitting(true);
    setError('');
    try {
      const res = await redeemSourceByCode({
        accessCode: normalized,
        operationId: opIdRef.current,
      });
      if (sessionTokenRef.current !== currentSessionToken) return;
      setResult(res);
      setCode('');
      if (typeof onRedeemed === 'function') onRedeemed(res);
    } catch (err) {
      if (sessionTokenRef.current !== currentSessionToken) return;
      // Preserve opIdRef on network/5xx errors so retry after DB commit stays idempotent;
      // only rotate on explicit validation/4xx conflict if needed
      if (err?.status === 409) {
        opIdRef.current = crypto.randomUUID();
      }
      setError(err?.message || 'Không thể nhận SRC lúc này. Vui lòng thử lại.');
    } finally {
      if (sessionTokenRef.current === currentSessionToken) {
        setSubmitting(false);
      }
    }
  };

  const handleDownloadFile = async () => {
    if (!result?.redemptionId || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const fresh = await getSourceDownloadUrl(result.redemptionId);
      if (fresh?.signedUrl) {
        const a = document.createElement('a');
        a.href = fresh.signedUrl;
        a.download = fresh.fileName || result.package?.file_name || 'source.zip';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setError(err?.message || 'Không thể tạo liên kết tải xuống.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="redeem-src-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 id="redeem-src-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Nhận Source Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nhập mã được cung cấp bởi quản trị viên để nhận source code tương ứng.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <IconCross className="w-4 h-4" />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="src-access-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mã truy cập
              </label>
              <div className="relative">
                <input
                  id="src-access-code"
                  type={showCode ? 'text' : 'password'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Nhập mã nhận SRC..."
                  autoComplete="off"
                  autoFocus
                  disabled={submitting}
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-slate-900 dark:focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCode((v) => !v)}
                  aria-label={showCode ? 'Ẩn mã' : 'Hiện mã'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCode ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Đang xác thực...' : 'Xác nhận mã'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-1">
              Liên hệ quản trị viên nếu bạn chưa có mã.
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <IconCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Xác nhận mã thành công</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Tài nguyên đã sẵn sàng để tải hoặc mở.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{result.package?.name}</span>
                {result.package?.version && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-[11px] font-mono">
                    {result.package.version}
                  </span>
                )}
              </div>
              {result.package?.category && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Danh mục: {result.package.category}</p>
              )}
              {result.package?.description && (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{result.package.description}</p>
              )}
              {result.package?.instructions && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">Hướng dẫn:</p>
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{result.package.instructions}</p>
                </div>
              )}
              {result.package?.delivery_type === 'FILE' && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-mono">
                  Tệp: {result.package.file_name} ({formatFileSize(result.package.file_size)})
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              {result.package?.delivery_type === 'FILE' ? (
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  disabled={downloading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                >
                  <IconDownload className="w-4 h-4" />
                  <span>{downloading ? 'Đang tạo liên kết...' : 'Tải Source Code'}</span>
                </button>
              ) : (
                <a
                  href={result.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100"
                >
                  <IconLink className="w-4 h-4" />
                  <span>Mở Source Code</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
