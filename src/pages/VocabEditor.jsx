import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuiz } from '../App';
import { createVocabDeck, createVocabCard, createVocabCollection, escHtml } from '../data/storage';
import { speakWord } from '../lib/tts';
import { IconSpeaker, IconTrash, IconPlus, IconFolder, IconArrowLeft, IconEdit } from '../components/Icons';
import CreateFlashcardModal from '../components/CreateFlashcardModal';
import { getBadgeColor } from '../data/badgeColors';

export default function VocabEditor() {
  const { data, update, showToast } = useQuiz();
  const navigate = useNavigate();
  const { deckId } = useParams();

  const vocabCollections = data.vocabCollections || [];

  const [name, setName] = useState('');
  const [collectionId, setCollectionId] = useState(() => {
    return vocabCollections[0]?.id || '';
  });
  const [description, setDescription] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en-US');
  const [cards, setCards] = useState([]);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [showStudy4Modal, setShowStudy4Modal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');

  // Modal create collection
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColName, setNewColName] = useState('');

  // Load existing deck if editing
  useEffect(() => {
    if (deckId && data.vocabDecks) {
      const existing = data.vocabDecks.find(d => d.id === deckId);
      if (existing) {
        setName(existing.name || '');
        setCollectionId(existing.collectionId || (vocabCollections[0]?.id || ''));
        setDescription(existing.description || '');
        setTargetLanguage(existing.targetLanguage || 'en-US');
        setCards(existing.cards ? JSON.parse(JSON.stringify(existing.cards)) : []);
      }
    } else if (!deckId) {
      setCards([]);
      if (vocabCollections.length > 0 && !collectionId) {
        setCollectionId(vocabCollections[0].id);
      }
    }
  }, [deckId, data.vocabDecks, vocabCollections]);

  // If there are no collections yet, open create collection modal automatically
  useEffect(() => {
    if (!deckId && vocabCollections.length === 0) {
      setShowCreateColModal(true);
    }
  }, [vocabCollections.length, deckId]);

  const handleOpenCreateModal = () => {
    setEditingCardIndex(null);
    setShowStudy4Modal(true);
  };

  const handleOpenEditModal = (idx) => {
    setEditingCardIndex(idx);
    setShowStudy4Modal(true);
  };

  const handleSaveFromStudy4Modal = (savedCard, shouldClose) => {
    if (editingCardIndex !== null) {
      setCards(prev => {
        const next = [...prev];
        next[editingCardIndex] = savedCard;
        return next;
      });
      showToast(`Đã cập nhật từ "${savedCard.term}"`, 'success');
      setEditingCardIndex(null);
      setShowStudy4Modal(false);
    } else {
      setCards(prev => [...prev, savedCard]);
      showToast(`Đã thêm từ "${savedCard.term}"`, 'success');
      if (shouldClose) {
        setShowStudy4Modal(false);
      }
    }
  };

  const handleDeleteCard = (idx) => {
    setCards(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateCollection = () => {
    if (!newColName.trim()) {
      showToast('Vui lòng nhập tên bộ sưu tập từ vựng', 'error');
      return;
    }
    const newCol = createVocabCollection(newColName.trim());
    const nextCollections = [...vocabCollections, newCol];
    update({ ...data, vocabCollections: nextCollections });
    setCollectionId(newCol.id);
    setNewColName('');
    setShowCreateColModal(false);
    showToast(`Đã tạo bộ sưu tập "${newCol.name}"`, 'success');
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast('Vui lòng nhập tên bộ từ vựng', 'error');
      return;
    }
    if (!collectionId) {
      showToast('Vui lòng chọn hoặc tạo bộ sưu tập cho bộ từ vựng này', 'error');
      setShowCreateColModal(true);
      return;
    }

    const validCards = cards.filter(c => c.term.trim() || c.meaning.trim());
    if (validCards.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 từ vựng hợp lệ', 'error');
      return;
    }

    const now = new Date().toISOString();
    let nextDecks = [...(data.vocabDecks || [])];

    if (deckId) {
      nextDecks = nextDecks.map(d => {
        if (d.id === deckId) {
          return {
            ...d,
            name: name.trim(),
            collectionId,
            description: description.trim(),
            targetLanguage,
            cards: validCards,
            updatedAt: now
          };
        }
        return d;
      });
      showToast('Đã lưu thay đổi bộ từ vựng', 'success');
    } else {
      const newDeck = {
        ...createVocabDeck(name, collectionId, description, targetLanguage),
        cards: validCards
      };
      nextDecks.unshift(newDeck);
      showToast('Đã tạo bộ từ vựng mới thành công', 'success');
    }

    update({ ...data, vocabDecks: nextDecks });
    navigate('/vocab');
  };

  const handleBatchImport = () => {
    if (!batchText.trim()) return;
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const newCards = [];

    for (const line of lines) {
      let parts = [];
      if (line.includes('|')) {
        parts = line.split('|').map(s => s.trim());
      } else if (line.includes(':')) {
        parts = line.split(':').map(s => s.trim());
      } else if (line.includes(' - ')) {
        parts = line.split(' - ').map(s => s.trim());
      } else {
        parts = [line];
      }

      if (parts.length >= 2) {
        const term = parts[0];
        let phonetic = '';
        let meaning = parts[1];
        let example = '';

        if (parts.length >= 3) {
          if (parts[1].startsWith('/') || parts[1].startsWith('[')) {
            phonetic = parts[1];
            meaning = parts[2];
            example = parts[3] || '';
          } else {
            meaning = parts[1];
            example = parts[2] || '';
          }
        }

        newCards.push(createVocabCard(term, meaning, phonetic, '', example));
      }
    }

    if (newCards.length > 0) {
      const existing = cards.filter(c => c.term.trim() || c.meaning.trim());
      setCards([...existing, ...newCards]);
      showToast(`Đã thêm ${newCards.length} từ vào danh sách`, 'success');
      setBatchText('');
      setShowBatchModal(false);
    } else {
      showToast('Không nhận diện được từ nào. Vui lòng kiểm tra định dạng.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Nav Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <button
          onClick={() => navigate('/vocab')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <IconArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Thư viện</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Nhập hàng loạt
          </button>
          <button
            onClick={handleSave}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
          >
            Lưu bộ từ ({cards.length})
          </button>
        </div>
      </div>

      {/* Deck Metadata Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            Deck Configuration
          </span>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {deckId ? 'Chỉnh sửa bộ từ vựng' : 'Tạo bộ từ vựng mới'}
          </h2>
        </div>

        {/* Collection Selector */}
        <div className="bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <IconFolder className="w-3.5 h-3.5 text-slate-400" />
              <span>Bộ sưu tập từ vựng</span>
              <span className="text-rose-500">*</span>
            </label>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={collectionId}
                onChange={e => setCollectionId(e.target.value)}
                className="w-full pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 appearance-none cursor-pointer"
              >
                <option value="" disabled>-- Chọn một bộ sưu tập --</option>
                {vocabCollections.map(col => (
                  <option key={col.id} value={col.id}>{escHtml(col.name)}</option>
                ))}
              </select>
              <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateColModal(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer"
            >
              Tạo bộ sưu tập
            </button>
          </div>
        </div>

        {/* Name input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tên bộ từ vựng <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="50 Từ Vựng Tiếng Anh Giao Tiếp Hằng Ngày"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Mô tả ngắn
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Chủ đề công sở, phỏng vấn, thi chứng chỉ"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Ngôn ngữ phát âm
            </label>
            <div className="relative">
              <select
                value={targetLanguage}
                onChange={e => setTargetLanguage(e.target.value)}
                className="w-full pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 appearance-none cursor-pointer"
              >
                <option value="en-US">Tiếng Anh (Mỹ - en-US)</option>
                <option value="en-GB">Tiếng Anh (Anh - en-GB)</option>
                <option value="ja-JP">Tiếng Nhật (ja-JP)</option>
                <option value="ko-KR">Tiếng Hàn (ko-KR)</option>
                <option value="zh-CN">Tiếng Trung (zh-CN)</option>
                <option value="vi-VN">Tiếng Việt (vi-VN)</option>
              </select>
              <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards List Section - Clean preview of created cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500">
            Danh sách từ vựng ({cards.length})
          </h3>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>Tạo từ vựng</span>
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chưa có từ vựng nào trong bộ này. Nhấn nút bên dưới để bắt đầu tạo từ vựng mới.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-indigo-200 dark:border-slate-700 hover:bg-indigo-100 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Tạo từ vựng</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, idx) => (
              <div
                key={card.id || idx}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all h-full"
              >
                {/* Top Header & Main Info */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  {/* Top Bar: #Index + Term + Actions */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[170px]" title={card.term}>
                        {card.term}
                      </span>
                      {card.partOfSpeech && (() => {
                        const c = getBadgeColor(card.badgeColor, card.partOfSpeech);
                        return (
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold border shrink-0 ${c.bg} ${c.text} ${c.border}`}>
                            {card.partOfSpeech}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => speakWord(card.term, targetLanguage)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
                        title="Nghe phát âm"
                      >
                        <IconSpeaker className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(idx)}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer transition-colors"
                        title="Chỉnh sửa từ này"
                      >
                        <IconEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(idx)}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 text-xs cursor-pointer transition-colors"
                        title="Xóa thẻ"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Phonetic & Thumbnail if present */}
                  {(card.phonetic || card.image) && (
                    <div className="flex items-center justify-between gap-2">
                      {card.phonetic ? (
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {card.phonetic}
                        </span>
                      ) : <span />}
                      {card.image && (
                        <img
                          src={card.image}
                          alt={card.term}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      )}
                    </div>
                  )}

                  {/* Definition */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Định nghĩa: </span>
                    {card.meaning}
                  </p>

                  {/* Examples */}
                  {((Array.isArray(card.examples) && card.examples.length > 0) ? card.examples : (card.example ? [card.example] : [])).length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-800">
                      {((Array.isArray(card.examples) && card.examples.length > 0) ? card.examples : [card.example]).slice(0, 2).map((ex, i) => (
                        <p key={i} className="text-[11px] text-slate-600 dark:text-slate-400 italic font-serif flex items-start gap-1.5 line-clamp-2">
                          <span className="text-slate-400 font-mono not-italic select-none">•</span>
                          <span>{ex}</span>
                        </p>
                      ))}
                      {((Array.isArray(card.examples) && card.examples.length > 0) ? card.examples : [card.example]).length > 2 && (
                        <p className="text-[10px] text-slate-400 font-sans">
                          +{((Array.isArray(card.examples) && card.examples.length > 0) ? card.examples : [card.example]).length - 2} ví dụ khác
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Note if present */}
                {card.note && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-400 line-clamp-1">
                    <span className="font-semibold">Ghi chú:</span> {card.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Collection */}
      {showCreateColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Tạo Bộ sưu tập mới
              </h3>
              {vocabCollections.length > 0 && (
                <button
                  onClick={() => setShowCreateColModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhập tên bộ sưu tập riêng để phân loại các bộ từ vựng (ví dụ: <em>IELTS Writing, Tiếng Anh Giao Tiếp, CNTT Testing</em>):
            </p>

            <input
              type="text"
              autoFocus
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateCollection(); }}
              placeholder="Tên bộ sưu tập..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-slate-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {vocabCollections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateColModal(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
              )}
              <button
                type="button"
                onClick={handleCreateCollection}
                className="px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tạo & Chọn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Nhập danh sách từ vựng
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste danh sách từ vựng theo cấu trúc: <code>Từ vựng | Nghĩa</code> hoặc <code>Từ vựng | /phiên âm/ | Nghĩa | Ví dụ</code>
            </p>

            <textarea
              rows={8}
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
              placeholder={`Persevere | Kiên trì, bền chí\nEloquent | Lưu loát, hùng biện\nRefactoring | /riːˈfæk.tər.ɪŋ/ | Tái cấu trúc mã | Code refactoring improves quality`}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleBatchImport}
                className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Nhập vào danh sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Flashcard Modal (Study4 Style) */}
      {showStudy4Modal && (
        <CreateFlashcardModal
          deck={{ name: name || 'Bộ từ đang tạo' }}
          isOpen={showStudy4Modal}
          editingCard={editingCardIndex !== null ? cards[editingCardIndex] : null}
          onClose={() => {
            setShowStudy4Modal(false);
            setEditingCardIndex(null);
          }}
          onSaveCard={handleSaveFromStudy4Modal}
        />
      )}
    </div>
  );
}
