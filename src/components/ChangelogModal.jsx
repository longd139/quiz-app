import React, { useState, useEffect } from 'react';
import { APP_VERSION, CHANGELOG_DATA } from '../version';
import { IconChevronDown } from './Icons';

export default function ChangelogModal({ isOpen, onClose }) {
  const [showOlderVersions, setShowOlderVersions] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setShowOlderVersions(false);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentRelease = CHANGELOG_DATA[0] || null;
  const olderReleases = CHANGELOG_DATA.slice(1);

  const getTagBadge = (type) => {
    switch (type) {
      case 'feature':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/70 shrink-0">
            Mới
          </span>
        );
      case 'improvement':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/70 shrink-0">
            Cải tiến
          </span>
        );
      case 'fix':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/70 shrink-0">
            Sửa lỗi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Clean, no icon box */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Nhật ký cập nhật
              </h3>
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 select-none">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Những thay đổi và cải tiến mới nhất trong ứng dụng
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-lg leading-none"
            title="Đóng (ESC)"
            aria-label="Đóng popup"
          >
            &times;
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Current Active Release */}
          {currentRelease && (
            <div className="space-y-4">
              {/* Release banner meta */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {currentRelease.version}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.25 text-[10px] font-semibold rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                      Bản hiện tại
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {currentRelease.title}
                  </h4>
                </div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {currentRelease.date}
                </span>
              </div>

              {/* Items List - Linear style typography */}
              <div className="space-y-3.5">
                {currentRelease.changes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getTagBadge(item.type)}
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-0.5">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Older Releases Toggle & Section */}
          {olderReleases.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowOlderVersions(prev => !prev)}
                className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer select-none group"
              >
                <span>Các phiên bản trước ({olderReleases.map(r => r.version).join(', ')})</span>
                <IconChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 ${
                    showOlderVersions ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>

              {showOlderVersions && (
                <div className="space-y-4 pt-3 animate-fadeIn">
                  {olderReleases.map((release) => (
                    <div
                      key={release.version}
                      className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {release.version}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {release.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {release.date}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        {release.changes.map((item, cIdx) => (
                          <div key={cIdx} className="text-xs space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {getTagBadge(item.type)}
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.title}
                              </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed pl-1">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Ứng dụng tự động cập nhật
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
