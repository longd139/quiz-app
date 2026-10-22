import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { IconBook, IconCards, IconSettings } from './Icons';
import SettingsModal from './SettingsModal';
import ChangelogModal from './ChangelogModal';
import { APP_VERSION } from '../version';

export default function Header({ syncStatus, dark, toggleDark, appMode, setAppMode, ttsMuted, toggleTts, fontSizeState }) {
  const { data } = useQuiz();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const colors = {
    synced: 'bg-emerald-500',
    syncing: 'bg-amber-500 sync-pulse',
    error: 'bg-rose-500',
    unconfigured: 'bg-slate-300 dark:bg-slate-600'
  };
  const titles = {
    synced: 'Đã đồng bộ Cloud',
    syncing: 'Đang đồng bộ...',
    error: 'Lỗi đồng bộ Cloud',
    unconfigured: 'Chưa cấu hình đồng bộ'
  };

  const handleDotClick = () => {
    navigate('/data');
  };

  const handleSwitchMode = (mode) => {
    if (mode === appMode) return;
    setAppMode(mode);
    if (mode === 'language') {
      navigate('/vocab');
    } else {
      navigate('/');
    }
  };

  const hasCustomSettings = dark || ttsMuted || (fontSizeState && fontSizeState.fontSize !== 100);

  return (
    <header className="relative sticky top-0 z-20 bg-[#fbfbfa] dark:bg-[#0c0f17] border-b border-slate-200/80 dark:border-slate-800/80 py-3.5 mb-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Logo / App title */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:min-w-[180px]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {appMode === 'language' ? 'Study' : 'Quiz'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              {appMode === 'language' ? 'Language' : 'Practice'}
            </span>
            <button
              type="button"
              onClick={() => setIsChangelogOpen(true)}
              className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md font-mono font-semibold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/70 tracking-tight shadow-2xs select-none cursor-pointer transition-all hover:scale-105 active:scale-95"
              title={`Xem nhật ký cập nhật phiên bản ${APP_VERSION}`}
            >
              {APP_VERSION}
            </button>
          </div>

          {/* Settings button for mobile */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(prev => !prev)}
              className={`relative w-8 h-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                isSettingsOpen
                  ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
              }`}
              title="Cài đặt hệ thống (Giao diện, âm thanh, cỡ chữ)"
              aria-label="Cài đặt hệ thống"
            >
              <IconSettings className={`w-4 h-4 transition-transform duration-300 ${isSettingsOpen ? 'rotate-90' : ''}`} />
              {hasCustomSettings && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-slate-900" />
              )}
            </button>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-xl border border-slate-200/90 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchMode('quiz')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                appMode === 'quiz'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <IconBook className="w-3.5 h-3.5" />
              <span>Học câu hỏi</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('language')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                appMode === 'language'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <IconCards className="w-3.5 h-3.5" />
              <span>Học Ngôn Ngữ</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-mono font-medium tracking-normal border border-indigo-200/60 dark:border-indigo-800/60">
                NEW
              </span>
            </button>
          </div>
        </div>

        {/* Right: Settings button for desktop */}
        <div className="hidden sm:flex items-center justify-end sm:min-w-[120px]">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(prev => !prev)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-tight transition-all cursor-pointer ${
              isSettingsOpen
                ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
            }`}
            title="Cài đặt hệ thống (Giao diện, âm thanh, cỡ chữ)"
            aria-label="Cài đặt hệ thống"
          >
            <IconSettings className={`w-3.5 h-3.5 transition-transform duration-300 ${isSettingsOpen ? 'rotate-90 text-indigo-600 dark:text-indigo-400' : 'group-hover:rotate-45'}`} />
            <span>Cài đặt</span>
            {hasCustomSettings && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-slate-900" />
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal / Popover */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        dark={dark}
        toggleDark={toggleDark}
        ttsMuted={ttsMuted}
        toggleTts={toggleTts}
        fontSizeState={fontSizeState}
      />

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </header>
  );
}
