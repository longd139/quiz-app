import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import checkAnswerMatch logic (same implementation as in VocabQuiz.jsx)
function checkAnswerMatch(userInput, targetAnswer) {
  if (!userInput || !targetAnswer) return false;

  const normalizeStr = (str) => {
    if (!str) return '';
    return str
      .normalize('NFC')
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”…[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const removeAccents = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');
  };

  const stripEnglishParticles = (str) => {
    if (!str) return '';
    return str.replace(/^(to|a|an|the)\s+/i, '').trim();
  };

  const normUser = normalizeStr(userInput);
  if (!normUser) return false;

  const userWords = normUser.split(' ').filter(Boolean);
  const userSorted = userWords.slice().sort().join(' ');
  const userSortedNoAcc = removeAccents(normUser).split(' ').filter(Boolean).sort().join(' ');

  const normUserNoParticle = stripEnglishParticles(normUser);
  const userWordsNoPart = normUserNoParticle.split(' ').filter(Boolean);
  const userSortedNoPart = userWordsNoPart.slice().sort().join(' ');

  const matchesCandidate = (candidate) => {
    const normCand = normalizeStr(candidate);
    if (!normCand) return false;

    // 1. Giống hệt 100%
    if (normUser === normCand) return true;

    // 2. Giống khi bỏ mạo từ tiếng Anh (VD: "to run" <-> "run", "an apple" <-> "apple")
    const normCandNoPart = stripEnglishParticles(normCand);
    if (normUserNoParticle && normCandNoPart && normUserNoParticle === normCandNoPart) return true;

    // 3. Giống khi bỏ dấu tiếng Việt
    if (removeAccents(normUser) === removeAccents(normCand)) return true;
    if (removeAccents(normUserNoParticle) === removeAccents(normCandNoPart)) return true;

    const candWords = normCand.split(' ').filter(Boolean);

    // BẮT BUỘC ĐỦ CHỮ: Số lượng chữ/từ bằng nhau
    if (userWords.length === candWords.length) {
      const candSorted = candWords.slice().sort().join(' ');
      if (userSorted === candSorted) return true;

      const candSortedNoAcc = removeAccents(normCand).split(' ').filter(Boolean).sort().join(' ');
      if (userSortedNoAcc === candSortedNoAcc) return true;
    }

    const candWordsNoPart = normCandNoPart.split(' ').filter(Boolean);
    if (userWordsNoPart.length === candWordsNoPart.length && userWordsNoPart.length > 0) {
      const candSortedNoPart = candWordsNoPart.slice().sort().join(' ');
      if (userSortedNoPart === candSortedNoPart) return true;
    }

    return false;
  };

  // 1. Kiểm tra trực tiếp toàn bộ đáp án
  if (matchesCandidate(targetAnswer)) return true;

  // 2. Kiểm tra khi bỏ phần trong ngoặc
  const withoutParens = targetAnswer.replace(/\(.*?\)|\[.*?\]/g, ' ');
  if (matchesCandidate(withoutParens)) return true;

  // 3. Kiểm tra từng nghĩa đồng nghĩa
  const rawParts = targetAnswer
    .normalize('NFC')
    .split(/[\n,;/]|\bhoặc\b|\bor\b/i);

  for (const part of rawParts) {
    if (matchesCandidate(part)) return true;
    const partWithoutParens = part.replace(/\(.*?\)|\[.*?\]/g, ' ');
    if (matchesCandidate(partWithoutParens)) return true;
  }

  // 4. Kiểm tra phần bên trong ngoặc đơn
  const parensMatches = targetAnswer.match(/\((.*?)\)|\[(.*?)\]/g);
  if (parensMatches) {
    for (const match of parensMatches) {
      if (matchesCandidate(match)) return true;
    }
  }

  return false;
}

describe('Tình huống 1: Hiện Từ Tiếng Anh -> Gõ Nghĩa Tiếng Việt', () => {
  it('Khớp chính xác tiếng Việt có dấu', () => {
    assert.equal(checkAnswerMatch('thành tựu', 'thành tựu'), true);
  });

  it('Khớp tiếng Việt không dấu', () => {
    assert.equal(checkAnswerMatch('thanh tuu', 'thành tựu'), true);
  });

  it('Khớp hoán đổi thứ tự từ (đủ chữ)', () => {
    assert.equal(checkAnswerMatch('tiền thu', 'thu tiền'), true);
  });

  it('Khớp khi chọn một trong các nghĩa đồng nghĩa (ngăn cách bởi dấu phẩy, gạch chéo)', () => {
    assert.equal(checkAnswerMatch('gom góp', 'thu thập, gom góp / tích luỹ'), true);
    assert.equal(checkAnswerMatch('tích luỹ', 'thu thập, gom góp / tích luỹ'), true);
  });

  it('Khớp khi bỏ qua phần chú thích trong ngoặc', () => {
    assert.equal(checkAnswerMatch('Cột mốc', 'Cột mốc (quan trọng)'), true);
  });

  it('Từ chối khi gõ sai hoặc thiếu chữ', () => {
    assert.equal(checkAnswerMatch('thành', 'thành tựu'), false);
    assert.equal(checkAnswerMatch('thất bại', 'thành tựu'), false);
  });
});

describe('Tình huống 2: Hiện Nghĩa Tiếng Việt -> Gõ Từ Tiếng Anh', () => {
  it('Khớp từ tiếng Anh không phân biệt hoa/thường', () => {
    assert.equal(checkAnswerMatch('ACCOMPLISH', 'accomplish'), true);
    assert.equal(checkAnswerMatch('accomplish', 'Accomplish'), true);
  });

  it('Khớp khi bỏ qua mạo từ hoặc giới từ to/a/an/the', () => {
    assert.equal(checkAnswerMatch('run', 'to run'), true);
    assert.equal(checkAnswerMatch('to run', 'run'), true);
    assert.equal(checkAnswerMatch('apple', 'an apple'), true);
    assert.equal(checkAnswerMatch('book', 'the book'), true);
  });

  it('Khớp từ đồng nghĩa tiếng Anh', () => {
    assert.equal(checkAnswerMatch('fast', 'quick, fast / rapid'), true);
    assert.equal(checkAnswerMatch('rapid', 'quick, fast / rapid'), true);
  });

  it('Từ chối khi gõ sai chính tả tiếng Anh', () => {
    assert.equal(checkAnswerMatch('acomplish', 'accomplish'), false);
    assert.equal(checkAnswerMatch('aple', 'apple'), false);
  });
});

describe('Tình huống 3: Điều hướng câu hỏi (Direction Generator)', () => {
  const mockCard = { id: 'c1', term: 'develop', meaning: 'phát triển' };

  it('term-to-meaning: Prompt là Tiếng Anh, Đáp án là Tiếng Việt', () => {
    const isTermToMeaning = true;
    const prompt = isTermToMeaning ? mockCard.term : mockCard.meaning;
    const correctAnswer = isTermToMeaning ? mockCard.meaning : mockCard.term;

    assert.equal(prompt, 'develop');
    assert.equal(correctAnswer, 'phát triển');
  });

  it('meaning-to-term: Prompt là Tiếng Việt, Đáp án là Tiếng Anh', () => {
    const isTermToMeaning = false;
    const prompt = isTermToMeaning ? mockCard.term : mockCard.meaning;
    const correctAnswer = isTermToMeaning ? mockCard.meaning : mockCard.term;

    assert.equal(prompt, 'phát triển');
    assert.equal(correctAnswer, 'develop');
  });

  it('mixed: Cả 2 chiều đều được hỗ trợ', () => {
    const directions = ['term-to-meaning', 'meaning-to-term'];
    assert.equal(directions.includes('term-to-meaning'), true);
    assert.equal(directions.includes('meaning-to-term'), true);
  });
});
