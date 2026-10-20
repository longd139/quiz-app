import { useState, useRef, useEffect, useCallback } from 'react';
import { createVocabCard } from '../data/storage';
import { uploadToCloudinary, getCloudinaryConfig } from '../lib/cloudinary';
import { IconImage, IconPlus, IconEdit, IconTrash } from './Icons';
import { BADGE_COLORS, getAllPosList, saveCustomPos, deletePos, updateCustomPos, getBadgeColor, getColorForPos, savePosColor } from '../data/badgeColors';

export default function CreateFlashcardModal({ deck, isOpen, onClose, onSaveCard, editingCard = null }) {
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Expanded fields
  const [image, setImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadWarning, setUploadWarning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [badgeColor, setBadgeColor] = useState(() => getColorForPos('noun', 'emerald'));
  const [phonetic, setPhonetic] = useState('');
  const [examplesText, setExamplesText] = useState('');
  const [note, setNote] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  const posDropdownRef = useRef(null);

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
    setExamplesText('');
    setNote('');
    setErrorMsg('');
    setIsOpenPosDropdown(false);
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
      const exLines = rawExs.map(ex => ex.trim().startsWith('-') ? ex.trim() : `- ${ex.trim()}`).join('\n');
      setExamplesText(exLines);
      setNote(editingCard.note || '');
      setIsExpanded(Boolean(editingCard.image || editingCard.partOfSpeech || editingCard.phonetic || exLines || editingCard.note));
    } else {
      resetForm();
    }
  }, [editingCard, isOpen, resetForm]);

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

  const parseExampleLines = (text) => {
    if (!text || !text.trim()) return [];
    let lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 1 && (text.includes(' - ') || text.startsWith('- '))) {
      lines = text.split(/\s*[-•]\s+/).map(s => s.trim()).filter(Boolean);
    }
    return lines
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 10);
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

    const exLines = parseExampleLines(examplesText);
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ví dụ (tối đa 10 câu)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {parseExampleLines(examplesText).length}/10 câu
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={examplesText}
                  onChange={e => setExamplesText(e.target.value)}
                  placeholder={"Nhập mỗi câu trên một dòng (hoặc bắt đầu bằng dấu gạch ngang -):\n- He is preparing for the exam.\n- Software testing is an important phase."}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-serif bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-purple-400 dark:focus:ring-purple-400 transition-all resize-y leading-relaxed"
                />
                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                  <span className="text-purple-600 dark:text-purple-400 shrink-0 text-xs mt-0.5 select-none">💡</span>
                  <p className="m-0 flex-1">
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">Cách tách câu:</strong> Xuống dòng hoặc thêm <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10.5px] text-purple-600 dark:text-purple-400 font-bold shadow-2xs mx-0.5">-</code> ở đầu câu để tự động tách thành các câu riêng biệt.
                  </p>
                </div>
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
    </div>
  );
}
