import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkLedger, claudeQueue, loadLedger, recordKey, recordVerdicts, similarScenes, similarity, stalePages, textWidth } from '../scripts/lib/site-thumbnails-pipeline.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const review = { sampleRate: 0, similarScene: 0.6, riskWords: ['クレーン'] };

test('textWidth: 全角 1・半角 0.5 で数える', () => {
  assert.equal(textWidth('土工 R7'), 3.5);
});

test('similarScenes: 似た題材の組だけを返す', () => {
  assert.equal(similarity('ブルドーザが土を敷きならす', 'ブルドーザが土を敷きならす'), 1);
  const rows = [{ key: 'a', scene: 'ブルドーザが盛土を敷きならしている現場' }, { key: 'b', scene: 'ブルドーザが盛土を敷きならしている現場。' }, { key: 'c', scene: '試験室でスランプ試験をする技術者' }];
  assert.deepEqual(similarScenes(rows, 0.6), [['a', 'b']]);
});

test('checkLedger: 足りない行と長すぎる行を分ける', () => {
  const input = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
  const out = checkLedger(input, [{ key: 'a', text: '土工', scene: 's' }, { key: 'b', text: '全角で十二文字ある文字列です', scene: 's' }, { key: 'x', text: '余計', scene: 's' }]);
  assert.deepEqual(out.missing, ['c']);
  assert.deepEqual(out.tooLong, ['b']);
  assert.deepEqual(out.rows.map((row) => row.key), ['a', 'b']);
  assert.deepEqual(checkLedger(input, null).missing, ['a', 'b', 'c']);
});

test('claudeQueue: 理由のある行だけを返し、Codex の判定が無い行は必ず含める', () => {
  const rows = [{ key: 'ok', scene: '教室' }, { key: 'flag', scene: '教室' }, { key: 'risk', scene: 'クレーンの吊上げ' }, { key: 'none', scene: '教室' }, { key: 'sim', scene: '教室' }];
  const reviewed = [{ key: 'ok', verdict: 'ok', reason: '' }, { key: 'flag', verdict: 'minor', reason: 'r' }, { key: 'risk', verdict: 'ok', reason: '' }, { key: 'sim', verdict: 'ok', reason: '' }];
  const queue = claudeQueue(rows, reviewed, [['sim', 'x']], review);
  assert.deepEqual(queue.map((row) => [row.key, row.reasons]), [['flag', ['codex:minor']], ['risk', ['risk']], ['none', ['codex-missing']], ['sim', ['similar-scene']]]);
});

test('claudeQueue: 抜き取りは実行ごとに変わらない', () => {
  const rows = Array.from({ length: 200 }, (_, i) => ({ key: `k${i}`, scene: '教室' }));
  const reviewed = rows.map((row) => ({ key: row.key, verdict: 'ok', reason: '' }));
  const first = claudeQueue(rows, reviewed, [], { ...review, sampleRate: 0.2 });
  assert.deepEqual(first, claudeQueue(rows, reviewed, [], { ...review, sampleRate: 0.2 }));
  assert.ok(first.length > 20 && first.length < 60);
});

test('recordVerdicts: 台帳に無い行と不正な判定を止める', () => {
  const ledger = { figures: { [recordKey('e', 'a')]: { sha: 'x' } } };
  recordVerdicts(ledger, 'e', [{ key: 'a', verdict: 'ok', reason: '' }], 'codex', 't');
  assert.equal(ledger.figures[recordKey('e', 'a')].verdict, 'ok');
  assert.throws(() => recordVerdicts(ledger, 'e', [{ key: 'b', verdict: 'ok' }], 'codex', 't'));
  assert.throws(() => recordVerdicts(ledger, 'e', [{ key: 'a', verdict: 'minor' }], 'codex', 't'));
});

test('stalePages: 絵が無いページと画風の版が古いページを返す', () => {
  const ledger = { figures: { [recordKey('e', 'a')]: { styleVersion: 2 }, [recordKey('e', 'b')]: { styleVersion: 1 } } };
  assert.deepEqual(stalePages({ a: { version: 'v' }, b: { version: 'v' }, c: {} }, ledger, 'e', 2), ['b', 'c']);
});

test('公開の台帳: 全ページの版が AI 台帳の sha と一致し、判定が ok', () => {
  const config = JSON.parse(readFileSync(join(REPO_ROOT, 'config/site-thumbnails.json'), 'utf8'));
  const ledger = loadLedger(REPO_ROOT);
  const rows = Object.entries(config.pages).flatMap(([exam, pages]) => Object.entries(pages).map(([key, page]) => ({ exam, key, page })));
  assert.ok(rows.length > 0, '検査 0 件');
  for (const { exam, key, page } of rows) {
    if (!page.version) continue;
    const entry = ledger.figures[recordKey(exam, key)];
    assert.equal(entry?.sha?.slice(0, 8), page.version, `${exam}/${key} の版が台帳と違う`);
    assert.equal(entry?.verdict, 'ok', `${exam}/${key} が未判定か不合格`);
    assert.equal(entry?.styleVersion, config.styleVersion, `${exam}/${key} の画風の版が古い`);
  }
});
