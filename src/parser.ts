// Minimal stopword list (expand later).
const STOPWORDS = new Set([
  "the","a","an","of","to","and","in","is","it","that","for","on","with",
  "as","at","by","be","are","was","were","this","from","or","but","so"
]);

/** Convert text → tokens (lowercase letters/numbers), minus stopwords. */
export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[#*_\[\](){}<>`~^=+|:\\/]/g, " ") // strip md punctuation-ish
    .replace(/[^\p{L}\p{N}\s-]/gu, " ");        // keep letters/numbers/spaces/hyphens
  const raw = cleaned.split(/\s+/).filter(Boolean);
  return raw.filter(t => !STOPWORDS.has(t));
}

/** Count tokens into a frequency map. */
export function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/** Return top K {term,count} pairs for debug/preview. */
export function topK(freq: Map<string, number>, k = 10): Array<{ term: string; count: number }> {
  return [...freq.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0, k)
    .map(([term, count]) => ({ term, count }));
}
