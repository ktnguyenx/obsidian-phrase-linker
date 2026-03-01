import test from 'node:test';
import assert from 'node:assert/strict';

import {
  pathToWikiTarget,
  normalizeWikiTarget,
  extractWikiTargets,
  upsertRelatedSection,
} from '../dist/test-writer.mjs';

test('pathToWikiTarget strips .md suffix', () => {
  assert.equal(pathToWikiTarget('Folder/Note.md'), 'Folder/Note');
  assert.equal(pathToWikiTarget('Folder/Note.MD'), 'Folder/Note');
});

test('normalizeWikiTarget removes alias and anchor', () => {
  assert.equal(normalizeWikiTarget('Folder/Note|Alias'), 'Folder/Note');
  assert.equal(normalizeWikiTarget('Folder/Note#Section'), 'Folder/Note');
  assert.equal(normalizeWikiTarget(' Folder/Note#Section|Alias '), 'Folder/Note');
});

test('extractWikiTargets returns normalized unique targets', () => {
  const content = [
    'Intro [[Folder/One]]',
    'Alias [[Folder/Two|Two title]]',
    'Anchor [[Folder/Three#Part A]]',
    'Dup [[Folder/One]]',
  ].join('\n');

  const targets = extractWikiTargets(content);
  assert.deepEqual([...targets].sort(), ['Folder/One', 'Folder/Three', 'Folder/Two']);
});

test('upsertRelatedSection appends a new section when missing', () => {
  const content = '# Title\n\nBody text.\n';
  const out = upsertRelatedSection(content, ['Folder/A', 'Folder/B']);

  assert.match(out, /## Related/);
  assert.match(out, /- \[\[Folder\/A\]\]/);
  assert.match(out, /- \[\[Folder\/B\]\]/);
});

test('upsertRelatedSection replaces existing Related section', () => {
  const content = [
    '# Title',
    '',
    '## Related',
    '- [[Old/Link]]',
    '',
    '## Next',
    'More text',
  ].join('\n');

  const out = upsertRelatedSection(content, ['New/One']);

  assert.doesNotMatch(out, /Old\/Link/);
  assert.match(out, /- \[\[New\/One\]\]/);
  assert.match(out, /## Next/);
});
