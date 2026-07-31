export default function ConfirmDialog({ message, onYes, onNo }) {
  return (
    <div className="overlay flex items-center justify-center bg-black/50 px-4" onClick={(e) => { if (e.target === e.currentTarget) onNo(); }}>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
        <p className="text-sm mb-4 dark:text-slate-200">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onYes} className="bg-danger-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-danger-700 transition-all">Xóa</button>
          <button onClick={onNo} className="border border-slate-200 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300">Hủy</button>
        </div>
      </div>
    </div>
  );
}
