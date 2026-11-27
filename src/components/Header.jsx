import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { calculateStreakStats } from '../data/streak';
import { IconBook, IconCards, IconSettings, IconShield, IconLock } from './Icons';
import SettingsModal from './SettingsModal';
import ChangelogModal from './ChangelogModal';
import { APP_VERSION } from '../version';

export default function Header({ dark, toggleDark, appMode, setAppMode, ttsMuted, toggleTts, fontSizeState }) {
  const { data } = useQuiz();
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('account');
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const streakStats = useMemo(() => calculateStreakStats(data), [data]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchMode = (mode) => {
    if (mode === appMode) return;
    setAppMode(mode);
    if (mode === 'language') {
      navigate('/vocab');
    } else {
      navigate('/');
    }
  };

  const openSettingsTab = (tab) => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.full_name || profile?.email || 'Người dùng';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <header className="relative sticky top-0 z-20 bg-[#fbfbfa] dark:bg-[#0c0f17] border-b border-slate-200/80 dark:border-slate-800/80 py-3.5 mb-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Logo & Version */}
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

          {/* Mobile right controls */}
          <div className="sm:hidden flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-[11px] font-bold text-amber-700 dark:text-amber-300"
              title="Chuỗi ngày học liên tiếp"
            >
              🔥 {streakStats.currentStreak}
            </span>
            <button
              type="button"
              onClick={() => openSettingsTab('account')}
              className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Cài đặt tài khoản"
            >
              <IconSettings className="w-4 h-4" />
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
            </button>
          </div>
        </div>

        {/* Right: Streak, Dark mode & Account Dropdown */}
        <div className="hidden sm:flex items-center justify-end gap-2 sm:min-w-[180px]" ref={dropdownRef}>
          <div
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-xs font-bold text-amber-700 dark:text-amber-300"
            title="Chuỗi ngày học liên tiếp"
          >
            <span>🔥</span>
            <span>{streakStats.currentStreak}</span>
          </div>

          <button
            type="button"
            onClick={toggleDark}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs cursor-pointer"
            title={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            aria-label="Đổi giao diện Sáng/Tối"
          >
            {dark ? '☀️' : '🌙'}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
            >
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                {initials}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                {displayName}
              </span>
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg py-1.5 z-40 text-xs"
              >
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openSettingsTab('account')}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Thông tin tài khoản
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setDropdownOpen(false); navigate('/change-password'); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <IconLock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đổi mật khẩu</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openSettingsTab('appearance')}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <IconSettings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cài đặt</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                  >
                    <IconShield className="w-3.5 h-3.5" />
                    <span>Quản trị hệ thống</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
        dark={dark}
        toggleDark={toggleDark}
        ttsMuted={ttsMuted}
        toggleTts={toggleTts}
        fontSizeState={fontSizeState}
        onOpenChangelog={() => { setIsSettingsOpen(false); setIsChangelogOpen(true); }}
      />
      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
    </header>
  );
}
