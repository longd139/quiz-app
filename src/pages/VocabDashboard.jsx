import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { escHtml, getVocabCollectionName, createVocabCollection } from '../data/storage';
import { IconCards, IconTarget, IconEdit, IconTrash, IconPlus, IconFolder, IconSearch, IconRotate, IconCross, IconSpeaker } from '../components/Icons';
import { speakWord } from '../lib/tts';
import CreateFlashcardModal from '../components/CreateFlashcardModal';
import StreakHeatmap from '../components/StreakHeatmap';
import FormattedText from '../components/FormattedText';

export default function VocabDashboard() {
  const { data, update, showConfirm, showToast } = useQuiz();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterColId, setFilterColId] = useState('');
  const [showManageCols, setShowManageCols] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [createModalDeck, setCreateModalDeck] = useState(null);
  const [studyOptionDeck, setStudyOptionDeck] = useState(null);
  const [viewingMistakesDeck, setViewingMistakesDeck] = useState(null);

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

  const handleStartStudy = (deck) => {
    const { mastered } = getDeckProgress(deck);
    if (mastered >= 10) {
      setStudyOptionDeck(deck);
    } else {
      navigate('/vocab-quiz', { state: { deckId: deck.id, studyMode: 'continue' } });
    }
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

      {/* Daily Streak & Activity Heatmap */}
      <StreakHeatmap />

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

                    {(() => {
                      const countGe2 = deck.cards?.filter(c => (vocabStats[c.id]?.wrongCount || 0) >= 2).length || 0;
                      const mistakeCount = countGe2 > 0
                        ? countGe2
                        : (deck.cards?.filter(c => (vocabStats[c.id]?.wrongCount || 0) > 0).length || 0);

                      if (mistakeCount === 0) return null;
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingMistakesDeck(deck);
                          }}
                          className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-900/60 shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
                          title="Bấm để xem danh sách các từ hay làm sai"
                        >
                          {mistakeCount} từ hay làm sai
                        </button>
                      );
                    })()}
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
                  {/* Nút Học (Đen) */}
                  <button
                    onClick={() => handleStartStudy(deck)}
                    disabled={!deck.cards || deck.cards.length < 2}
                    className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Luyện tập trắc nghiệm / tổng hợp"
                  >
                    <IconTarget className="w-3.5 h-3.5" />
                    <span>Học</span>
                  </button>

                  {/* Nút Flashcard */}
                  <button
                    onClick={() => navigate('/vocab-learn', { state: { deckId: deck.id } })}
                    disabled={!deck.cards || deck.cards.length === 0}
                    className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Lật thẻ Flashcard"
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

      {/* Modal hỏi: Em muốn ? (khi bộ từ có >= 10 câu đúng) */}
      {studyOptionDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Em muốn ?</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[280px]">
                  Bộ từ: <strong className="text-slate-800 dark:text-slate-200">{studyOptionDeck.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStudyOptionDeck(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 3 Option cards */}
            <div className="space-y-3">
              {(() => {
                const { mastered, total } = getDeckProgress(studyOptionDeck);
                const wrongCount = studyOptionDeck.cards?.filter(c => (vocabStats[c.id]?.wrongCount || 0) > 0).length || 0;
                const reviewedCards = (studyOptionDeck.cards || []).filter(c => {
                  const st = vocabStats[c.id];
                  return Boolean(st && (st.mastered || (st.correctCount || 0) > 0 || (st.wrongCount || 0) > 0 || (st.reviewCount || 0) > 0 || st.lastReviewed));
                });
                const reviewedCount = reviewedCards.length;

                return (
                  <>
                    {/* Option 1: Tiếp tục học */}
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/vocab-quiz', { state: { deckId: studyOptionDeck.id, studyMode: 'continue' } });
                        setStudyOptionDeck(null);
                      }}
                      className="w-full text-left p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 hover:border-emerald-500 transition-all flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                        <IconTarget className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Tiếp tục học
                          </span>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                            {mastered}/{total} câu đúng
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Tiếp tục với {mastered} câu đang làm đúng, luyện tiếp các câu còn lại cho đến khi thuộc toàn bộ.
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Ôn lại */}
                    <button
                      type="button"
                      disabled={reviewedCount === 0}
                      onClick={() => {
                        if (reviewedCount === 0) return;
                        navigate('/vocab-quiz', { state: { deckId: studyOptionDeck.id, studyMode: 'restart' } });
                        setStudyOptionDeck(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        reviewedCount > 0
                          ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group'
                          : 'border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                        <IconRotate className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Ôn lại
                          </span>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {reviewedCount} từ đã học & làm sai
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Làm lại những câu mình làm đúng và những câu mình làm sai (không bao gồm các câu chưa làm).
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Ôn lại câu sai */}
                    <button
                      type="button"
                      disabled={wrongCount === 0}
                      onClick={() => {
                        if (wrongCount === 0) return;
                        navigate('/vocab-quiz', { state: { deckId: studyOptionDeck.id, studyMode: 'wrong_only' } });
                        setStudyOptionDeck(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        wrongCount > 0
                          ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 hover:border-rose-500 cursor-pointer group'
                          : 'border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                        wrongCount > 0
                          ? 'bg-rose-600 text-white group-hover:scale-105 transition-transform'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <IconCross className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Ôn lại câu sai
                          </span>
                          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                            wrongCount > 0
                              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            {wrongCount > 0 ? `${wrongCount} câu sai` : '0 câu sai'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {wrongCount > 0
                            ? `Chỉ làm lại những câu bạn đã từng trả lời sai trong bộ từ này.`
                            : 'Hiện không có câu nào bị sai trong bộ từ này.'}
                        </p>
                      </div>
                    </button>
                  </>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStudyOptionDeck(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal hiển thị danh sách từ hay làm sai khi bấm vào badge */}
      {viewingMistakesDeck && (() => {
        const countGe2List = (viewingMistakesDeck.cards || [])
          .filter(c => (vocabStats[c.id]?.wrongCount || 0) >= 2)
          .sort((a, b) => (vocabStats[b.id]?.wrongCount || 0) - (vocabStats[a.id]?.wrongCount || 0));

        const mistakeList = countGe2List.length > 0
          ? countGe2List
          : (viewingMistakesDeck.cards || [])
              .filter(c => (vocabStats[c.id]?.wrongCount || 0) > 0)
              .sort((a, b) => (vocabStats[b.id]?.wrongCount || 0) - (vocabStats[a.id]?.wrongCount || 0));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Từ hay làm sai
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60">
                      {mistakeList.length} từ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[280px] sm:max-w-[360px]">
                    Bộ từ: <strong className="text-slate-800 dark:text-slate-200">{viewingMistakesDeck.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingMistakesDeck(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Danh sách từ làm sai */}
              <div className="overflow-y-auto space-y-2.5 py-4 flex-1 pr-1">
                {mistakeList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Chưa có từ nào bị làm sai trong bộ từ này.
                  </div>
                ) : (
                  mistakeList.map(card => {
                    const wrongCount = vocabStats[card.id]?.wrongCount || 0;
                    return (
                      <div
                        key={card.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {card.term}
                            </span>
                            {card.partOfSpeech && (
                              <span className="text-[10px] font-mono italic px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {card.partOfSpeech}
                              </span>
                            )}
                            {card.phonetic && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                {card.phonetic}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => speakWord(card.term, viewingMistakesDeck.targetLanguage || 'en-US')}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Nghe phát âm"
                            >
                              <IconSpeaker className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {card.meaning}
                          </p>

                          {card.example && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-serif">
                              &ldquo;<FormattedText text={card.example} />&rdquo;
                              {card.exampleMeaning && ` → ${card.exampleMeaning}`}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 whitespace-nowrap">
                            Sai {wrongCount} lần
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setViewingMistakesDeck(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  Đóng
                </button>
                {mistakeList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const deckToStudy = viewingMistakesDeck;
                      setViewingMistakesDeck(null);
                      navigate('/vocab-quiz', { state: { deckId: deckToStudy.id, studyMode: 'wrong_only' } });
                    }}
                    className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <IconTarget className="w-3.5 h-3.5" />
                    <span>Ôn tập các từ này</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
