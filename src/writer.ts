/** Convert a markdown file path like `Folder/Note.md` to a wikilink target `Folder/Note`. */
export function pathToWikiTarget(path: string): string {
  return path.replace(/\.md$/i, "");
}

/** Replace or append a level-2 "Related" section with the provided wiki-links. */
export function upsertRelatedSection(content: string, links: string[]): string {
  const uniqueLinks = Array.from(new Set(links));
  const relatedBlock = [
    "## Related",
    ...uniqueLinks.map((link) => `- [[${link}]]`),
  ];

  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const start = lines.findIndex((line) => /^##\s+Related\s*$/i.test(line));

  if (start === -1) {
    const body = normalized.trimEnd();
    return `${body}\n\n${relatedBlock.join("\n")}\n`;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const nextLines = [
    ...lines.slice(0, start),
    ...relatedBlock,
    ...lines.slice(end),
  ];

  return `${nextLines.join("\n").replace(/\n+$/g, "")}\n`;
}
