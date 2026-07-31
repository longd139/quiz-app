import { useState, useEffect, useCallback } from 'react';

const KEY = 'quiz_dark_mode';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved !== null) return saved === 'true';
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem(KEY, String(dark)); } catch {}
  }, [dark]);

  const toggle = useCallback(() => setDark(prev => !prev), []);

  return { dark, toggle };
}
