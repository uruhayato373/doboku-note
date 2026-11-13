// check-standards-density（/standards の密度ゲート）の回帰。純粋関数は fixtures、CLI は一時 out/ で exit 0/1/2 と --json を見る。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { templateOf, checkPage } from '../scripts/lib/standards-density.mjs';

const SCRIPT = join(REPO_ROOT, 'scripts', 'check-standards-density.mjs');
const FIX = join(REPO_ROOT, 'tests', 'fixtures', 'standards-density');
const fixture = (n) => readFileSync(join(FIX, `${n}.html`), 'utf8');
const rules = readDataset(REPO_ROOT, 'config.standards-page-density');
const rulesOf = (html, tpl) => checkPage(html, tpl, rules).map((x) => x.rule);

test('templateOf: out/ の名前からテンプレートを引く', () => {
  assert.equal(templateOf('standards.html'), 'top');
  assert.equal(templateOf('standards/kinki.html'), 'agency');
  assert.equal(templateOf('standards/kinki/common.html'), 'document');
  assert.equal(templateOf('standards/mlit/x/chapters/9-4.html'), 'chapter');
  assert.equal(templateOf('standards/mlit/x/chapters/9-4/sections/1.html'), 'section');
  for (const p of ['standards/data.html', 'standards/compare.html', 'standards/a/b/part-01.html', 'about.html', 'standards/a/b/toc.json']) {
    assert.equal(templateOf(p), null, p);
  }
});

test('合格ページは findings なし', () => {
  assert.deepEqual(checkPage(fixture('pass-agency'), 'agency', rules), []);
  assert.deepEqual(checkPage(fixture('pass-chapter'), 'chapter', rules), []);
  assert.deepEqual(checkPage(fixture('pass-top'), 'top', rules), []);
});

test('一覧より前の説明文が多いと proseBeforeContent（nav・h1 は数えない）', () => {
  const f = checkPage(fixture('too-much-prose'), 'agency', rules);
  assert.deepEqual(f.map((x) => x.rule), ['proseBeforeContent']);
  assert.equal(f[0].measured, 120);
});

test('一覧のリンクが 0 件だと minListLinks', () => {
  assert.deepEqual(rulesOf(fixture('too-few-links'), 'agency'), ['minListLinks']);
});

test('出典ブロックが 2 つだと attribution', () => {
  assert.deepEqual(rulesOf(fixture('two-attribution'), 'agency'), ['attribution']);
});

test('アフィリエイトのカード・リンクが上限（16 件）を超えると affiliate', () => {
  assert.deepEqual(rulesOf(fixture('affiliate'), 'agency'), ['affiliate']);
});

test('章を持たない文書（chapters 一覧なし）は minListLinks を課さない', () => {
  assert.deepEqual(rulesOf(fixture('pass-agency').replace('data-standards-list="documents"', 'data-standards-list="other"'), 'document'), []);
});

function makeOut(files) {
  const root = mkdtempSync(join(tmpdir(), 'standards-density-'));
  for (const [rel, name] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), fixture(name));
  }
  return root;
}
function run(outDir) {
  try {
    return { status: 0, json: JSON.parse(execFileSync(process.execPath, [SCRIPT, '--out', outDir, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) };
  } catch (e) {
    return { status: e.status, json: e.stdout ? JSON.parse(e.stdout) : null };
  }
}
const FULL = {
  'standards.html': 'pass-top',
  'standards/a.html': 'pass-agency',
  'standards/a/b.html': 'pass-agency',
  'standards/a/b/chapters/1.html': 'pass-chapter',
  'standards/a/b/chapters/1/sections/1.html': 'pass-chapter',
  'standards/data.html': 'too-much-prose',
};

test('全テンプレート合格なら exit 0・対象外ページは数えない', () => {
  const out = makeOut(FULL);
  try {
    const r = run(out);
    assert.equal(r.status, 0);
    assert.equal(r.json.templates.agency.checked, 1);
    assert.equal(r.json.templates.top.checked, 1);
    assert.equal(r.json.skipped, 1);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('違反が 1 つあれば exit 1 でページとルールを挙げる', () => {
  const out = makeOut({ ...FULL, 'standards/a/c.html': 'affiliate' });
  try {
    const r = run(out);
    assert.equal(r.status, 1);
    assert.deepEqual(r.json.findings.map((x) => [x.path, x.rule]), [['standards/a/c.html', 'affiliate']]);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('out/standards が無い・テンプレートが 0 ページは検査不成立（exit 2）', () => {
  assert.equal(run(join(tmpdir(), 'standards-density-missing-' + Date.now())).status, 2);
  const { 'standards/a/b/chapters/1/sections/1.html': _drop, ...noSection } = FULL;
  const out = makeOut(noSection);
  try {
    const r = run(out);
    assert.equal(r.status, 2);
    assert.deepEqual(r.json.inconclusive, ['section']);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
