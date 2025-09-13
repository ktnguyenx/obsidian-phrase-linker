// src/vector.ts
export type Vocab = Map<string, number>; // term -> index
export type Vec = Float32Array;

export interface TfIdfResult {
  vocab: Vocab;
  idf: Float32Array;
  tfidf: Vec[]; // one per doc
}

/** Build a vocab and doc frequency counts */
export function buildVocabAndDf(docs: Array<Map<string, number>>): { vocab: Vocab; df: Uint32Array } {
  const vocab: Vocab = new Map();
  let next = 0;

  // first pass: collect terms
  for (const tf of docs) {
    for (const term of tf.keys()) {
      if (!vocab.has(term)) vocab.set(term, next++);
    }
  }

  const df = new Uint32Array(vocab.size);
  // second pass: count in how many docs term appears
  for (const tf of docs) {
    for (const term of tf.keys()) {
      const idx = vocab.get(term)!;
      df[idx] += 1;
    }
  }
  return { vocab, df };
}

/** Compute IDF = log( (N + 1) / (df + 1) ) + 1 (smoothed) */
export function computeIdf(df: Uint32Array, N: number): Float32Array {
  const idf = new Float32Array(df.length);
  for (let i = 0; i < df.length; i++) {
    idf[i] = Math.log((N + 1) / (df[i] + 1)) + 1;
  }
  return idf;
}

/** Convert TF map -> dense tf-idf vector */
export function tfToVec(tf: Map<string, number>, vocab: Vocab, idf: Float32Array): Vec {
  const v = new Float32Array(vocab.size);
  let maxTf = 0;
  tf.forEach((cnt) => { if (cnt > maxTf) maxTf = cnt; });
  const normTf = maxTf > 0 ? (c: number) => c / maxTf : (_: number) => 0;

  tf.forEach((cnt, term) => {
    const idx = vocab.get(term);
    if (idx === undefined) return;
    v[idx] = normTf(cnt) * idf[idx];
  });
  return v;
}

/** Cosine similarity between two vectors */
export function cosine(a: Vec, b: Vec): number {
  let dot = 0, na = 0, nb = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Build TF-IDF for all docs */
export function buildTfIdf(docs: Array<Map<string, number>>): TfIdfResult {
  const { vocab, df } = buildVocabAndDf(docs);
  const idf = computeIdf(df, docs.length);
  const tfidf = docs.map(tf => tfToVec(tf, vocab, idf));
  return { vocab, idf, tfidf };
}