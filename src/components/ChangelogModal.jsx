import React, { useEffect } from 'react';
import { APP_VERSION, CHANGELOG_DATA } from '../version';

export default function ChangelogModal({ isOpen, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeBadge = (type) => {
    switch (type) {
      case 'feature':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Tính năng
          </span>
        );
      case 'improvement':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Cải tiến
          </span>
        );
      case 'fix':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Sửa lỗi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Cập nhật
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Nhật ký cập nhật
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lịch sử thay đổi và tính năng mới nhất
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-lg"
            title="Đóng (ESC)"
          >
            &times;
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-6 flex-1">
          {CHANGELOG_DATA.map((release, rIdx) => (
            <div
              key={release.version}
              className={`relative rounded-xl p-4 transition-all ${
                release.isLatest
                  ? 'bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60 shadow-xs'
                  : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60'
              }`}
            >
              {/* Version & Date */}
              <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400">
                    {release.version}
                  </span>
                  {release.isLatest && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-2xs">
                      Mới nhất
                    </span>
                  )}
                  {release.tag && !release.isLatest && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {release.tag}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {release.date}
                </span>
              </div>

              {/* Version title */}
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                {release.title}
              </h4>

              {/* Changes list */}
              <div className="space-y-2.5">
                {release.changes.map((item, cIdx) => (
                  <div key={cIdx} className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getTypeBadge(item.type)}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 pl-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-300">
            Ứng dụng tự động cập nhật
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
