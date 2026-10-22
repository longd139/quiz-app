import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createVocabCard } from '../data/storage';
import { uploadToCloudinary, getCloudinaryConfig } from '../lib/cloudinary';
import { IconImage, IconPlus, IconEdit, IconTrash } from './Icons';
import { BADGE_COLORS, getAllPosList, saveCustomPos, deletePos, updateCustomPos, getBadgeColor, getColorForPos, savePosColor } from '../data/badgeColors';
import FormattedText, { parseExampleHtmlLines, convertMarkdownToHtml, HIGHLIGHT_COLORS, TEXT_COLORS } from './FormattedText';
import TextFormatMenu from './TextFormatMenu';
import CardDetailModal from './CardDetailModal';
import { useQuiz } from '../App';

export default function CreateFlashcardModal({ deck, isOpen, onClose, onSaveCard, editingCard = null }) {
  const quizContext = useQuiz();
  const vocabDecks = quizContext?.data?.vocabDecks || [];

  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewCardTarget, setPreviewCardTarget] = useState(null); // card to inspect in popup

  // Expanded fields
  const [image, setImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadWarning, setUploadWarning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [badgeColor, setBadgeColor] = useState(() => getColorForPos('noun', 'emerald'));
  const [phonetic, setPhonetic] = useState('');
  const [examplesHtml, setExamplesHtml] = useState('');
  const [note, setNote] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  const posDropdownRef = useRef(null);
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [formatMenu, setFormatMenu] = useState(null); // { x, y, text }

  // Custom Part of Speech list, dropdown and modal state
  const [posList, setPosList] = useState(() => getAllPosList());
  const [isOpenPosDropdown, setIsOpenPosDropdown] = useState(false);
  const [showCreatePosModal, setShowCreatePosModal] = useState(false);
  const [editingPosTarget, setEditingPosTarget] = useState(null); // null = new, string = editing
  const [newPosName, setNewPosName] = useState('');
  const [newPosColor, setNewPosColor] = useState('purple');
  const [newPosError, setNewPosError] = useState('');

  useEffect(() => {
    function handleClickOutside(event) {
      if (posDropdownRef.current && !posDropdownRef.current.contains(event.target)) {
        setIsOpenPosDropdown(false);
      }
    }
    if (isOpenPosDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpenPosDropdown]);

  const resetForm = useCallback(() => {
    setTerm('');
    setMeaning('');
    setImage('');
    setPartOfSpeech('');
    setBadgeColor(getColorForPos('noun', 'emerald'));
    setPhonetic('');
    setExamplesHtml('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setNote('');
    setErrorMsg('');
    setIsOpenPosDropdown(false);
    setFormatMenu(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handlePosChange = (newPos) => {
    setPartOfSpeech(newPos);
    if (newPos.trim()) {
      const fixedColor = getColorForPos(newPos);
      setBadgeColor(fixedColor);
    }
  };

  const handleOpenCreatePos = () => {
    setEditingPosTarget(null);
    setNewPosName('');
    setNewPosColor('purple');
    setNewPosError('');
    setShowCreatePosModal(true);
    setIsOpenPosDropdown(false);
  };

  const handleOpenEditPos = (e, pos) => {
    e.stopPropagation();
    setEditingPosTarget(pos);
    setNewPosName(pos);
    setNewPosColor(getColorForPos(pos));
    setNewPosError('');
    setShowCreatePosModal(true);
    setIsOpenPosDropdown(false);
  };

  const handleDeletePos = (e, posToDelete) => {
    e.stopPropagation();
    if (window.confirm(`Xóa loại từ "${posToDelete}" khỏi danh sách?`)) {
      deletePos(posToDelete);
      const updated = getAllPosList();
      setPosList(updated);
      if (partOfSpeech.toLowerCase() === posToDelete.toLowerCase()) {
        setPartOfSpeech('');
      }
    }
  };

  const handleSavePos = (e) => {
    if (e) e.preventDefault();
    const trimmed = newPosName.trim();
    if (!trimmed) {
      setNewPosError('Vui lòng nhập tên loại từ');
      return;
    }

    if (editingPosTarget) {
      updateCustomPos(editingPosTarget, trimmed, newPosColor);
      if (partOfSpeech.toLowerCase() === editingPosTarget.toLowerCase()) {
        setPartOfSpeech(trimmed);
        setBadgeColor(newPosColor);
      }
    } else {
      saveCustomPos(trimmed, newPosColor);
      setPartOfSpeech(trimmed);
      setBadgeColor(newPosColor);
    }

    setPosList(getAllPosList());
    setNewPosName('');
    setEditingPosTarget(null);
    setNewPosError('');
    setShowCreatePosModal(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    if (editingCard) {
      setTerm(editingCard.term || '');
      setMeaning(editingCard.meaning || '');
      setImage(editingCard.image || '');
      const pos = editingCard.partOfSpeech || '';
      setPartOfSpeech(pos);
      setBadgeColor(getColorForPos(pos, editingCard.badgeColor || 'emerald'));
      setPhonetic(editingCard.phonetic || '');
      const rawExs = Array.isArray(editingCard.examples) && editingCard.examples.length > 0
        ? editingCard.examples
        : (editingCard.example ? [editingCard.example] : []);
      const initialHtml = rawExs.map(ex => {
        const trimmed = ex.trim();
        const withDash = trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
        return `<div>${convertMarkdownToHtml(withDash)}</div>`;
      }).join('');
      setExamplesHtml(initialHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = initialHtml;
      }
      setNote(editingCard.note || '');
      setIsExpanded(Boolean(editingCard.image || editingCard.partOfSpeech || editingCard.phonetic || initialHtml || editingCard.note));
    } else {
      resetForm();
    }
  }, [editingCard, isOpen, resetForm]);

  // Collect all cards across current deck and other user decks
  const allCardsList = useMemo(() => {
    if (!isOpen || !deck) return [];
    const list = [];
    const currentCards = Array.isArray(deck?.cards) ? deck.cards : [];
    currentCards.forEach(c => {
      if (c && c.term) {
        list.push({ ...c, _deckName: deck?.name || 'Bộ từ hiện tại', _isCurrentDeck: true });
      }
    });

    const allDecks = Array.isArray(vocabDecks) ? vocabDecks : [];
    allDecks.forEach(d => {
      if (d && Array.isArray(d.cards)) {
        d.cards.forEach(c => {
          if (c && c.term && !list.some(existing => existing.id === c.id)) {
            list.push({ ...c, _deckName: d.name || 'Bộ từ khác', _isCurrentDeck: false });
          }
        });
      }
    });

    return list;
  }, [isOpen, deck, vocabDecks]);

  // Find duplicate cards as user types (only exact match)
  const duplicateMatches = useMemo(() => {
    if (!isOpen || !deck) return [];
    const query = term.trim().toLowerCase();
    if (!query) return [];

    return allCardsList.filter(c => {
      if (editingCard && editingCard.id === c.id) return false;
      const cardTerm = (c.term || '').trim().toLowerCase();
      return cardTerm === query;
    });
  }, [isOpen, deck, term, allCardsList, editingCard]);

  // Apply existing card's data into current creation form
  const handleApplyExistingCard = (targetCard) => {
    if (!targetCard) return;
    setTerm(targetCard.term || '');
    setMeaning(targetCard.meaning || '');
    setPhonetic(targetCard.phonetic || '');
    const pos = targetCard.partOfSpeech || '';
    setPartOfSpeech(pos);
    setBadgeColor(getColorForPos(pos, targetCard.badgeColor || 'emerald'));
    setImage(targetCard.image || '');
    const rawExs = Array.isArray(targetCard.examples) && targetCard.examples.length > 0
      ? targetCard.examples
      : (targetCard.example ? [targetCard.example] : []);
    const initialHtml = rawExs.map(ex => {
      const trimmed = ex.trim();
      const withDash = trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
      return `<div>${convertMarkdownToHtml(withDash)}</div>`;
    }).join('');
    setExamplesHtml(initialHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
    setNote(targetCard.note || '');
    setIsExpanded(true);
    setPreviewCardTarget(null);
  };

  if (!isOpen || !deck) return null;

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh có kích thước dưới 5MB');
      return;
    }

    // Set immediate preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result || '');
    };
    reader.readAsDataURL(file);

    const cfg = getCloudinaryConfig();
    if (cfg.cloudName) {
      setIsUploadingImage(true);
      setUploadWarning('');
      try {
        const cloudUrl = await uploadToCloudinary(file);
        setImage(cloudUrl);
      } catch (err) {
        console.warn('Upload warning:', err);
        setUploadWarning('Không thể tải ảnh lên máy chủ, đã lưu ảnh tạm cục bộ.');
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const isEditorEmpty = !examplesHtml || examplesHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;

  const handleEditorInput = (e) => {
    setExamplesHtml(e.currentTarget.innerHTML);
  };

  const handleEditorContextMenu = (e) => {
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';
    if (text && text.trim().length > 0) {
      e.preventDefault();
      try {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      } catch (err) {}
      setFormatMenu({
        x: e.clientX,
        y: e.clientY,
        text: text.trim()
      });
    }
  };

  const handleApplyFormat = (type, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    if (savedRangeRef.current) {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      } catch (err) {}
    }

    if (type === 'bold') {
      document.execCommand('bold', false, null);
    } else if (type === 'italic') {
      document.execCommand('italic', false, null);
    } else if (type === 'underline') {
      document.execCommand('underline', false, null);
    } else if (type === 'strike') {
      document.execCommand('strikeThrough', false, null);
    } else if (type === 'highlight') {
      document.execCommand('hiliteColor', false, value || '#fef08a');
    } else if (type === 'color') {
      document.execCommand('foreColor', false, value || '#ef4444');
    } else if (type === 'clear') {
      document.execCommand('removeFormat', false, null);
    }

    setExamplesHtml(editor.innerHTML);
    setFormatMenu(null);
  };

  const handleEditorKeyDown = (e) => {
    requestAnimationFrame(() => {
      if (editorRef.current) {
        setExamplesHtml(editorRef.current.innerHTML);
      }
    });
  };

  const buildCard = () => {
    if (!term.trim()) {
      setErrorMsg('Vui lòng nhập từ mới.');
      return null;
    }
    if (!meaning.trim()) {
      setErrorMsg('Vui lòng nhập định nghĩa.');
      return null;
    }

    const exLines = parseExampleHtmlLines(examplesHtml);
    const base = editingCard || createVocabCard();

    const targetPos = partOfSpeech.trim();
    const finalColor = targetPos ? (badgeColor || getColorForPos(targetPos, 'emerald')) : '';
    if (targetPos) {
      savePosColor(targetPos, finalColor);
    }

    return {
      ...base,
      term: term.trim(),
      meaning: meaning.trim(),
      phonetic: phonetic.trim(),
      partOfSpeech: targetPos,
      badgeColor: finalColor,
      example: exLines[0] || '',
      examples: exLines,
      image,
      note: note.trim()
    };
  };

  const handleSaveAndContinue = (e) => {
    e.preventDefault();
    const newCard = buildCard();
    if (!newCard) return;

    onSaveCard(newCard, false); // false = don't close
    resetForm();
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newCard = buildCard();
    if (!newCard) return;

    onSaveCard(newCard, true); // true = close
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {editingCard ? 'Chỉnh sửa flashcard' : 'Tạo flashcard'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              List từ: <strong className="text-slate-800 dark:text-slate-200">{deck.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60">
            {errorMsg}
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Từ mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Từ mới <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              autoFocus
              value={term}
              onChange={e => { setTerm(e.target.value); setErrorMsg(''); }}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleSave(e);
                }
              }}
              placeholder="Nhập từ mới hoặc nhiều từ vựng (nhấn Enter để xuống dòng)..."
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400 transition-all resize-y min-h-[46px]"
            />

            {/* Duplicate Word Matching List */}
            {duplicateMatches.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl border border-amber-200/90 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Từ vựng này đã có trong danh sách:</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {duplicateMatches.map((card, idx) => (
                    <div
                      key={card.id || idx}
                      className="flex items-center justify-between gap-3 p-2 px-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-900/60"
                    >
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {card.term}
                      </span>

                      <button
                        type="button"
                        onClick={() => setPreviewCardTarget(card)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Định nghĩa */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Định nghĩa: <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={meaning}
              onChange={e => { setMeaning(e.target.value); setErrorMsg(''); }}
              placeholder="Nhập định nghĩa, nghĩa tiếng Việt của từ..."
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400 transition-all resize-y"
            />
          </div>

          {/* Expand/Collapse Accordion Button (Study4 Style) */}
          <div>
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-slate-700 bg-indigo-50/50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Thêm phiên âm, ví dụ, ảnh, ghi chú ...</span>
              <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Expanded Fields */}
          {isExpanded && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
              {/* Ảnh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ảnh minh họa
                </label>

                {/* Hidden real file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  disabled={isUploadingImage}
                  onChange={handleImageChange}
                  className="hidden"
                />

                {/* State 1: Uploading - Loading spinner */}
                {isUploadingImage && (
                  <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20 text-center space-y-2.5 transition-all">
                    <div className="w-7 h-7 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        Đang tải ảnh lên...
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Vui lòng đợi trong giây lát
                      </p>
                    </div>
                  </div>
                )}

                {/* State 2: Has Image - Preview Card */}
                {!isUploadingImage && image && (
                  <div className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shadow-2xs">
                    <img
                      src={image}
                      alt="Ảnh xem trước"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Đã tải ảnh lên thành công</span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          Đổi ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImage('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* State 3: Empty - Modern upload area */}
                {!isUploadingImage && !image && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-950/50 hover:bg-indigo-50/30 dark:hover:bg-slate-900/40 rounded-xl p-4 text-center cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/60 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center mx-auto mb-2 transition-colors">
                      <IconImage className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Bấm để chọn ảnh minh họa
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Hỗ trợ JPG, PNG, WEBP &bull; Tối đa 5MB
                    </p>
                  </div>
                )}

                {uploadWarning && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                    {uploadWarning}
                  </p>
                )}
              </div>

              {/* Loại từ (Select dropdown có Sửa & Xóa) & Phiên âm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Custom Select Box cho Loại từ */}
                <div className="space-y-1.5" ref={posDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Loại từ
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenCreatePos}
                      className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Tạo loại từ mới"
                    >
                      <IconPlus className="w-3 h-3" />
                      <span>Tạo mới</span>
                    </button>
                  </div>

                  <div className="relative">
                    {/* Ô Select bấm vào để mở danh sách */}
                    <button
                      type="button"
                      onClick={() => setIsOpenPosDropdown(prev => !prev)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-slate-950 text-left flex items-center justify-between transition-all cursor-pointer ${
                        isOpenPosDropdown
                          ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {partOfSpeech.trim() ? (
                          (() => {
                            const badge = getBadgeColor(badgeColor, partOfSpeech);
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-semibold ${badge.bg} ${badge.text} ${badge.border}`}>
                                {partOfSpeech}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-- Chọn loại từ --</span>
                        )}
                      </div>

                      <div className="flex items-center text-slate-400">
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isOpenPosDropdown ? 'rotate-180 text-purple-600' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </button>

                    {/* Menu Sổ xuống */}
                    {isOpenPosDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 space-y-0.5 max-h-56 overflow-y-auto animate-fadeIn">
                        {/* Action: Tạo mới */}
                        <button
                          type="button"
                          onClick={handleOpenCreatePos}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                            <IconPlus className="w-3 h-3" />
                          </span>
                          <span>Tạo loại từ mới</span>
                        </button>

                        {/* Option: Bỏ chọn / Để trống */}
                        {partOfSpeech.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setPartOfSpeech('');
                              setBadgeColor('');
                              setIsOpenPosDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="w-5 h-5 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center font-bold text-[10px]">
                              ✕
                            </span>
                            <span>Bỏ chọn (Để trống loại từ)</span>
                          </button>
                        )}

                        <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                        {posList.length === 0 ? (
                          <div className="py-3 text-center text-xs text-slate-400">
                            Chưa có loại từ nào
                          </div>
                        ) : (
                          posList.map(pos => {
                            const chipColor = getBadgeColor(null, pos);
                            const isSelected = partOfSpeech.toLowerCase() === pos.toLowerCase();
                            return (
                              <div
                                key={pos}
                                onClick={() => {
                                  handlePosChange(pos);
                                  setIsOpenPosDropdown(false);
                                }}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer group transition-colors ${
                                  isSelected
                                    ? 'bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold ${chipColor.bg} ${chipColor.text} ${chipColor.border}`}>
                                    {pos}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {/* Nút Sửa */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditPos(e, pos)}
                                    className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 rounded-md transition-colors cursor-pointer"
                                    title={`Sửa loại từ "${pos}"`}
                                  >
                                    <IconEdit className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Nút Xóa */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeletePos(e, pos)}
                                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 rounded-md transition-colors cursor-pointer"
                                    title={`Xóa loại từ "${pos}"`}
                                  >
                                    <IconTrash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phiên âm */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phiên âm
                  </label>
                  <input
                    type="text"
                    value={phonetic}
                    onChange={e => setPhonetic(e.target.value)}
                    placeholder="/rɪˈɡreʃ.ən/"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400 transition-all"
                  />
                </div>
              </div>

              {/* Ví dụ (tối đa 10 câu) */}
              <div>
                {/* Minimal Header & Quick Format Toolbar */}
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ví dụ (tối đa 10 câu)
                  </label>

                  <div className="flex items-center gap-1">
                    {/* Inline Quick Action Icons */}
                    <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => handleApplyFormat('bold')}
                        title="In đậm (Ctrl+B)"
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFormat('italic')}
                        title="In nghiêng (Ctrl+I)"
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="19" y1="4" x2="10" y2="4" />
                          <line x1="14" y1="20" x2="5" y2="20" />
                          <line x1="15" y1="4" x2="9" y2="20" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFormat('underline')}
                        title="Gạch chân (Ctrl+U)"
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 4v6a6 6 0 0 0 12 0V4" />
                          <line x1="4" y1="20" x2="20" y2="20" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFormat('strike')}
                        title="Gạch ngang"
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 4H9a3 3 0 0 0-2.83 4" />
                          <path d="M14 12a4 4 0 0 1 0 8H6" />
                          <line x1="4" y1="12" x2="20" y2="12" />
                        </svg>
                      </button>
                      <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => handleApplyFormat('highlight', 'yellow')}
                        title="Tô dạ quang vàng"
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFormat('clear')}
                        title="Xóa định dạng"
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-400 transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                          <path d="M22 21H7" />
                        </svg>
                      </button>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {parseExampleHtmlLines(examplesHtml).length}/10
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onContextMenu={handleEditorContextMenu}
                    onKeyDown={handleEditorKeyDown}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-serif bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400 transition-all min-h-[96px] max-h-[220px] overflow-y-auto leading-relaxed"
                  />
                  {isEditorEmpty && (
                    <div
                      onClick={() => editorRef.current?.focus()}
                      className="absolute top-2.5 left-3.5 right-3.5 text-xs text-slate-400 dark:text-slate-500 font-serif pointer-events-none whitespace-pre-line leading-relaxed select-none"
                    >
                      {"Nhập mỗi câu trên một dòng (hoặc bắt đầu bằng dấu gạch ngang -):\n- He is preparing for the exam.\n- Software testing is an important phase."}
                    </div>
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <span>Tách câu bằng dấu <code className="text-purple-600 dark:text-purple-400 font-mono">-</code> hoặc xuống dòng</span>
                  <span>Bôi đen &amp; chuột phải để mở thanh format</span>
                </div>

                {/* Live Preview */}
                {parseExampleHtmlLines(examplesHtml).length > 0 && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-2 animate-fadeIn">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Xem trước ({parseExampleHtmlLines(examplesHtml).length} câu)
                    </div>
                    <div className="space-y-1.5">
                      {parseExampleHtmlLines(examplesHtml).map((ex, idx) => (
                        <div key={idx} className="text-xs text-slate-700 dark:text-slate-300 font-serif flex items-start gap-2">
                          <span className="text-purple-600 dark:text-purple-400 font-sans font-semibold text-[11px] select-none mt-0.5">
                            {idx + 1}.
                          </span>
                          <div className="flex-1 leading-relaxed">
                            <FormattedText text={ex} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400 transition-all resize-y"
                />
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
            >
              Hủy
            </button>
            {!editingCard && (
              <button
                type="button"
                onClick={handleSaveAndContinue}
                className="px-4 py-2 bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Lưu & tiếp tục tạo
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold tracking-tight cursor-pointer shadow-xs"
            >
              {editingCard ? 'Cập nhật' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Popup: Tạo loại từ mới / Chỉnh sửa loại từ & chọn màu */}
      {showCreatePosModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingPosTarget ? 'Chỉnh sửa loại từ' : 'Tạo loại từ mới'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingPosTarget
                    ? 'Chỉnh sửa tên và màu sắc nhận diện cho loại từ này.'
                    : 'Đặt tên và màu sắc nhận diện cố định cho loại từ này.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePosModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {newPosError && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/60">
                {newPosError}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Tên loại từ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên loại từ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newPosName}
                  onChange={e => {
                    setNewPosName(e.target.value);
                    setNewPosError('');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSavePos(e);
                    }
                  }}
                  placeholder="Ví dụ: preposition, modal verb, cụm danh từ..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400 transition-all font-medium"
                />
              </div>

              {/* Chọn màu sắc */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Màu nhận diện:
                  </label>
                  {/* Live preview */}
                  {(() => {
                    const prevBadge = getBadgeColor(newPosColor);
                    return (
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border inline-flex items-center ${prevBadge.bg} ${prevBadge.text} ${prevBadge.border}`}>
                        {newPosName.trim() || 'preview'}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {BADGE_COLORS.map(c => {
                    const isSelected = newPosColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewPosColor(c.id)}
                        title={c.name}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                          isSelected
                            ? 'scale-120 ring-2 ring-offset-2 ring-purple-600 dark:ring-purple-400 dark:ring-offset-slate-900 shadow-xs'
                            : 'hover:scale-110 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreatePosModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSavePos}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                {editingPosTarget ? 'Cập nhật' : 'Lưu loại từ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Text Format Context Menu */}
      <TextFormatMenu
        isOpen={Boolean(formatMenu)}
        position={formatMenu}
        selectedText={formatMenu?.text || ''}
        onApplyFormat={handleApplyFormat}
        onClose={() => setFormatMenu(null)}
      />

      {/* Existing Card Detail Preview Popup Modal */}
      <CardDetailModal
        card={previewCardTarget}
        isOpen={Boolean(previewCardTarget)}
        onClose={() => setPreviewCardTarget(null)}
        onApplyToForm={handleApplyExistingCard}
      />
    </div>
  );
}
