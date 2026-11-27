/**
 * Smart written-answer matcher for Vocabulary Quiz.
 * - Allows word-order permutation when word count matches (e.g. "thu tiền" <-> "tiền thu")
 * - Case-insensitive, punctuation-insensitive, supports Vietnamese with/without diacritics
 * - Supports synonyms separated by comma, semicolon, slash, newline, "hoặc", "or"
 * - Supports text inside/outside parentheses
 */
export function checkAnswerMatch(userInput, targetAnswer) {
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

  const removeAccents = (str) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');

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

    if (normUser === normCand) return true;

    const normCandNoPart = stripEnglishParticles(normCand);
    if (normUserNoParticle && normCandNoPart && normUserNoParticle === normCandNoPart) return true;

    if (removeAccents(normUser) === removeAccents(normCand)) return true;
    if (removeAccents(normUserNoParticle) === removeAccents(normCandNoPart)) return true;

    const candWords = normCand.split(' ').filter(Boolean);

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

  if (matchesCandidate(targetAnswer)) return true;

  const withoutParens = targetAnswer.replace(/\(.*?\)|\[.*?\]/g, ' ');
  if (matchesCandidate(withoutParens)) return true;

  const rawParts = targetAnswer
    .normalize('NFC')
    .split(/[\n,;/]|\bhoặc\b|\bor\b/i);

  for (const part of rawParts) {
    if (matchesCandidate(part)) return true;
    const partWithoutParens = part.replace(/\(.*?\)|\[.*?\]/g, ' ');
    if (matchesCandidate(partWithoutParens)) return true;
  }

  const parensMatches = targetAnswer.match(/\((.*?)\)|\[(.*?)\]/g);
  if (parensMatches) {
    for (const match of parensMatches) {
      if (matchesCandidate(match)) return true;
    }
  }

  return false;
}
