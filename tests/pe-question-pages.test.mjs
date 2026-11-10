import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_CONTENT_ROOT } from '../scripts/lib/repository-paths.mjs';
import { extractClaims, extractQuestionSection, parseYearPage, questionKind, questionSection, scaffoldPage, subjectLabel, yearLabels } from '../scripts/lib/pe-question-pages.mjs';

const DIR = join(SITE_CONTENT_ROOT, 'pe-construction');
const read = (slug) => readFileSync(join(DIR, slug, 'article.mdx'), 'utf8');
const QUESTION_PAGE = /^(r0\d)-([a-z-]+?)-(i-[12]|ii-[12]-\d|iii-[12])$/;

test('既存の設問ページの問題文の節は、年度ページから作った節と一字一句同じ（DN-1073）', () => {
  const pages = readdirSync(DIR).map((d) => QUESTION_PAGE.exec(d)).filter(Boolean);
  assert.ok(pages.length >= 16, `設問ページが ${pages.length} 件しかない`);
  for (const [slug, year, subject, id] of pages) {
    const want = questionSection(parseYearPage(read(`${year}-${subject}`)), id.toUpperCase(), year);
    assert.equal(extractQuestionSection(read(slug)), want, slug);
  }
});

test('年度ページの 2 つの書き方（R07 の太字・R08 の見出し）と必須科目I から設問を切り出す', () => {
  for (const [slug, n] of [['r07-road', 8], ['r08-road', 8], ['r07-required', 2], ['r08-required', 2], ['r07-steel-concrete', 8]]) {
    const p = parseYearPage(read(slug));
    assert.equal(p.questions.size, n, slug);
    for (const [id, lines] of p.questions) assert.ok(lines[0].startsWith(`${id} `), `${slug} ${id} の先頭に設問番号`);
  }
  const r07 = parseYearPage(read('r07-road'));
  assert.ok(r07.questions.get('II-1-1')[0].startsWith('II-1-1 道路構造令'), '太字の設問番号を外して本文につなぐ');
  assert.ok(r07.instructions['II-1'].startsWith('II-1 次の4設問'));
});

test('骨組みは published: false・問題文の節・配分の枠・実在するキーワード記事へのリンクを持つ', () => {
  const p = parseYearPage(read('r08-road'));
  const text = scaffoldPage({ parsed: p, year: 'r08', subject: 'road', id: 'II-1-1', exists: (s) => existsSync(join(DIR, s, 'article.mdx')), yearCodes: ['r07', 'r08'] });
  assert.match(text, /^published: false$/m);
  assert.ok(text.includes(questionSection(p, 'II-1-1', 'r08')));
  assert.match(text, /title="答案用紙1枚（600字）の使い方"/);
  assert.match(text, /\/exam\/pe-construction\/keywords\/road-exam-themes/);
  assert.match(text, /\/exam\/pe-construction\/past-exams\/r07-road\)/);
});

test('年度・科目・設問の種類の読み取り', () => {
  assert.deepEqual(yearLabels('r01'), { long: '令和元年度', short: 'R1' });
  assert.deepEqual(yearLabels('r08'), { long: '令和8年度', short: 'R8' });
  assert.equal(subjectLabel('技術士第二次試験 建設部門 令和7年度 選択科目（0902 鋼構造及びコンクリート） 問題'), '鋼構造及びコンクリート');
  assert.equal(subjectLabel('技術士第二次試験 建設部門 令和8年度 必須科目I 問題'), '必須科目I');
  assert.deepEqual(questionKind('II-2-1'), { kind: 'II-2', sheets: 2 });
  assert.deepEqual(questionKind('I-2'), { kind: 'I', sheets: 3 });
});

test('照合文の抜き出し: 論点の解説の節で、数字・年月・条番号・出典リンクを含む文だけ（ファイルの行番号）', () => {
  const text = '---\ntitle: x\n---\n\n## II-1-1 問題文\n\n令和7年の問題。\n\n## 論点の解説：x\n\n### 節\n\n制度は令和7年に始まった。考え方を整理します。根拠は第20条の2です。\n\n詳しくは[資料](https://example.go.jp/a.pdf)にあります。\n\n## 問われていること\n\n令和8年。\n';
  const claims = extractClaims(text);
  assert.deepEqual(claims.map((c) => c.text), ['制度は令和7年に始まった。', '根拠は第20条の2です。', '詳しくは[資料](https://example.go.jp/a.pdf)にあります。']);
  assert.equal(claims[0].line, 13);
  assert.deepEqual(claims[2].urls, ['https://example.go.jp/a.pdf']);
});

test('scaffold --write は記事のフォルダを作って骨組みを書き、既存のページは上書きしない（2026-11-10 にフォルダが無く全件失敗した）', async () => {
  const { mkdtempSync, mkdirSync, copyFileSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { execFileSync } = await import('node:child_process');
  const root = mkdtempSync(join(tmpdir(), 'pe-q-'));
  try {
    mkdirSync(join(root, 'r08-road'));
    copyFileSync(join(DIR, 'r08-road', 'article.mdx'), join(root, 'r08-road', 'article.mdx'));
    mkdirSync(join(root, 'r08-road-ii-1-1'));
    writeFileSync(join(root, 'r08-road-ii-1-1', 'article.mdx'), 'KEEP');
    const out = execFileSync('node', [join(DIR, '..', '..', '..', 'scripts', 'pe-question-pages.mjs'), 'scaffold', '--year', 'r08', '--subject', 'road', '--write', '--root', root], { encoding: 'utf8' });
    assert.match(out, /作成 7 件・既存 1 件/);
    assert.equal(readFileSync(join(root, 'r08-road-ii-1-1', 'article.mdx'), 'utf8'), 'KEEP');
    assert.match(readFileSync(join(root, 'r08-road-iii-2', 'article.mdx'), 'utf8'), /^published: false$/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
