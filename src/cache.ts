// src/cache.ts
export interface ParsedNote {
  hash: string;
  tokens: string[];
  tf: Map<string, number>;
}

export class NoteCache {
  private map = new Map<string, ParsedNote>(); // key: file path

  get(path: string, hash: string): ParsedNote | undefined {
    const entry = this.map.get(path);
    if (!entry) return undefined;
    return entry.hash === hash ? entry : undefined;
  }

  set(path: string, value: ParsedNote) {
    this.map.set(path, value);
  }

  clear() {
    this.map.clear();
  }
}

/** Tiny djb2 hash for strings (stable across sessions) */
export function contentHash(s: string): string {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  // stringify as hex to keep short-ish
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}