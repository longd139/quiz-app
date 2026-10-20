import { useState, useEffect, useCallback } from 'react';

const KEY = 'quiz_font_size';
export const DEFAULT_FONT_SIZE = 100; // 100%
export const MIN_FONT_SIZE = 85;
export const MAX_FONT_SIZE = 130;

export const FONT_SIZE_PRESETS = [
  { id: 'sm', label: 'Nhỏ', percent: 90, desc: '90%' },
  { id: 'md', label: 'Vừa', percent: 100, desc: '100%' },
  { id: 'lg', label: 'Lớn', percent: 110, desc: '110%' },
  { id: 'xl', label: 'Rất lớn', percent: 120, desc: '120%' },
];

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_FONT_SIZE && val <= MAX_FONT_SIZE) {
          return val;
        }
      }
    } catch {
      // localStorage có thể bị chặn ở incognito mode
    }
    return DEFAULT_FONT_SIZE;
  });

  useEffect(() => {
    try {
      document.documentElement.style.fontSize = `${fontSize}%`;
      localStorage.setItem(KEY, String(fontSize));
    } catch {
      // bỏ qua lỗi
    }
  }, [fontSize]);

  const setFontSize = useCallback((val) => {
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, val));
    setFontSizeState(clamped);
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSizeState(prev => Math.min(MAX_FONT_SIZE, prev + 5));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSizeState(prev => Math.max(MIN_FONT_SIZE, prev - 5));
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSizeState(DEFAULT_FONT_SIZE);
  }, []);

  return {
    fontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    presets: FONT_SIZE_PRESETS,
    min: MIN_FONT_SIZE,
    max: MAX_FONT_SIZE,
  };
}
