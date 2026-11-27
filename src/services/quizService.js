import { supabase } from '../lib/supabase';

export async function fetchQuizDomain() {
  const [colsRes, setsRes, qRes, optRes] = await Promise.all([
    supabase.from('quiz_collections').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('quiz_sets').select('*').order('created_at', { ascending: true }),
    supabase.from('questions').select('*').order('sort_order', { ascending: true }),
    supabase.from('question_options').select('*').order('sort_order', { ascending: true }),
  ]);

  if (colsRes.error) throw new Error(colsRes.error.message);
  if (setsRes.error) throw new Error(setsRes.error.message);
  if (qRes.error) throw new Error(qRes.error.message);
  if (optRes.error) throw new Error(optRes.error.message);

  const optionsByQ = new Map();
  for (const opt of optRes.data || []) {
    if (!optionsByQ.has(opt.question_id)) optionsByQ.set(opt.question_id, []);
    optionsByQ.get(opt.question_id).push(opt);
  }

  const questionsBySet = new Map();
  for (const q of qRes.data || []) {
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

  const collections = (colsRes.data || []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
    createdAt: c.created_at,
  }));

  const tests = (setsRes.data || []).map((s) => ({
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

export async function saveQuizSetWithQuestions(test, userId) {
  const nextVersion = (test.version || 1) + 1;

  // Check if set exists for optimistic concurrency
  const { data: existing } = await supabase
    .from('quiz_sets')
    .select('id, version')
    .eq('id', test.id)
    .maybeSingle();

  if (existing && test.version && existing.version !== test.version) {
    throw new Error('Bộ đề đã được chỉnh sửa bởi người khác. Vui lòng tải lại trước khi lưu.');
  }

  const { error: setErr } = await supabase.from('quiz_sets').upsert({
    id: test.id,
    collection_id: test.collectionId || null,
    name: test.name,
    description: test.description || '',
    version: existing ? nextVersion : 1,
    created_by: userId,
  });
  if (setErr) throw new Error(setErr.message);

  // Sync questions for this set
  const incomingQuestions = test.questions || [];
  const incomingIds = incomingQuestions.map((q) => q.id);

  const { data: existingQs } = await supabase
    .from('questions')
    .select('id')
    .eq('quiz_set_id', test.id);

  const toDelete = (existingQs || [])
    .map((q) => q.id)
    .filter((id) => !incomingIds.includes(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('questions').delete().in('id', toDelete);
    if (delErr) throw new Error(delErr.message);
  }

  for (let i = 0; i < incomingQuestions.length; i++) {
    const q = incomingQuestions[i];
    const { error: qErr } = await supabase.from('questions').upsert({
      id: q.id,
      quiz_set_id: test.id,
      prompt: q.prompt || '',
      explanation: q.explanation || '',
      sort_order: i,
    });
    if (qErr) throw new Error(qErr.message);

    // Replace options for this question
    await supabase.from('question_options').delete().eq('question_id', q.id);

    const opts = (q.options || []).map((opt, idx) => ({
      question_id: q.id,
      label: opt.label || String.fromCharCode(65 + idx),
      text: opt.text || '',
      is_correct: Array.isArray(q.correctIndices) && q.correctIndices.includes(idx),
      sort_order: idx,
    }));

    if (opts.length > 0) {
      const { error: optErr } = await supabase.from('question_options').insert(opts);
      if (optErr) throw new Error(optErr.message);
    }
  }
}

export async function deleteQuizSet(testId) {
  const { error } = await supabase.from('quiz_sets').delete().eq('id', testId);
  if (error) throw new Error(error.message);
}
