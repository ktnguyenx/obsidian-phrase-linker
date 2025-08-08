import { Vault, TAbstractFile, TFile } from "obsidian";

export interface ScanOptions {
  ignoreFolders?: string[]; // e.g., ["Templates/", "Archive/"]
}

/** Return all markdown notes in the vault, respecting ignore folders (prefix match). */
export function listMarkdownFiles(vault: Vault, opts: ScanOptions = {}): TFile[] {
  const ignores = (opts.ignoreFolders ?? []).map(normalizePrefix);

  const isIgnored = (path: string) => ignores.some(prefix => path.startsWith(prefix));
  const isMd = (f: TAbstractFile): f is TFile => f instanceof TFile && f.extension === "md";

  const all = vault.getAllLoadedFiles(); // includes folders & files
  return all.filter(isMd).filter(f => !isIgnored(f.path));
}

/** For convenience when checking prefixes like "Templates/" vs "Templates". */
function normalizePrefix(p: string): string {
  return p.endsWith("/") ? p : p + "/";
}

/** Read a file's text. Caller should ensure it's an md TFile. */
export async function readFile(vault: Vault, file: TFile): Promise<string> {
  return vault.read(file);
}

/** True if a path lives inside any ignored folder. Reusable in event handlers. */
export function isPathIgnored(path: string, ignoreFolders: string[] = []): boolean {
  const prefixes = ignoreFolders.map(normalizePrefix);
  return prefixes.some(pref => path.startsWith(pref));
}
