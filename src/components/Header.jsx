import { useNavigate, useLocation } from 'react-router-dom';
import { useQuiz } from '../App';
import { IconBook, IconCards, IconSpeaker, IconSpeakerMute } from './Icons';
import { APP_VERSION } from '../version';

export default function Header({ syncStatus, dark, toggleDark, appMode, setAppMode, ttsMuted, toggleTts }) {
  const { data } = useQuiz();
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <header className="sticky top-0 z-20 bg-[#fbfbfa]/90 dark:bg-[#0c0f17]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-3.5 mb-6 transition-colors">
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
            <span
              className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md font-mono font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/70 tracking-tight shadow-2xs select-none"
              title={`Phiên bản ứng dụng: ${APP_VERSION}`}
            >
              {APP_VERSION}
            </span>
          </div>

          {/* Sound & Dark mode switch for mobile */}
          <div className="sm:hidden flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTts}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                ttsMuted
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-900/50'
                  : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
              }`}
              title={ttsMuted ? 'Bật tự động đọc khi chuyển câu' : 'Tắt tự động đọc khi chuyển câu'}
              aria-label={ttsMuted ? 'Bật tự động đọc khi chuyển câu' : 'Tắt tự động đọc khi chuyển câu'}
            >
              {ttsMuted ? <IconSpeakerMute className="w-3.5 h-3.5" /> : <IconSpeaker className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={toggleDark}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
              title={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {dark ? '☼' : '☾'}
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

        {/* Right: Sound toggle & Dark mode switch for desktop */}
        <div className="hidden sm:flex items-center justify-end gap-1.5 sm:min-w-[120px]">
          <button
            type="button"
            onClick={toggleTts}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
              ttsMuted
                ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-900/50'
                : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
            }`}
            title={ttsMuted ? 'Bật tự động đọc khi chuyển câu' : 'Tắt tự động đọc khi chuyển câu'}
            aria-label={ttsMuted ? 'Bật tự động đọc khi chuyển câu' : 'Tắt tự động đọc khi chuyển câu'}
          >
            {ttsMuted ? <IconSpeakerMute className="w-3.5 h-3.5" /> : <IconSpeaker className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleDark}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
            title={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          >
            {dark ? '☼' : '☾'}
          </button>
        </div>
      </div>
    </header>
  );
}
