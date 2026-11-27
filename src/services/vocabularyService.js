import { supabase } from '../lib/supabase';

const PAGE_SIZE = 1000;

async function fetchAllPaginated(table, orderColumns = ['created_at']) {
  const rows = [];
  let offset = 0;

  while (true) {
    let query = supabase.from(table).select('*');
    for (const col of orderColumns) {
      query = query.order(col, { ascending: true });
    }
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function fetchVocabularyDomain() {
  const [colsData, decksData, cardsData] = await Promise.all([
    fetchAllPaginated('vocab_collections', ['sort_order', 'created_at']),
    fetchAllPaginated('vocab_decks', ['created_at']),
    fetchAllPaginated('flashcards', ['sort_order', 'id']),
  ]);

  const cardsByDeck = new Map();
  for (const c of cardsData) {
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

  const vocabCollections = colsData.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.created_at,
  }));

  const vocabDecks = decksData.map((d) => ({
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

export async function saveVocabDeckWithCards(deck) {
  const { data, error } = await supabase.rpc('save_vocab_deck_atomic', {
    p_id: deck.id,
    p_collection_id: deck.collectionId || null,
    p_name: deck.name,
    p_description: deck.description || '',
    p_target_language: deck.targetLanguage || 'en-US',
    p_expected_version: deck.version ?? null,
    p_cards: deck.cards || [],
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVocabDeck(deckId) {
  const { error } = await supabase.rpc('delete_vocab_deck_atomic', { p_id: deckId });
  if (error) throw new Error(error.message);
}
