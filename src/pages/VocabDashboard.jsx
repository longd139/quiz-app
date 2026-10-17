import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { escHtml, getVocabCollectionName, createVocabCollection } from '../data/storage';
import { IconCards, IconTarget, IconEdit, IconTrash, IconPlus, IconFolder, IconSearch } from '../components/Icons';
import CreateFlashcardModal from '../components/CreateFlashcardModal';

export default function VocabDashboard() {
  const { data, update, showConfirm, showToast } = useQuiz();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterColId, setFilterColId] = useState('');
  const [showManageCols, setShowManageCols] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [createModalDeck, setCreateModalDeck] = useState(null);

  const vocabDecks = data?.vocabDecks || [];
  const vocabCollections = data?.vocabCollections || [];
  const vocabStats = data?.vocabStats || {};

  const filteredDecks = useMemo(() => {
    let list = vocabDecks.filter(Boolean);
    if (filterColId) {
      list = list.filter(d => d.collectionId === filterColId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [vocabDecks, filterColId, search]);

  const handleDelete = (deckId, name) => {
    showConfirm(`Bạn có chắc muốn xóa bộ từ vựng "${name}"? Thao tác này không thể hoàn tác.`, () => {
      const nextDecks = vocabDecks.filter(d => d.id !== deckId);
      update({ ...data, vocabDecks: nextDecks });
    });
  };

  const handleCreateCol = () => {
    if (!newColName.trim()) {
      showToast('Vui lòng nhập tên bộ sưu tập', 'error');
      return;
    }
    const newCol = createVocabCollection(newColName.trim());
    update({ ...data, vocabCollections: [...vocabCollections, newCol] });
    setNewColName('');
    showToast(`Đã thêm bộ sưu tập "${newCol.name}"`, 'success');
  };

  const handleDeleteCol = (colId, colName) => {
    const deckCount = vocabDecks.filter(d => d.collectionId === colId).length;
    if (deckCount > 0) {
      showConfirm(`Bộ sưu tập "${colName}" có ${deckCount} bộ từ. Xóa bộ sưu tập này, các bộ từ sẽ chuyển sang "Chưa phân loại". Tiếp tục?`, () => {
        const nextCols = vocabCollections.filter(c => c.id !== colId);
        const nextDecks = vocabDecks.map(d => d.collectionId === colId ? { ...d, collectionId: null } : d);
        update({ ...data, vocabCollections: nextCols, vocabDecks: nextDecks });
        if (filterColId === colId) setFilterColId('');
      });
    } else {
      showConfirm(`Xóa bộ sưu tập "${colName}"?`, () => {
        const nextCols = vocabCollections.filter(c => c.id !== colId);
        update({ ...data, vocabCollections: nextCols });
        if (filterColId === colId) setFilterColId('');
      });
    }
  };

  const handleSaveFlashcard = (newCard, shouldClose) => {
    if (!createModalDeck) return;
    const nextDecks = vocabDecks.map(d => {
      if (d.id === createModalDeck.id) {
        return {
          ...d,
          cards: [...(d.cards || []), newCard],
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });
    update({ ...data, vocabDecks: nextDecks });
    showToast(`Đã thêm "${newCard.term}" vào bộ "${createModalDeck.name}"`, 'success');
    if (shouldClose) {
      setCreateModalDeck(null);
    }
  };

  const getDeckProgress = (deck) => {
    if (!deck.cards || deck.cards.length === 0) return { mastered: 0, total: 0, percent: 0 };
    const total = deck.cards.length;
    const mastered = deck.cards.filter(c => vocabStats[c.id]?.mastered).length;
    const percent = Math.round((mastered / total) * 100);
    return { mastered, total, percent };
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header Section */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Vocabulary &bull; Decks Library
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Thư viện Bộ từ vựng
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Chúc em iu đạt được target nhé ! Cố lên !
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/vocab-editor')}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Tạo bộ từ mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px]">
          <select
            value={filterColId}
            onChange={e => setFilterColId(e.target.value)}
            className="w-full pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors cursor-pointer appearance-none"
          >
            <option value="">Tất cả bộ sưu tập ({vocabCollections.length})</option>
            {vocabCollections.map(col => (
              <option key={col.id} value={col.id}>{escHtml(col.name)}</option>
            ))}
          </select>
          <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
        </div>

        <div className="relative flex-1 min-w-[160px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả..."
            className="w-full pl-8 pr-7 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
          />
          <span className="absolute left-2.5 top-2.5 text-slate-400">
            <IconSearch className="w-3.5 h-3.5" />
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          )}
        </div>

        <button
          onClick={() => setShowManageCols(true)}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <IconFolder className="w-3.5 h-3.5 text-slate-400" />
          <span>Bộ sưu tập</span>
        </button>
      </div>

      {/* Bento Grid: Decks */}
      {filteredDecks.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <IconCards className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Chưa tìm thấy bộ từ vựng nào</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Hãy tạo bộ từ đầu tiên để bắt đầu học nhé.</p>
          <button
            onClick={() => navigate('/vocab-editor')}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Tạo bộ từ mới
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map(deck => {
            const { mastered, total, percent } = getDeckProgress(deck);
            const colName = getVocabCollectionName(vocabCollections, deck.collectionId);

            return (
              <div
                key={deck.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Meta row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 truncate">
                      {escHtml(colName)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                    {escHtml(deck.name)}
                  </h3>

                  {deck.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {escHtml(deck.description)}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3 mb-3.5">
                    <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                      <span>Đã thuộc: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{mastered}</strong>/{total}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 dark:bg-slate-200 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {/* Nút Học (Đen) chính là Trắc nghiệm */}
                  <button
                    onClick={() => navigate('/vocab-quiz', { state: { deckId: deck.id } })}
                    disabled={!deck.cards || deck.cards.length < 2}
                    className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <IconTarget className="w-3.5 h-3.5" />
                    <span>Học</span>
                  </button>

                  {/* Nút Flashcard */}
                  <button
                    onClick={() => navigate('/vocab-learn', { state: { deckId: deck.id } })}
                    disabled={!deck.cards || deck.cards.length === 0}
                    className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <IconCards className="w-3.5 h-3.5 text-slate-500" />
                    <span>Flashcard</span>
                  </button>

                  <button
                    onClick={() => setCreateModalDeck(deck)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Tạo flashcard"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => navigate(`/vocab-editor/${deck.id}`)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Chỉnh sửa bộ từ"
                  >
                    <IconEdit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(deck.id, deck.name)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Xóa bộ từ"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Collection Management Modal */}
      {showManageCols && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <IconFolder className="w-4 h-4 text-slate-400" />
                <span>Quản lý Bộ sưu tập</span>
              </h3>
              <button
                onClick={() => setShowManageCols(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateCol(); }}
                placeholder="Tên bộ sưu tập mới..."
                className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={handleCreateCol}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Thêm
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {vocabCollections.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Chưa có bộ sưu tập nào.</p>
              ) : (
                vocabCollections.map(col => {
                  const deckCount = vocabDecks.filter(d => d.collectionId === col.id).length;
                  return (
                    <div key={col.id} className="flex items-center justify-between py-2 px-1 text-xs">
                      <div className="truncate mr-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{col.name}</span>
                        <span className="text-slate-400 font-mono text-[10px] ml-1.5">({deckCount})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCol(col.id, col.name)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Xóa bộ sưu tập"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowManageCols(false)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-medium cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Flashcard Modal (Study4 Style) */}
      {createModalDeck && (
        <CreateFlashcardModal
          deck={createModalDeck}
          isOpen={!!createModalDeck}
          onClose={() => setCreateModalDeck(null)}
          onSaveCard={handleSaveFlashcard}
        />
      )}
    </div>
  );
}
