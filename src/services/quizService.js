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

export async function fetchQuizDomain() {
  const [colsData, setsData, qData, optData] = await Promise.all([
    fetchAllPaginated('quiz_collections', ['sort_order', 'created_at']),
    fetchAllPaginated('quiz_sets', ['created_at']),
    fetchAllPaginated('questions', ['sort_order', 'id']),
    fetchAllPaginated('question_options', ['sort_order', 'id']),
  ]);

  const optionsByQ = new Map();
  for (const opt of optData) {
    if (!optionsByQ.has(opt.question_id)) optionsByQ.set(opt.question_id, []);
    optionsByQ.get(opt.question_id).push(opt);
  }

  const questionsBySet = new Map();
  for (const q of qData) {
    const opts = optionsByQ.get(q.id) || [];
    const correctIndices = [];
    const mappedOpts = opts.map((o, idx) => {
      if (o.is_correct) correctIndices.push(idx);
      return { id: o.id, label: o.label, text: o.text };
    });

    const mappedQ = {
      id: q.id,
      prompt: q.prompt,
      explanation: q.explanation || '',
      options: mappedOpts,
      correctIndices,
      version: q.version ?? 1,
    };
    if (!questionsBySet.has(q.quiz_set_id)) questionsBySet.set(q.quiz_set_id, []);
    questionsBySet.get(q.quiz_set_id).push(mappedQ);
  }

  const collections = colsData.map((c) => ({
    id: c.id,
    name: c.name,
    term: c.term || '',
    description: c.description || '',
    createdAt: c.created_at,
  }));

  const tests = setsData.map((s) => ({
    id: s.id,
    name: s.name,
    collectionId: s.collection_id,
    description: s.description || '',
    version: s.version ?? 1,
    questions: questionsBySet.get(s.id) || [],
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  return { collections, tests };
}

export async function upsertQuizCollection(col, userId) {
  const { data, error } = await supabase
    .from('quiz_collections')
    .upsert({
      id: col.id,
      name: col.name,
      term: col.term || '',
      description: col.description || '',
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQuizCollection(collectionId) {
  const { error } = await supabase.from('quiz_collections').delete().eq('id', collectionId);
  if (error) throw new Error(error.message);
}

export async function saveQuizSetWithQuestions(test) {
  const { data, error } = await supabase.rpc('save_quiz_set_atomic', {
    p_id: test.id,
    p_collection_id: test.collectionId || null,
    p_name: test.name,
    p_description: test.description || '',
    p_expected_version: test.version ?? null,
    p_questions: test.questions || [],
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQuizSet(testId) {
  const { error } = await supabase.rpc('delete_quiz_set_atomic', { p_id: testId });
  if (error) throw new Error(error.message);
}
