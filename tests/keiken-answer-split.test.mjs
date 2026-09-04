import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { test } from 'node:test';
import { analyzeText, loadLimits, SCAN_TARGETS } from '../scripts/lib/keiken-answer-split.mjs';

const limits = loadLimits(process.cwd());
const audit = (text, file) => analyzeText({ text, file, limits }).violations;
const types = (rows) => rows.map((row) => row.type);

test('A: 現行形式の裸ラベルで1級(2)に検討項目を置く書き方を捕捉する', () => {
  const rows = audit('## 現行形式\n（2）検討した項目と対応処置と評価', 'civil-construction-1/fixture.md');
  assert.ok(rows.some((row) => row.slot === 2 && row.type === 'A'));
});

test('A: 2級(1)への検討混入と(2)の対応処置欠落を捕捉する', () => {
  const q1 = audit('## 現行形式\n設問1には現場状況・技術的課題と検討した項目を書きます。', 'civil-construction-2/fixture.md');
  const q2 = audit('## 現行形式\n設問2には検討した項目を記述します。', 'civil-construction-2/fixture.md');
  assert.ok(q1.some((row) => row.slot === 1));
  assert.ok(q2.some((row) => row.slot === 2 && /両方/.test(row.why)));
});

test('A: 括弧なしの「設問2：検討項目」も捕捉する', () => {
  const rows = audit('## 現行形式\n設問2：検討した項目と対応処置と評価', 'civil-construction-1/fixture.md');
  assert.ok(rows.some((row) => row.type === 'A' && row.slot === 2));
});

test('B: 緩い字数表現と同一文書の行数不一致を捕捉する', () => {
  const rows = audit([
    '# 施工経験記述 current2',
    '各区画おおむね250字前後を目安にします。',
    '[[記入欄:8|① 現場状況・技術的課題と検討した項目]]',
    '各区画7行・200字です。',
  ].join('\n'), 'civil-construction-1/fixture.md');
  assert.ok(rows.filter((row) => row.type === 'B').length >= 2);
});

test('B: 「文字」表記の字数不一致も捕捉する', () => {
  const rows = audit('# 施工経験記述 current2\n各区画250文字です。', 'civil-construction-1/fixture.md');
  assert.ok(rows.some((row) => row.type === 'B'));
});

test('C: 配点表の検討要素が誤った側なら捕捉する', () => {
  const rows = audit('## 現行形式の配点表\n| (2) | 検討した項目 | 3点 |', 'civil-construction-1/fixture.md');
  assert.ok(rows.some((row) => row.type === 'C' && row.slot === 2));
});

test('D: 散文の「設問2では検討を書く」を捕捉し、外側のテーマ番号は誤検知しない', () => {
  const bad = audit('# 施工経験記述 current2\n設問2では検討した項目を書きます。', 'civil-construction-1/fixture.md');
  const neutral = audit('# 施工経験記述 current2\n設問2（環境対策）は粉じん対策を扱います。', 'civil-construction-1/fixture.md');
  assert.ok(bad.some((row) => row.type === 'D'));
  assert.equal(neutral.length, 0);
});

test('E: 旧3項目を現行として提示する文を捕捉する', () => {
  const rows = audit('# 施工経験記述\n## 令和6年度以降の現行形式\n課題→検討→処置の3段構成です。', 'civil-construction-2/fixture.md');
  assert.ok(types(rows).includes('E'));
});

test('legacy3 節、参照表現、級別の正しい割り振りは通す', () => {
  const civil1 = audit([
    '# 施工経験記述',
    '## 現行形式 current2',
    '（1）現場状況・技術的課題と検討した項目',
    '（2）（1）で検討した項目の対応処置とその評価',
    '（2）検討項目ごとの対応処置とその評価',
    '（2）検討結果を踏まえた対応処置とその評価',
    '## 旧形式 legacy3（〜R05）',
    '（2）検討した項目と検討理由及び内容',
    '（3）対応処置とその評価',
  ].join('\n'), 'civil-construction-1/fixture.md');
  const civil2 = audit([
    '# 施工経験記述 current2',
    '（1）現場状況・技術的課題',
    '（2）検討した項目とその対応処置',
    '（2）（1）の技術的課題を解決するために検討した項目とその対応処置',
    '- (1) に現場状況と技術的課題、(2) に検討した項目と対応処置が入っているか。',
  ].join('\n'), 'civil-construction-2/fixture.md');
  assert.deepEqual(civil1, []);
  assert.deepEqual(civil2, []);
});

test('要求された全走査領域と Brain ZIP をスコープに固定する', () => {
  const paths = new Set(SCAN_TARGETS.map((target) => `${target.kind}:${target.path}`));
  for (const expected of [
    'dir:content/note/1級・2級土木',
    'dir:content/site/civil-construction-1',
    'dir:content/site/civil-construction-2',
    'dir:content/coconala/blog',
    'dir:.claude/config/coconala/assets/moshi-src',
    'dir:content/sns',
    'dir:content/kindle',
    'dir:.claude/agents',
    'dir:docs',
    'zip-glob:content/brain/dist',
    'file:.claude/config/coconala-listings.json',
    'file:content/brain/listings.json',
  ]) assert.ok(paths.has(expected), `走査スコープ欠落: ${expected}`);
});

test('Brain 同一URL上書きは単一ZIPへ限定し、成功後に同じ配布URLのCDNキャッシュを消す', () => {
  const zip = 'claude-code-civil-essay-kit-beta-8K93ERd_D6fR.zip';
  const output = execFileSync('node', ['scripts/upload-brain-dist-r2.mjs', '--dry-run', '--file', zip, '--overwrite'], { encoding: 'utf8' });
  assert.match(output, new RegExp(`\\[dry overwrite\\] brain/dist/${zip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  const unsafe = spawnSync('node', ['scripts/upload-brain-dist-r2.mjs', '--dry-run', '--overwrite'], { encoding: 'utf8' });
  assert.equal(unsafe.status, 1);
  assert.match(unsafe.stderr, /--file/);
  const workflow = readFileSync('.github/workflows/r2-brain-dist.yml', 'utf8');
  assert.match(workflow, /overwrite == 'true'/);
  assert.match(workflow, /r2\/buckets\/doboku-note\/domains\/custom/);
  assert.match(workflow, /zones\/\$ZONE_ID\/purge_cache/);
  assert.match(workflow, /storage\.doboku-note\.com\/brain\/dist\/\$DIST_FILE/);
});
