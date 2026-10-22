import React, { useState, useEffect, useRef } from 'react';
import { HIGHLIGHT_COLORS, TEXT_COLORS } from './FormattedText';

export default function TextFormatMenu({
  isOpen,
  position,
  selectedText,
  onApplyFormat,
  onClose
}) {
  const menuRef = useRef(null);
  const [activeSubMenu, setActiveSubMenu] = useState(null); // 'highlight' | 'color' | null

  useEffect(() => {
    if (!isOpen) {
      setActiveSubMenu(null);
      return;
    }

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeSubMenu) {
          setActiveSubMenu(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeSubMenu, onClose]);

  if (!isOpen || !position) return null;

  const menuWidth = 260;
  const left = Math.max(12, Math.min(position.x - 130, window.innerWidth - menuWidth - 16));
  // Position above the click if space permits, otherwise below
  const isAbove = position.y > 60;
  const top = isAbove ? position.y - 46 : position.y + 12;

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-[9999] flex items-center gap-0.5 px-1.5 py-1 bg-slate-900/95 dark:bg-slate-950/95 text-slate-200 border border-slate-700/80 shadow-xl shadow-black/30 rounded-xl backdrop-blur-md select-none text-xs transition-all animate-in fade-in zoom-in-95 duration-100"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Bold */}
      <button
        type="button"
        onClick={() => onApplyFormat('bold')}
        title="In đậm (Ctrl+B)"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => onApplyFormat('italic')}
        title="In nghiêng (Ctrl+I)"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>

      {/* Underline */}
      <button
        type="button"
        onClick={() => onApplyFormat('underline')}
        title="Gạch chân (Ctrl+U)"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v6a6 6 0 0 0 12 0V4" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        onClick={() => onApplyFormat('strike')}
        title="Gạch ngang"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4H9a3 3 0 0 0-2.83 4" />
          <path d="M14 12a4 4 0 0 1 0 8H6" />
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      </button>

      {/* Subtle Divider */}
      <div className="w-px h-3.5 bg-slate-700/80 mx-1" />

      {/* Highlight Trigger & Submenu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setActiveSubMenu(prev => prev === 'highlight' ? null : 'highlight')}
          title="Tô dạ quang"
          className={`h-7 px-1.5 flex items-center gap-1 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95 ${
            activeSubMenu === 'highlight' ? 'bg-slate-800 text-amber-300' : 'hover:bg-slate-800'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 11-6 6v3h3l6-6" />
            <path d="m22 7-4.5-4.5a1.5 1.5 0 0 0-2.12 0l-2.12 2.12 6.62 6.62 2.12-2.12a1.5 1.5 0 0 0 0-2.12Z" />
          </svg>
          <span className="w-2 h-2 rounded-full bg-amber-400" />
        </button>

        {activeSubMenu === 'highlight' && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onApplyFormat('highlight', c.hex);
                  setActiveSubMenu(null);
                }}
                title={c.name}
                className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: c.dot }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text Color Trigger & Submenu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setActiveSubMenu(prev => prev === 'color' ? null : 'color')}
          title="Màu chữ"
          className={`h-7 px-1.5 flex items-center gap-1 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95 ${
            activeSubMenu === 'color' ? 'bg-slate-800 text-purple-300' : 'hover:bg-slate-800'
          }`}
        >
          <span className="font-serif font-bold text-xs leading-none">A</span>
          <span className="w-2 h-2 rounded-full bg-purple-400" />
        </button>

        {activeSubMenu === 'color' && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            {TEXT_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onApplyFormat('color', c.color);
                  setActiveSubMenu(null);
                }}
                title={c.name}
                className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Subtle Divider */}
      <div className="w-px h-3.5 bg-slate-700/80 mx-1" />

      {/* Clear Format */}
      <button
        type="button"
        onClick={() => onApplyFormat('clear')}
        title="Xóa định dạng"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer active:scale-95"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
          <path d="M22 21H7" />
          <path d="m5 11 9 9" />
        </svg>
      </button>
    </div>
  );
}
