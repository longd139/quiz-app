import { useEffect, useRef } from 'react';
import {
  IconSettings,
  IconSpeaker,
  IconSpeakerMute,
  IconCross,
  IconRotate
} from './Icons';

export default function SettingsModal({
  isOpen,
  onClose,
  dark,
  toggleDark,
  ttsMuted,
  toggleTts,
  fontSizeState,
}) {
  const {
    fontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    presets,
    min,
    max,
  } = fontSizeState;

  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop trong suốt, không làm mờ hay tối màn hình phía trên */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover / Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Cài đặt hệ thống"
        className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-full mt-2 z-50 w-[calc(100vw-1.5rem)] sm:w-88 max-w-sm bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-800 dark:text-slate-100 page-enter select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <IconSettings className="w-4 h-4 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Cài đặt hệ thống
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Giao diện, âm thanh & hiển thị
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng cài đặt"
          >
            <IconCross className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Section 1: Giao diện (Theme Dark / Light) */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{dark ? '☾' : '☼'}</span>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Giao diện
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {dark ? 'Chế độ tối (Dark mode)' : 'Chế độ sáng (Light mode)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Segmented Switch */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/60 dark:bg-slate-900/80 rounded-lg">
              <button
                type="button"
                onClick={() => { if (dark) toggleDark(); }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  !dark
                    ? 'bg-white text-amber-600 shadow-2xs border border-amber-200/50'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>☼</span>
                <span>Sáng</span>
              </button>
              <button
                type="button"
                onClick={() => { if (!dark) toggleDark(); }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  dark
                    ? 'bg-slate-800 text-indigo-300 shadow-2xs border border-indigo-700/50'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>☾</span>
                <span>Tối</span>
              </button>
            </div>
          </div>

          {/* Section 2: Tự động đọc câu hỏi (TTS Sound) */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg border transition-colors ${
                  !ttsMuted
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 border-rose-100 dark:border-rose-900/40'
                }`}>
                  {!ttsMuted ? <IconSpeaker className="w-3.5 h-3.5" /> : <IconSpeakerMute className="w-3.5 h-3.5" />}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Âm thanh giọng đọc
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {!ttsMuted ? 'Tự đọc khi chuyển câu hỏi' : 'Đã tắt đọc tự động'}
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={toggleTts}
                role="switch"
                aria-checked={!ttsMuted}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  !ttsMuted ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    !ttsMuted ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Kích thước chữ (Font Size Adjustment) */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center font-bold text-xs">
                  Aa
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Cỡ chữ hệ thống
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Toàn bộ app sẽ co giãn theo tỷ lệ
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {fontSize}%
                </span>
                {fontSize !== 100 && (
                  <button
                    type="button"
                    onClick={resetFontSize}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Đặt lại cỡ chữ mặc định (100%)"
                  >
                    <IconRotate className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-4 gap-1 mb-2.5">
              {presets.map((preset) => {
                const isActive = fontSize === preset.percent;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setFontSize(preset.percent)}
                    className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                        : 'bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs'
                    }`}
                  >
                    <div className="text-[11px] leading-tight">{preset.label}</div>
                    <div className={`text-[9px] font-mono ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stepper + Range slider */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={decreaseFontSize}
                disabled={fontSize <= min}
                className="w-8 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Giảm kích thước (A-)"
              >
                A-
              </button>

              <input
                type="range"
                min={min}
                max={max}
                step="5"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              <button
                type="button"
                onClick={increaseFontSize}
                disabled={fontSize >= max}
                className="w-8 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Tăng kích thước (A+)"
              >
                A+
              </button>
            </div>

            {/* Live Preview Box */}
            <div className="mt-2.5 p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
                Xem trước văn bản hiển thị:
              </p>
              <p className="text-xs font-medium">
                Câu hỏi: Thủ đô của Việt Nam là Hà Nội.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-2.5 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
          Cài đặt được lưu tự động trên trình duyệt này
        </div>
      </div>
    </>
  );
}
