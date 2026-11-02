export interface MatchScore {
  score: number;
  matched: boolean;
  isExact: boolean;
  isPrefix: boolean;
}

/**
 * Calculates string relevance score between query and target (title, url, keywords).
 */
export function scoreStringMatch(query: string, target: string): MatchScore {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (!q || !t) {
    return { score: 0, matched: false, isExact: false, isPrefix: false };
  }

  // Exact match
  if (q === t) {
    return { score: 1000, matched: true, isExact: true, isPrefix: true };
  }

  // Prefix match
  if (t.startsWith(q)) {
    return { score: 600 + (q.length / t.length) * 100, matched: true, isExact: false, isPrefix: true };
  }

  // Word boundary match (e.g. "gh" in "github" or "agent" in "autonomous agent")
  const words = t.split(/[\s\-_\.:/]+/);
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith(q)) {
      return { score: 450 - i * 15, matched: true, isExact: false, isPrefix: true };
    }
  }

  // Substring match
  const idx = t.indexOf(q);
  if (idx !== -1) {
    return { score: 300 - Math.min(idx * 5, 100), matched: true, isExact: false, isPrefix: false };
  }

  // Fuzzy acronym / subsequence match (e.g. "gm" -> "gmail", "yt" -> "youtube")
  let qIdx = 0;
  let matches = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
      matches++;
    }
  }

  if (matches === q.length && q.length >= 2) {
    return { score: 120 + (q.length / t.length) * 50, matched: true, isExact: false, isPrefix: false };
  }

  // Multi-token match: If query contains multiple words (e.g. "flowmate portal"), ensure all tokens match
  const tokens = q.split(/\s+/).filter((tok) => tok.length > 0);
  if (tokens.length > 1) {
    let allMatched = true;
    let totalScore = 0;
    for (const token of tokens) {
      const subMatch = scoreStringMatch(token, t);
      if (!subMatch.matched) {
        allMatched = false;
        break;
      }
      totalScore += subMatch.score;
    }
    if (allMatched) {
      const avgScore = totalScore / tokens.length;
      return { score: avgScore + 150, matched: true, isExact: false, isPrefix: false };
    }
  }

  return { score: 0, matched: false, isExact: false, isPrefix: false };
}

/**
 * Checks whether all query tokens are present in target.
 */
export function matchQueryTokens(target: string, tokens: string[]): boolean {
  const t = target.toLowerCase();
  return tokens.every((token) => t.includes(token.toLowerCase()));
}

/**
 * Applies time-decay to past visits.
 * Half-life decay over 7 days.
 */
export function computeRecencyBonus(lastVisitTime?: number): number {
  if (!lastVisitTime) return 0;
  const daysAgo = (Date.now() - lastVisitTime) / (1000 * 60 * 60 * 24);
  if (daysAgo < 0) return 50;
  // Decay factor: half-life ~ 5 days
  return Math.round(80 * Math.pow(0.5, daysAgo / 5));
}

/**
 * Applies logarithmic boost for frequent visits.
 */
export function computeFrequencyBonus(visitCount?: number): number {
  if (!visitCount || visitCount <= 0) return 0;
  return Math.min(80, Math.round(Math.log2(visitCount + 1) * 18));
}
