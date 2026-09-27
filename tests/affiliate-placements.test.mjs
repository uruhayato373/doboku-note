import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { affiliatePlacements } from '../scripts/lib/affiliate-placements.mjs';

test('掲載先ごとに a8mat を案件へ引き、読んだ件数を返す', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'dn-aff-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src/config'), { recursive: true });
  mkdirSync(join(root, 'content/note/a'), { recursive: true });
  mkdirSync(join(root, 'content/site/x'), { recursive: true });
  writeFileSync(join(root, 'src/config/affiliate-mats.json'), JSON.stringify({ mats: [{ mat: 'AA+BB+CC+DD', program: 'buildjob', expiresAt: null }] }));
  writeFileSync(join(root, 'content/note/a/article.md'), "---\nnoteStatus: published\ntitle: '転職'\n---\nhttps://px.a8.net/svt/ejp?a8mat=AA+BB+CC+DD\n");
  writeFileSync(join(root, 'content/site/x/article.mdx'), 'リンクなし');
  const [site, note, sns] = affiliatePlacements(root);
  assert.equal(site.scanned, 1); // content/site の article.mdx（src の json は対象外）
  assert.equal(site.links.length, 0);
  assert.deepEqual(note.links.map((l) => [l.program, l.status, l.title]), [['buildjob', 'published', '転職']]);
  assert.equal(sns.scanned, 0);
});
