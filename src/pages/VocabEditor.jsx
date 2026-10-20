import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuiz } from '../App';
import { createVocabDeck, createVocabCard, createVocabCollection, escHtml, uid } from '../data/storage';
import { speakWord } from '../lib/tts';
import { IconSpeaker, IconTrash, IconPlus, IconFolder, IconArrowLeft, IconEdit, IconSearch } from '../components/Icons';
import CreateFlashcardModal from '../components/CreateFlashcardModal';
import { getBadgeColor } from '../data/badgeColors';

export default function VocabEditor() {
  const { data, update, syncStatus, showToast, showConfirm } = useQuiz();
  const navigate = useNavigate();
  const { deckId } = useParams();

  // Đảm bảo luôn có ID ổn định cho bộ từ (kể cả khi tạo mới)
  const [activeDeckId] = useState(() => deckId || uid());

  const vocabCollections = data.vocabCollections || [];

  const [name, setName] = useState('');
  const [collectionId, setCollectionId] = useState(() => {
    return vocabCollections[0]?.id || '';
  });
  const [description, setDescription] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en-US');
  const [cards, setCards] = useState([]);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [showStudy4Modal, setShowStudy4Modal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('az'); // 'az' | 'za' | 'default'


  const filteredAndSortedCards = useMemo(() => {
    let list = cards.map((card, originalIndex) => ({ card, originalIndex }));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(({ card }) => {
        const term = (card.term || '').toLowerCase();
        const meaning = (card.meaning || '').toLowerCase();
        const phonetic = (card.phonetic || '').toLowerCase();
        const partOfSpeech = (card.partOfSpeech || '').toLowerCase();
        const example = (card.example || '').toLowerCase();
        const examples = Array.isArray(card.examples) ? card.examples.join(' ').toLowerCase() : '';
        const note = (card.note || '').toLowerCase();

        return (
          term.includes(q) ||
          meaning.includes(q) ||
          phonetic.includes(q) ||
          partOfSpeech.includes(q) ||
          example.includes(q) ||
          examples.includes(q) ||
          note.includes(q)
        );
      });
    }

    if (sortOrder === 'az') {
      list.sort((a, b) => {
        const termA = (a.card.term || '').trim().toLowerCase();
        const termB = (b.card.term || '').trim().toLowerCase();
        return termA.localeCompare(termB, 'vi', { sensitivity: 'base' });
      });
    } else if (sortOrder === 'za') {
      list.sort((a, b) => {
        const termA = (a.card.term || '').trim().toLowerCase();
        const termB = (b.card.term || '').trim().toLowerCase();
        return termB.localeCompare(termA, 'vi', { sensitivity: 'base' });
      });
    }

    return list;
  }, [cards, searchQuery, sortOrder]);

  // Modal create/edit collection
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [showEditColModal, setShowEditColModal] = useState(false);
  const [editColName, setEditColName] = useState('');

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const initializedDeckIdRef = useRef(null);

  // Đảm bảo URL luôn có ID để khách reload F5 không mất trạng thái
  useEffect(() => {
    if (!deckId && activeDeckId) {
      navigate(`/vocab-editor/${activeDeckId}`, { replace: true });
    }
  }, [deckId, activeDeckId, navigate]);

  // Load existing deck if editing, hoặc tự động khôi phục bản nháp chưa lưu nếu có
  useEffect(() => {
    const currentId = deckId || activeDeckId;
    if (initializedDeckIdRef.current === currentId) return;

    if (currentId && data.vocabDecks) {
      const existing = data.vocabDecks.find(d => d.id === currentId);
      if (existing) {
        initializedDeckIdRef.current = currentId;
        setName(existing.name || '');
        setCollectionId(existing.collectionId || (vocabCollections[0]?.id || ''));
        setDescription(existing.description || '');
        setTargetLanguage(existing.targetLanguage || 'en-US');
        setCards(existing.cards ? JSON.parse(JSON.stringify(existing.cards)) : []);
        return;
      }
    }

    if (!initializedDeckIdRef.current) {
      initializedDeckIdRef.current = currentId;
      // Khôi phục bản nháp nếu khách hàng từng F5 hoặc bị tắt tab
      try {
        const rawDraft = localStorage.getItem('vocab_draft_new');
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          if (draft && ((Array.isArray(draft.cards) && draft.cards.length > 0) || (draft.name && draft.name.trim()))) {
            setName(draft.name || '');
            if (draft.collectionId) setCollectionId(draft.collectionId);
            setDescription(draft.description || '');
            if (draft.targetLanguage) setTargetLanguage(draft.targetLanguage);
            if (Array.isArray(draft.cards) && draft.cards.length > 0) setCards(draft.cards);
            setHasRestoredDraft(true);
            return;
          }
        }
      } catch (_e) {}

      setCards([]);
      if (vocabCollections.length > 0 && !collectionId) {
        setCollectionId(vocabCollections[0].id);
      }
    }
  }, [deckId, activeDeckId, data.vocabDecks, vocabCollections, collectionId]);

  // Đồng bộ tức thì bộ từ vựng và từng từ mới vào Database (Supabase) + LocalStorage
  const syncDeckToDatabase = useCallback(async (
    updatedCards,
    customName = null,
    customColId = null,
    customDesc = null,
    customLang = null
  ) => {
    setIsSavingCard(true);
    const currentId = deckId || activeDeckId;
    const currentDecks = data.vocabDecks || [];
    const existingIndex = currentDecks.findIndex(d => d.id === currentId);
    const now = new Date().toISOString();

    const finalCards = updatedCards !== undefined ? updatedCards : cards;
    const finalName = (customName !== null ? customName : name).trim() || 'Bộ từ vựng mới';
    const finalColId = customColId !== null 
      ? customColId 
      : (collectionId || vocabCollections[0]?.id || null);
    const finalDesc = (customDesc !== null ? customDesc : description).trim();
    const finalLang = customLang !== null ? customLang : targetLanguage;

    let nextDecks;
    if (existingIndex >= 0) {
      const existing = currentDecks[existingIndex];
      const updatedDeck = {
        ...existing,
        name: finalName,
        collectionId: finalColId,
        description: finalDesc,
        targetLanguage: finalLang,
        cards: finalCards,
        updatedAt: now
      };
      nextDecks = [...currentDecks];
      nextDecks[existingIndex] = updatedDeck;
    } else {
      const newDeck = {
        id: currentId,
        name: finalName,
        collectionId: finalColId,
        description: finalDesc,
        targetLanguage: finalLang,
        cards: finalCards,
        createdAt: now,
        updatedAt: now
      };
      nextDecks = [newDeck, ...currentDecks];
    }

    try {
      // update() sẽ lập tức lưu vào localStorage và đẩy lên Supabase DB qua RPC
      await update({ ...data, vocabDecks: nextDecks });
      try { localStorage.removeItem('vocab_draft_new'); } catch (_e) {}
    } finally {
      setIsSavingCard(false);
    }
  }, [deckId, activeDeckId, data, cards, name, collectionId, description, targetLanguage, vocabCollections, update]);

  // Tự động lưu nháp liên tục vào localStorage để dự phòng tối đa
  useEffect(() => {
    if (!name.trim() && cards.length === 0 && !description.trim()) {
      localStorage.removeItem('vocab_draft_new');
      return;
    }
    const draftData = {
      id: deckId || activeDeckId,
      name,
      collectionId,
      description,
      targetLanguage,
      cards,
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('vocab_draft_new', JSON.stringify(draftData));
    } catch (_e) {}
  }, [name, collectionId, description, targetLanguage, cards, deckId, activeDeckId]);

  // Cảnh báo người dùng khi bấm F5 hoặc đóng tab nếu đang có từ vựng chưa lưu
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (cards.length > 0 || name.trim()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cards.length, name]);

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
      const nextCards = [...cardsRef.current];
      nextCards[editingCardIndex] = savedCard;
      cardsRef.current = nextCards;
      setCards(nextCards);
      syncDeckToDatabase(nextCards);
      showToast(`Đã lưu thay đổi từ "${savedCard.term}" vào Database`, 'success');
      setEditingCardIndex(null);
      setShowStudy4Modal(false);
    } else {
      const nextCards = [...cardsRef.current, savedCard];
      cardsRef.current = nextCards;
      setCards(nextCards);
      syncDeckToDatabase(nextCards);
      showToast(`Đã thêm từ "${savedCard.term}" và lưu vào Database`, 'success');
      if (shouldClose) {
        setShowStudy4Modal(false);
      }
    }
  };

  const handleDeleteCard = (idx) => {
    const nextCards = cards.filter((_, i) => i !== idx);
    setCards(nextCards);
    syncDeckToDatabase(nextCards);
    showToast('Đã xóa từ vựng khỏi Database', 'info');
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

  const handleOpenEditCollection = () => {
    const current = vocabCollections.find(c => c.id === collectionId);
    if (!current) {
      showToast('Vui lòng chọn bộ sưu tập cần sửa', 'error');
      return;
    }
    setEditColName(current.name);
    setShowEditColModal(true);
  };

  const handleUpdateCollection = () => {
    if (!editColName.trim()) {
      showToast('Tên bộ sưu tập không được để trống', 'error');
      return;
    }
    const current = vocabCollections.find(c => c.id === collectionId);
    if (!current) return;
    const updatedName = editColName.trim();
    const nextCollections = vocabCollections.map(c =>
      c.id === current.id ? { ...c, name: updatedName } : c
    );
    update({ ...data, vocabCollections: nextCollections });
    setShowEditColModal(false);
    showToast(`Đã đổi tên bộ sưu tập thành "${updatedName}"`, 'success');
  };

  const handleDeleteCollection = () => {
    const current = vocabCollections.find(c => c.id === collectionId);
    if (!current) {
      showToast('Vui lòng chọn bộ sưu tập cần xóa', 'error');
      return;
    }
    const deckCount = (data.vocabDecks || []).filter(d => d.collectionId === current.id).length;
    const confirmMessage = deckCount > 0
      ? `Bộ sưu tập "${current.name}" đang có ${deckCount} bộ từ. Xóa bộ sưu tập này, các bộ từ sẽ chuyển sang "Chưa phân loại". Tiếp tục?`
      : `Bạn có chắc chắn muốn xóa bộ sưu tập "${current.name}"?`;

    showConfirm(confirmMessage, () => {
      const nextCols = vocabCollections.filter(c => c.id !== current.id);
      const nextDecks = (data.vocabDecks || []).map(d =>
        d.collectionId === current.id ? { ...d, collectionId: null } : d
      );
      update({ ...data, vocabCollections: nextCols, vocabDecks: nextDecks });
      const nextId = nextCols[0]?.id || '';
      setCollectionId(nextId);
      showToast(`Đã xóa bộ sưu tập "${current.name}"`, 'success');
    });
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

    const validCards = cards.filter(c => (c.term && c.term.trim()) || (c.meaning && c.meaning.trim()));
    if (validCards.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 từ vựng hợp lệ', 'error');
      return;
    }

    syncDeckToDatabase(validCards, name.trim(), collectionId, description.trim(), targetLanguage);
    showToast('Đã lưu toàn bộ bộ từ vựng thành công', 'success');
    navigate('/vocab');
  };

  const handleBatchImport = () => {
    let raw = batchText.trim();
    if (!raw) return;

    // Helper to clean quotes and trailing commas
    const cleanStr = (s) => {
      if (!s) return '';
      let res = s.trim();
      // Remove surrounding quotes ("...", '...')
      if ((res.startsWith('"') && res.endsWith('"')) || (res.startsWith("'") && res.endsWith("'"))) {
        res = res.slice(1, -1).trim();
      }
      // Remove trailing comma
      if (res.endsWith(',')) {
        res = res.slice(0, -1).trim();
      }
      // Remove surrounding quotes again if double quoted
      if ((res.startsWith('"') && res.endsWith('"')) || (res.startsWith("'") && res.endsWith("'"))) {
        res = res.slice(1, -1).trim();
      }
      return res;
    };

    // Helper to parse card attributes
    const parseCardData = (rawTerm, rawMeaning, rawPos = '', rawExamples = []) => {
      let term = cleanStr(rawTerm);
      let meaning = cleanStr(rawMeaning);
      let partOfSpeech = cleanStr(rawPos);
      let example = '';
      let examples = Array.isArray(rawExamples) ? rawExamples.map(cleanStr).filter(Boolean) : [];

      // Skip JSON schema keys or empty strings
      const jsonKeys = ['term', 'meaning', 'partofspeech', 'example', 'examples', 'phonetic', 'note', 'id'];
      if (jsonKeys.includes(term.toLowerCase().replace(/[^a-z]/g, ''))) {
        return null;
      }
      if (!term || !meaning || term === '[' || meaning === '[') return null;

      // Keep term as-is (including tags like [v], [n])

      // Extract Ex: from meaning
      if (examples.length === 0 && /\n\s*(?:Ex|Ví dụ|Example)\s*:/i.test(meaning)) {
        const exSplit = meaning.split(/\n\s*(?:Ex|Ví dụ|Example)\s*:\s*\n?/i);
        if (exSplit.length >= 2) {
          meaning = exSplit[0].trim();
          const rawEx = exSplit.slice(1).join('\n').trim();
          examples = rawEx
            .split(/\n\s*[-•*]\s*/g)
            .map(s => s.replace(/^[-•*]\s*/, '').trim())
            .filter(Boolean);
        }
      }

      if (examples.length > 0 && !example) {
        example = examples[0];
      }

      return createVocabCard(term, meaning, '', partOfSpeech, example, '', '', '', examples);
    };

    // 1. Try parsing JSON (supports full JSON or JSON array embedded inside text)
    let jsonCandidates = [];
    const firstBracket = raw.indexOf('[');
    const lastBracket = raw.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        const jsonSlice = raw.slice(firstBracket, lastBracket + 1);
        const parsed = JSON.parse(jsonSlice);
        if (Array.isArray(parsed)) jsonCandidates = parsed;
      } catch (e) {
        // Continue to fallback
      }
    }

    if (jsonCandidates.length === 0 && (raw.startsWith('{') || raw.includes('"term"'))) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) jsonCandidates = parsed;
        else if (Array.isArray(parsed.cards)) jsonCandidates = parsed.cards;
      } catch (e) {
        // Try regex matching objects { "term": "...", "meaning": "..." }
        const itemRegex = /\{\s*"term"\s*:\s*"([^"]+)"[\s\S]*?"meaning"\s*:\s*"([^"]+)"[\s\S]*?\}/g;
        let match;
        while ((match = itemRegex.exec(raw)) !== null) {
          try {
            const obj = JSON.parse(match[0]);
            jsonCandidates.push(obj);
          } catch (err) {
            jsonCandidates.push({ term: match[1], meaning: match[2] });
          }
        }
      }
    }

    if (jsonCandidates.length > 0) {
      const newCards = jsonCandidates.map(item => {
        return parseCardData(
          item.term || item.word || '',
          item.meaning || item.definition || '',
          item.partOfSpeech || '',
          item.examples || (item.example ? [item.example] : [])
        );
      }).filter(Boolean);

      if (newCards.length > 0) {
        setCards(prev => [...prev, ...newCards]);
        showToast(`Đã nhập thành công ${newCards.length} từ vựng!`, 'success');
        setBatchText('');
        setShowBatchModal(false);
        return;
      }
    }

    // 2. Plain text / Tab / Pipe parsing
    // Split cards by double newline if present (Quizlet standard), otherwise single newline
    const cardBlocks = raw.includes('\n\n') ? raw.split(/\n\s*\n/) : raw.split('\n');
    const newCards = [];

    for (const block of cardBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      let term = '';
      let meaning = '';

      if (trimmedBlock.includes('\t')) {
        const parts = trimmedBlock.split('\t').map(s => s.trim());
        term = parts[0] || '';
        meaning = parts.slice(1).join(' - ');
      } else if (trimmedBlock.includes('|')) {
        const parts = trimmedBlock.split('|').map(s => s.trim());
        term = parts[0] || '';
        meaning = parts.slice(1).join(' - ');
      } else if (trimmedBlock.includes(' - ')) {
        const parts = trimmedBlock.split(' - ').map(s => s.trim());
        term = parts[0] || '';
        meaning = parts.slice(1).join(' - ');
      } else if (trimmedBlock.includes(':')) {
        const idx = trimmedBlock.indexOf(':');
        term = trimmedBlock.slice(0, idx).trim();
        meaning = trimmedBlock.slice(idx + 1).trim();
      }

      const card = parseCardData(term, meaning);
      if (card) {
        newCards.push(card);
      }
    }

    if (newCards.length > 0) {
      const nextCards = [...cards, ...newCards];
      setCards(nextCards);
      syncDeckToDatabase(nextCards);
      showToast(`Đã thêm ${newCards.length} từ và lưu ngay vào Database`, 'success');
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
          {isSavingCard ? (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>Đang đẩy lên Supabase DB...</span>
            </div>
          ) : syncStatus === 'error' ? (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 px-2.5 py-1 rounded-lg" title="Không thể kết nối Supabase, dữ liệu đang lưu trên máy">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Lỗi kết nối DB (Đã lưu local)</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg" title="Dữ liệu hiện tại đã được lưu an toàn trên Supabase Database">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Đã lưu vào Supabase DB ✓</span>
            </div>
          )}
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
        {hasRestoredDraft && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">💾</span>
              <span>Đã tự động khôi phục bản nháp đang soạn dở ({cards.length} từ vựng).</span>
            </div>
            <button
              type="button"
              onClick={() => {
                try { localStorage.removeItem('vocab_draft_new'); } catch (_e) {}
                setCards([]);
                setName('');
                setDescription('');
                setHasRestoredDraft(false);
              }}
              className="text-amber-700 dark:text-amber-300 underline font-semibold hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
            >
              Hủy bản nháp này
            </button>
          </div>
        )}

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

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <select
                value={collectionId}
                onChange={e => {
                  const val = e.target.value;
                  setCollectionId(val);
                  if (cards.length > 0 || name.trim()) {
                    syncDeckToDatabase(cards, null, val);
                  }
                }}
                className="w-full pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 appearance-none cursor-pointer"
              >
                <option value="" disabled>-- Chọn một bộ sưu tập --</option>
                {vocabCollections.map(col => (
                  <option key={col.id} value={col.id}>{escHtml(col.name)}</option>
                ))}
              </select>
              <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenEditCollection}
                disabled={!collectionId || vocabCollections.length === 0}
                className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                title="Sửa tên bộ sưu tập đang chọn"
              >
                <IconEdit className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Sửa</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteCollection}
                disabled={!collectionId || vocabCollections.length === 0}
                className="flex items-center gap-1.5 bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100/70 dark:hover:bg-rose-900/50 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                title="Xóa bộ sưu tập đang chọn"
              >
                <IconTrash className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>

              <button
                type="button"
                onClick={() => { setNewColName(''); setShowCreateColModal(true); }}
                className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                title="Tạo bộ sưu tập mới"
              >
                <IconPlus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Tạo bộ sưu tập</span>
              </button>
            </div>
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
            onBlur={e => {
              if (cards.length > 0 || e.target.value.trim()) {
                syncDeckToDatabase(cards, e.target.value.trim());
              }
            }}
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
              onBlur={e => {
                if (cards.length > 0 || name.trim()) {
                  syncDeckToDatabase(cards, null, null, e.target.value.trim());
                }
              }}
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
                onChange={e => {
                  const lang = e.target.value;
                  setTargetLanguage(lang);
                  if (cards.length > 0 || name.trim()) {
                    syncDeckToDatabase(cards, null, null, null, lang);
                  }
                }}
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
        <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500">
            Danh sách từ vựng ({filteredAndSortedCards.length}{searchQuery ? `/${cards.length}` : ''})
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

        {/* Search & Sort Toolbar */}
        {cards.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50/70 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm từ vựng, định nghĩa, ví dụ..."
                className="w-full pl-8 pr-7 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
              />
              <span className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none">
                <IconSearch className="w-3.5 h-3.5" />
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  title="Xóa tìm kiếm"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative shrink-0">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400 appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                title="Sắp xếp danh sách hiển thị"
              >
                <option value="az">Sắp xếp: A → Z</option>
                <option value="za">Sắp xếp: Z → A</option>
                <option value="default">Thứ tự thêm vào (Gốc)</option>
              </select>
              <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
            </div>
          </div>
        )}

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
        ) : filteredAndSortedCards.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Không tìm thấy từ vựng nào khớp với từ khóa "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Xóa tìm kiếm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedCards.map(({ card, originalIndex }, displayIdx) => (
              <div
                key={card.id || originalIndex}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all h-full"
              >
                {/* Top Header & Main Info */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  {/* Top Bar: #Index + Term + Actions */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0" title={`Vị trí gốc: #${originalIndex + 1}`}>
                        #{displayIdx + 1}
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
                      {data.vocabStats?.[card.id]?.wrongCount >= 2 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 shrink-0 flex items-center gap-1" title={`Đã làm sai ${data.vocabStats[card.id].wrongCount} lần`}>
                          <span>⚠️ Sai {data.vocabStats[card.id].wrongCount} lần</span>
                        </span>
                      )}
                      {data.vocabStats?.[card.id]?.mastered && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 shrink-0" title="Đã ghi nhớ">
                          ✓ Đã nhớ
                        </span>
                      )}
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
                        onClick={() => handleOpenEditModal(originalIndex)}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer transition-colors"
                        title="Chỉnh sửa từ này"
                      >
                        <IconEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(originalIndex)}
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
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
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
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
              )}
              <button
                type="button"
                onClick={handleCreateCollection}
                className="px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100"
              >
                Tạo & Chọn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Collection */}
      {showEditColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Sửa tên Bộ sưu tập
              </h3>
              <button
                onClick={() => setShowEditColModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhập tên mới cho bộ sưu tập này:
            </p>

            <input
              type="text"
              autoFocus
              value={editColName}
              onChange={e => setEditColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleUpdateCollection(); }}
              placeholder="Tên bộ sưu tập..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-slate-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditColModal(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpdateCollection}
                className="px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100"
              >
                Lưu thay đổi
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
