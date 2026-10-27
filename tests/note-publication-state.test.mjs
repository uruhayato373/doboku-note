/**
 * note の公開状態の判定（scripts/lib/note-publication-state.mjs・npm run note-unpublished）。
 * 2026-10-28、frontmatter を `^---\n` の正規表現で直読みし、CRLF の記事 692 本を「未公開」と数えた。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseNoteArticle } from '../scripts/lib/note-frontmatter.mjs';
import { notePublicationState, notePublishGaps } from '../scripts/lib/note-publication-state.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('CRLF の記事でも noteId を読み、公開済みと判定する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'note-state-'));
  try {
    const path = join(dir, 'article.md');
    writeFileSync(path, '---\r\nnotePricing: free\r\nnoteId: "na1f84193571a"\r\nnoteStatus: published\r\ntitle: "t"\r\n---\r\n# t\r\n本文\r\n');
    const article = parseNoteArticle(path);
    assert.equal(notePublicationState(article.data).state, 'published');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('noteId が無ければ noteStatus で下書きか記録なしかを分け、食い違いを返す', () => {
  assert.deepEqual(notePublicationState({ noteStatus: 'draft' }), { state: 'draft', conflicts: [] });
  assert.equal(notePublicationState({}).state, 'unrecorded');
  assert.equal(notePublicationState({ noteUrl: 'https://note.com/dobokunote/n/n6b1410beec5c' }).state, 'published');
  assert.equal(notePublicationState({ noteId: 'n1', noteStatus: 'draft' }).conflicts.length, 1);
  assert.equal(notePublicationState({ noteStatus: 'published' }).conflicts.length, 1);
});

test('表紙は img/cover.png ではなく frontmatter の cover で判定し、有料は価格と境界の見出しを要る', () => {
  const free = { data: { title: 't', cover: { headline: 'h' } }, body: '# t\n本文', isPaid: false };
  assert.deepEqual(notePublishGaps(free, { hasHashtags: true, coverTarget: true }), []);
  const paid = { data: { title: 't', cover: { headline: 'h' }, price: 980, paidBoundary: '解き方の型' }, body: '## 導入\n\n## 解き方の型\n', isPaid: true };
  assert.deepEqual(notePublishGaps(paid, { hasHashtags: true, coverTarget: true }), []);
  const broken = { data: { title: 't' }, body: '## 導入\n', isPaid: true };
  assert.equal(notePublishGaps(broken, { hasHashtags: false, coverTarget: true }).length, 4);
});

test('npm run note-unpublished はリポジトリの全記事を読めて、公開済みを未公開に数えない', () => {
  const r = spawnSync(process.execPath, ['scripts/note-unpublished.mjs', '--json'], { cwd: REPO_ROOT, encoding: 'utf8' });
  const out = JSON.parse(r.stdout);
  assert.ok(out.counts.scanned > 0, '記事を 1 本も走査していない');
  assert.deepEqual(out.unreadable, [], 'frontmatter を読めない記事がある');
  assert.ok(out.counts.published > out.unpublished.length, '公開済みより未公開が多い（読み取りが壊れている疑い）');
});
