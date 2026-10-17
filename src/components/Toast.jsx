import { useState } from 'react';
import { IconCheck, IconCross } from './Icons';

function ToastItem({ toast, onDismiss }) {
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss?.(toast.id);
    }, 200);
  };

  const icons = {
    success: (
      <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
        <IconCheck className="w-3.5 h-3.5" />
      </div>
    ),
    error: (
      <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/80 flex items-center justify-center shrink-0">
        <IconCross className="w-3.5 h-3.5" />
      </div>
    ),
    warning: (
      <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold font-mono">!</span>
      </div>
    ),
    info: (
      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold font-mono">i</span>
      </div>
    ),
  };

  const titles = {
    success: 'Thành công',
    error: 'Đã xảy ra lỗi',
    warning: 'Lưu ý',
    info: 'Thông báo',
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 shadow-xl shadow-slate-900/5 dark:shadow-black/30 transition-all ${
        isDismissing ? 'toast-slide-out-right' : 'toast-slide-in-right'
      }`}
    >
      {icons[toast.type] || icons.info}

      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          {toast.title || titles[toast.type] || 'Thông báo'}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug whitespace-pre-line break-words">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-70 hover:opacity-100 cursor-pointer shrink-0 ml-1"
        aria-label="Đóng thông báo"
      >
        <IconCross className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || !toasts.length) return null;

  return (
    <div
      tabIndex={-1}
      aria-live="polite"
      className="fixed top-4 right-4 z-[120] flex max-h-screen w-full max-w-[360px] flex-col gap-2.5 pointer-events-none p-2 sm:p-0"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}