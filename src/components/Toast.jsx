const TYPE_STYLE = {
  success: { icon: '✅', ring: 'ring-emerald-500/40' },
  error: { icon: '❌', ring: 'ring-danger-500/40' },
  warning: { icon: '⚠️', ring: 'ring-amber-500/40' },
  info: { icon: 'ℹ️', ring: 'ring-indigo-500/40' },
};

export default function Toast({ toasts }) {
  if (!toasts || !toasts.length) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-full max-w-sm px-4 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => {
        const s = TYPE_STYLE[t.type] || TYPE_STYLE.info;
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto w-full flex items-center gap-3 bg-white dark:bg-slate-800 ring-2 ${s.ring} rounded-xl px-4 py-3 shadow-lg`}
          >
            <span className="text-lg shrink-0">{s.icon}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-pre-line">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}