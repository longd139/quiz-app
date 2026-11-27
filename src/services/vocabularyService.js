import { supabase } from '../lib/supabase';

export async function fetchVocabularyDomain() {
  const [colsRes, decksRes, cardsRes] = await Promise.all([
    supabase.from('vocab_collections').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('vocab_decks').select('*').order('created_at', { ascending: true }),
    supabase.from('flashcards').select('*').order('sort_order', { ascending: true }),
  ]);

  if (colsRes.error) throw new Error(colsRes.error.message);
  if (decksRes.error) throw new Error(decksRes.error.message);
  if (cardsRes.error) throw new Error(cardsRes.error.message);

  const cardsByDeck = new Map();
  for (const c of cardsRes.data || []) {
    const mappedCard = {
      id: c.id,
      term: c.term,
      meaning: c.meaning,
      phonetic: c.phonetic || '',
      partOfSpeech: c.part_of_speech || '',
      example: c.example || '',
      exampleMeaning: c.example_meaning || '',
      examples: Array.isArray(c.examples) ? c.examples : [],
      image: c.image_url || '',
      note: c.note || '',
      version: c.version ?? 1,
    };
    if (!cardsByDeck.has(c.deck_id)) cardsByDeck.set(c.deck_id, []);
    cardsByDeck.get(c.deck_id).push(mappedCard);
  }

  const vocabCollections = (colsRes.data || []).map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.created_at,
  }));

  const vocabDecks = (decksRes.data || []).map((d) => ({
    id: d.id,
    name: d.name,
    collectionId: d.collection_id,
    description: d.description || '',
    targetLanguage: d.target_language || 'en-US',
    version: d.version ?? 1,
    cards: cardsByDeck.get(d.id) || [],
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));

  return { vocabCollections, vocabDecks };
}

export async function upsertVocabCollection(col, userId) {
  const { data, error } = await supabase
    .from('vocab_collections')
    .upsert({
      id: col.id,
      name: col.name,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVocabCollection(collectionId) {
  const { error } = await supabase.from('vocab_collections').delete().eq('id', collectionId);
  if (error) throw new Error(error.message);
}

export async function saveVocabDeckWithCards(deck, userId) {
  const { data: existing } = await supabase
    .from('vocab_decks')
    .select('id, version')
    .eq('id', deck.id)
    .maybeSingle();

  if (existing && deck.version && existing.version !== deck.version) {
    throw new Error('Bộ từ vựng đã được chỉnh sửa bởi người khác. Vui lòng tải lại trước khi lưu.');
  }

  const { error: deckErr } = await supabase.from('vocab_decks').upsert({
    id: deck.id,
    collection_id: deck.collectionId || null,
    name: deck.name,
    description: deck.description || '',
    target_language: deck.targetLanguage || 'en-US',
    version: existing ? (deck.version || 1) + 1 : 1,
    created_by: userId,
  });
  if (deckErr) throw new Error(deckErr.message);

  const incomingCards = deck.cards || [];
  const incomingIds = incomingCards.map((c) => c.id);

  const { data: existingCards } = await supabase
    .from('flashcards')
    .select('id')
    .eq('deck_id', deck.id);

  const toDelete = (existingCards || [])
    .map((c) => c.id)
    .filter((id) => !incomingIds.includes(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('flashcards').delete().in('id', toDelete);
    if (delErr) throw new Error(delErr.message);
  }

  if (incomingCards.length > 0) {
    const rows = incomingCards.map((c, idx) => ({
      id: c.id,
      deck_id: deck.id,
      term: c.term || '',
      meaning: c.meaning || '',
      phonetic: c.phonetic || '',
      part_of_speech: c.partOfSpeech || '',
      example: c.example || '',
      example_meaning: c.exampleMeaning || '',
      examples: Array.isArray(c.examples) ? c.examples : [],
      image_url: c.image || '',
      note: c.note || '',
      sort_order: idx,
    }));

    const { error: cardErr } = await supabase.from('flashcards').upsert(rows);
    if (cardErr) throw new Error(cardErr.message);
  }
}

export async function deleteVocabDeck(deckId) {
  const { error } = await supabase.from('vocab_decks').delete().eq('id', deckId);
  if (error) throw new Error(error.message);
}
