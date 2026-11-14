import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { inspectHtml, auditDirectory } from '../scripts/check-cta-density.mjs';

const note = (id, placement = 'article-body', label = id) => `<a data-cta-label="${label}" href="https://note.com/test/m/${id}?utm_content=${label}" data-cta-placement="${placement}" data-cta="note">教材</a>`;
const ab = n => `<div data-note-body-arm="image">${n}</div><div data-note-body-arm="text">${n}</div>`;
const article = (body, top = '', footer = '') => `<main><article>${top}<div class="prose-blog">${body}</div></article>${footer}</main>`;
const inspect = html => inspectHtml(html, 'exam/civil-construction-1/guide/test');
const rules = html => inspect(html).violations.map(v => v.rule);
const affiliate = (placement = 'article-mid', extra = '') => `<a data-cta="affiliate" rel="nofollow sponsored noopener" data-cta-placement="${placement}" ${extra}>転職</a>`;

test('3枚の異なる商品と別枠のもくじは違反なし、無料 note は数えない', () => {
  const hub = p => note('contents', p, 'category-test-hub-mokuji');
  const r = inspect(article(`<h2>本文</h2>${note('b')}${note('c')}<a data-cta="note-article">無料</a>`, note('a', 'article-top'), `${hub('article-footer')}<aside>${hub('article-sidebar')}</aside>`));
  assert.equal(r.noteCount, 5);
  assert.deepEqual(r.violations, []);
});

test('ラベル末尾によらず手書き4枚を数え、最初のh2前の2枚を検出', () => {
  const r = inspect(article(`${note('a')}${note('b')}<h2>本文</h2>${note('c')}${note('d')}`));
  assert.deepEqual(r.violations.map(v => v.rule), ['note-non-footer', 'note-before-first-h2']);
  assert.deepEqual(r.violations[0].causes, ['manual-manual']);
});

test('隣接するA/Bの2案は1枚。同じ商品を別枠で再掲すれば重複', () => {
  assert.deepEqual(rules(article(`<h2>本文</h2>${ab(note('a'))}${ab(note('b'))}${ab(note('c'))}`)), []);
  const r = inspect(article(`<h2>本文</h2>${ab(note('a', 'article-body', 'manual'))}`, note('a', 'article-top', 'auto')));
  assert.equal(r.noteCount, 2);
  assert.equal(r.violations[0].rule, 'note-product-dup');
  assert.deepEqual(r.violations[0].causes, ['auto-manual']);
});

test('同じラベルの手書き2枠もA/Bごとに保持し、手書き同士の重複を検出', () => {
  const r = inspect(article(`<h2>本文</h2>${ab(note('a'))}${ab(note('a'))}`));
  assert.equal(r.noteCount, 2);
  assert.deepEqual(r.violations[0].causes, ['manual-manual']);
});

test('対応しない実験案や別の兄弟で隔てた枠を一緒にしない', () => {
  for (const body of [
    `<div data-note-body-arm="image">${note('a')}</div><div data-note-body-arm="text">${note('b')}</div>`,
    `<div data-note-body-arm="image">${note('a')}</div><p>区切り</p><div data-note-body-arm="text">${note('a')}</div>`,
  ]) assert.equal(inspect(article(`<h2>本文</h2>${body}`)).noteCount, 2);
});

test('h2が無い記事も冒頭の連続配置を検出', () => {
  assert.ok(rules(article(`${note('a')}${note('b')}`)).includes('note-before-first-h2'));
});

test('記事末・サイドバーの各note上限は1枚', () => {
  assert.deepEqual(rules(article('<h2>本文</h2>', '', note('a', 'article-footer') + note('b', 'article-footer'))), ['note-article-footer']);
});

test('本文の転職1枠は許容、2枠は違反。EXP-048の2社gridは1枠', () => {
  assert.deepEqual(rules(article(`<h2>本文</h2>${affiliate()}`)), []);
  assert.deepEqual(rules(article(`<h2>本文</h2>${affiliate()}${affiliate()}`)), ['affiliate-slots']);
  const pair = `<div class="grid grid-cols-2">${affiliate('article-mid', 'data-cta-variant="B2"')}${affiliate('article-mid', 'data-cta-variant="B2"')}</div>`;
  assert.deepEqual(rules(article(`<h2>本文</h2>${pair}`)), []);
  assert.ok(rules(article(`<h2>本文</h2>${pair}${pair}`)).includes('affiliate-slots'));
});

test('記事下とasideのsponsoredリンクはdata-ctaが無くても検出', () => {
  for (const footer of ['<a rel="sponsored">PR</a>', '<aside><a rel="noopener sponsored">PR</a></aside>']) {
    assert.deepEqual(rules(article('<h2>本文</h2>', '', footer)), ['affiliate-forbidden-surface']);
  }
  assert.ok(rules(article(`<h2>本文</h2>${affiliate('article-end')}`)).includes('affiliate-forbidden-surface'));
  assert.ok(rules(`<div>${article('<h2>本文</h2>')}<aside class="hidden zenn-desktop:block"><a rel="sponsored">PR</a></aside></div>`).includes('affiliate-forbidden-surface'));
});

test('993pxで切り替える2案を同時表示として数えず、PCの追加枠は見落とさない', () => {
  const responsive = `<div class="hidden zenn-desktop:block">${affiliate()}</div><div class="zenn-desktop:hidden">${affiliate()}</div>`;
  assert.deepEqual(rules(article(`<h2>本文</h2>${responsive}`)), []);
  const r = inspect(`<div>${article(`<h2>本文</h2>${responsive}`)}<aside class="hidden zenn-desktop:block">${affiliate('standards-sidebar')}</aside></div>`);
  assert.deepEqual(r.violations.find(v => v.rule === 'affiliate-slots').slotsByViewport, { mobile: 1, desktop: 2 });
});

test('非記事カテゴリの広告面は対象外。ピクセル重複ガードは維持', () => {
  assert.deepEqual(rules(`<main><aside>${affiliate()}${affiliate()}</aside></main>`), []);
  const pixel = '<img src="https://px.a8.net/0.gif?a8mat=A+B+C+D" width="1" height="1">';
  assert.deepEqual(rules(`${pixel}<script>${pixel}</script>`), []);
  assert.deepEqual(rules(pixel + '<span hidden data-a8-pixel="https://px.a8.net/0.gif?a8mat=A+B+C+D"></span>'), ['affiliate-pixel-dup']);
  const mo = '<img src="https://i.moshimo.com/af/i/impression?a_id=1&amp;p_id=2&amp;pl_id=3">';
  assert.deepEqual(rules(mo + mo), ['affiliate-pixel-dup']);
});

test('RSC・style・templateの文字列は数えない', () => {
  assert.equal(inspect(article(`<h2>本文</h2>${note('a')}<script>${note('a')}</script><template>${note('a')}</template>`)).noteCount, 1);
});

test('非記事のnote総数30の上限を維持し、無料noteは上限に含めない', () => {
  assert.deepEqual(rules(Array.from({ length: 30 }, (_, i) => note(`p${i}`)).join('')), []);
  assert.deepEqual(rules(Array.from({ length: 31 }, (_, i) => note(`p${i}`)).join('')), ['note-total']);
  assert.deepEqual(rules('<a data-cta="note-article">無料</a>'.repeat(31)), []);
});

test('CLIは検査0件でexit 1、違反ありで1、違反なしで0。集計に実検査数を残す', () => {
  const tempRoot = join(REPO_ROOT, '.tmp');
  mkdirSync(tempRoot, { recursive: true });
  const dir = mkdtempSync(join(tempRoot, 'cta-density-'));
  const cli = () => spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/check-cta-density.mjs'), '--out', dir, '--json'], { encoding: 'utf8' });
  try {
    let r = cli();
    assert.equal(r.status, 1);
    assert.equal(JSON.parse(r.stdout).checkedPages, 0);
    writeFileSync(join(dir, 'ok.html'), article(`<h2>本文</h2>${ab(note('a'))}`));
    mkdirSync(join(dir, 'pagefind'));
    writeFileSync(join(dir, 'pagefind', 'ignored.html'), note('a'));
    r = cli();
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).files, 1);
    writeFileSync(join(dir, 'bad.html'), article(`<h2>本文</h2>${note('a')}${note('a')}`));
    r = cli();
    assert.equal(r.status, 1);
    const report = auditDirectory(dir);
    assert.equal(report.checkedPages, 2);
    assert.equal(report.violationCount, 1);
    assert.equal(report.byPageTypeAndCause[0].cause, 'manual-manual');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
