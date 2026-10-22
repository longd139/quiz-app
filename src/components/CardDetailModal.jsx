import React from 'react';
import { IconSpeaker } from './Icons';
import { speakWord } from '../lib/tts';
import { getBadgeColor } from '../data/badgeColors';
import FormattedText, { stripFormatting } from './FormattedText';

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
  onApplyToForm
}) {
  if (!isOpen || !card) return null;

  const badge = getBadgeColor(card.badgeColor, card.partOfSpeech);
  const examplesList = Array.isArray(card.examples) && card.examples.length > 0
    ? card.examples
    : (card.example ? [card.example] : []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Chi tiết từ vựng đã có
            </span>
            {card._deckName && (
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                Vị trí: <strong className="font-semibold">{card._deckName}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg w-6 h-6 flex items-center justify-center rounded cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Word Hero */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {card.term}
              </h3>
              <button
                type="button"
                onClick={() => speakWord(card.term, 'en-US')}
                className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors cursor-pointer"
                title="Nghe phát âm"
              >
                <IconSpeaker className="w-4 h-4" />
              </button>
            </div>

            {card.partOfSpeech && (
              <span className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold ${badge.bg} ${badge.text} ${badge.border}`}>
                {card.partOfSpeech}
              </span>
            )}
          </div>

          {card.phonetic && (
            <p className="text-xs font-mono text-purple-600 dark:text-purple-400 font-medium">
              {card.phonetic}
            </p>
          )}
        </div>

        {/* Meaning */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Định nghĩa
          </label>
          <div className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 leading-relaxed">
            {card.meaning}
          </div>
        </div>

        {/* Image if present */}
        {card.image && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Ảnh minh họa
            </label>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
              <img
                src={card.image}
                alt={card.term}
                className="w-full max-h-44 object-cover"
              />
            </div>
          </div>
        )}

        {/* Examples */}
        {examplesList.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Ví dụ ({examplesList.length} câu)
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {examplesList.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300 font-serif flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-purple-600 dark:text-purple-400 font-sans font-bold text-xs select-none">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <FormattedText text={ex} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakWord(stripFormatting(ex), 'en-US')}
                    className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer shrink-0"
                    title="Đọc câu ví dụ"
                  >
                    <IconSpeaker className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note if present */}
        {card.note && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Ghi chú
            </label>
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
              {card.note}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          {onApplyToForm && (
            <button
              type="button"
              onClick={() => {
                onApplyToForm(card);
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              Lấy dữ liệu từ này
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
