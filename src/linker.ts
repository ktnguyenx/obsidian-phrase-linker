// src/linker.ts
import { cosine, buildTfIdf, Vec } from "./vector";

export interface Suggestion {
  srcIdx: number;
  dstIdx: number;
  score: number;
}

export interface LinkerOptions {
  minScore?: number; // cosine threshold
  maxLinksPerNote?: number;
}

/** Compute related-note suggestions using cosine similarity on TF-IDF vectors. */
export function suggestLinks(
  tfs: Array<Map<string, number>>,
  opts: LinkerOptions = {}
): { tfidf: Vec[]; suggestions: Suggestion[] } {
  const { tfidf } = buildTfIdf(tfs);
  const minScore = opts.minScore ?? 0.22;
  const maxPer = opts.maxLinksPerNote ?? 5;

  const suggestions: Suggestion[] = [];
  for (let i = 0; i < tfidf.length; i++) {
    const scores: Array<{ j: number; s: number }> = [];
    for (let j = 0; j < tfidf.length; j++) {
      if (i === j) continue;
      const s = cosine(tfidf[i], tfidf[j]);
      if (s >= minScore) scores.push({ j, s });
    }
    scores.sort((a, b) => b.s - a.s);
    for (let k = 0; k < Math.min(maxPer, scores.length); k++) {
      suggestions.push({ srcIdx: i, dstIdx: scores[k].j, score: +scores[k].s.toFixed(3) });
    }
  }
  return { tfidf, suggestions };
}