import { createQuestion } from './storage';

export function parseBulkPaste(text) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return { questions: [], warnings: ['Văn bản trống.'] };

  const blocks = splitIntoBlocks(normalized);
  if (blocks.length === 0) return { questions: [], warnings: ['Không tìm thấy câu hỏi nào. Hãy dùng định dạng "Câu 1: ..." hoặc "1. ..."'] };

  const questions = [], warnings = [];
  for (let i = 0; i < blocks.length; i++) {
    try {
      const q = parseBlock(blocks[i]);
      if (q) {
        if (q.correctIndices.length === 0) warnings.push(`Câu ${i + 1}: Không tìm thấy đáp án đúng. Vui lòng chọn thủ công.`);
        questions.push(q);
      }
    } catch (e) { warnings.push(`Câu ${i + 1}: Lỗi khi phân tích - ${e.message}`); }
  }
  return { questions, warnings };
}

function splitIntoBlocks(text) {
  const lines = text.split('\n'), blocks = [];
  let current = [];
  for (let i = 0; i < lines.length; i++) {
    if (isQuestionStart(lines[i]) && current.length > 0 && !isEmptyBlock(current)) { blocks.push(current.join('\n')); current = []; }
    current.push(lines[i]);
  }
  if (current.length > 0 && !isEmptyBlock(current)) blocks.push(current.join('\n'));
  return blocks;
}

function isEmptyBlock(lines) { return lines.every(l => !l.trim()); }

function isQuestionStart(line) { return /^(Câu\s+\d+|Q\d+|\d+)\s*[.:)]\s*.+/i.test(line.trim()); }

function parseBlock(block) {
  const lines = block.split('\n');
  const q = createQuestion();
  q.options = []; q.correctIndices = []; q.explanation = '';

  let state = 'PROMPT', promptLines = [];
  const firstLine = lines[0].trim();
  const promptStart = firstLine.replace(/^(Câu\s+\d+|Q\d+|\d+)\s*[.:)]\s*/i, '');
  if (promptStart) promptLines.push(promptStart);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const optMatch = line.match(/^([A-Da-d])\s*[.)]\s*(.+)/);
    const ansMatch = line.match(/^(Đ[aá]p\s*[aá]n|DA|ĐA|Answer|ANS?)\s*[:=]\s*(.+)/i);
    const expMatch = line.match(/^(Gi[aả]i\s*th[ií]ch|GT|Explanation|Explain)\s*[:=]\s*(.+)/i);

    if (state === 'PROMPT') {
      if (optMatch) { state = 'OPTIONS'; q.options.push({ label: optMatch[1].toUpperCase(), text: optMatch[2].trim() }); }
      else if (ansMatch) { state = 'ANSWER'; q.correctIndices = parseAnswerLetters(ansMatch[2]); }
      else if (expMatch) { state = 'EXPLANATION'; q.explanation = expMatch[2].trim(); }
      else { promptLines.push(line); }
    } else if (state === 'OPTIONS') {
      if (optMatch) { q.options.push({ label: optMatch[1].toUpperCase(), text: optMatch[2].trim() }); }
      else if (ansMatch) { state = 'ANSWER'; q.correctIndices = parseAnswerLetters(ansMatch[2]); }
      else if (expMatch) { state = 'EXPLANATION'; q.explanation = expMatch[2].trim(); }
      else {
        const ans2 = line.match(/^(Đ[aá]p\s*[aá]n|DA|ĐA|Answer|ANS?)\s*[:=]\s*(.+)/i);
        const exp2 = line.match(/^(Gi[aả]i\s*th[ií]ch|GT|Explanation|Explain)\s*[:=]\s*(.+)/i);
        if (ans2) { state = 'ANSWER'; q.correctIndices = parseAnswerLetters(ans2[2]); }
        else if (exp2) { state = 'EXPLANATION'; q.explanation = exp2[2].trim(); }
        else if (q.options.length > 0) { q.options[q.options.length - 1].text += ' ' + line; }
      }
    } else if (state === 'ANSWER') {
      const exp2 = line.match(/^(Gi[aả]i\s*th[ií]ch|GT|Explanation|Explain)\s*[:=]\s*(.+)/i);
      if (exp2) { state = 'EXPLANATION'; q.explanation = exp2[2].trim(); }
      else { q.explanation += (q.explanation ? ' ' : '') + line; }
    } else if (state === 'EXPLANATION') { q.explanation += ' ' + line; }
  }

  q.prompt = promptLines.join(' ').trim();
  if (q.options.length === 0) q.options = [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }];
  if (!q.prompt) q.prompt = firstLine || '(Không có nội dung)';
  return q;
}

function parseAnswerLetters(value) {
  if (!value) return [];
  const cleaned = value.replace(/\s+v[àa]\s+/g, ',').replace(/\s+/g, ',');
  return cleaned.split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-D]$/.test(s)).map(s => s.charCodeAt(0) - 65);
}
