const TYPE_ICON = {
  success: { icon: '✅', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  error: { icon: '❌', color: 'bg-danger-500/10 text-danger-600 dark:text-danger-400' },
  warning: { icon: '⚠️', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  info: { icon: 'ℹ️', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
};

export default function AlertDialog({ title, message, type = 'info', onClose }) {
  const t = TYPE_ICON[type] || TYPE_ICON.info;
  return (
    <div className="overlay flex items-center justify-center bg-black/50 px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="page-enter bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${t.color}`}>{t.icon}</span>
          <div className="min-w-0">
            {title && <h3 className="text-base font-bold mb-1 dark:text-slate-100">{title}</h3>}
            {message && <p className="text-sm dark:text-slate-200 whitespace-pre-line">{message}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="border border-slate-200 dark:border-slate-600 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >OK</button>
        </div>
      </div>
    </div>
  );
}