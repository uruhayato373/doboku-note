import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { applyReplacements, validateAgentResult, waitingReason } from '../scripts/lib/seo-rank-watch-ci.mjs';

const original = '---\ntitle: 試験対策\nseoTitle: 試験対策の方法\ndescription: 試験を学ぶ手順です\npublished: true\nnoindex: false\ncategory: civil-construction-1\n---\n\n## 学習手順\n\n最初に過去問を確認する。次に条件を整理する。繰り返し練習する。\n';
const patch = { old: '最初に過去問を確認する。', new: '最初に過去問を確認し、設問が指定する数と範囲を整理する。' };
test('a unique bounded replacement preserves existing structure', () => {
  assert.ok(applyReplacements(original.replace(/\n/g, '\r\n'), [patch]).includes(patch.new));
});
test('reject missing, ambiguous, empty and excessive edits', () => {
  for (const changes of [[], [patch, patch, patch, patch], [{ old: '', new: '追加' }], [{ old: '不存在', new: '追加' }], [{ old: 'する。', new: '整理する。' }]]) assert.throws(() => applyReplacements(original, changes));
});
test('noindex, publication, route metadata and headings cannot be changed automatically', () => {
  for (const [old, next] of [['noindex: false','noindex: true'],['published: true','published: false'],['category: civil-construction-1','category: other'],['## 学習手順','## 異なる構成']]) assert.throws(() => applyReplacements(original, [{ old, new: next }]));
});
test('reject executable markup, oversized replacement and absent metadata', () => {
  for (const replacement of [{ ...patch, new: '<script>bad()</script>' }, { ...patch, new: 'x'.repeat(8001) }, { old: 'seoTitle: 試験対策の方法', new: 'seoTitle: null' }]) assert.throws(() => applyReplacements(original, [replacement]));
});
test('waiting or monitoring cannot be turned into an improvement by agent output', () => {
  assert.throws(() => validateAgentResult({ selected: null }, { reason: '候補がないのに変更しようとする', policyReview: null, improvement: { watchId: 'test' } }), /selected keyword/);
  assert.throws(() => validateAgentResult({ selected: { id: 'first' } }, { reason: '選定された語とは異なる変更', policyReview: null, improvement: { watchId: 'second' } }), /selected keyword/);
  assert.throws(() => validateAgentResult({}, { reason: '不明な任意ファイルへ保存する', path: '/tmp/private' }));
});
test('policy review cannot be silently omitted or falsely logged before due', () => {
  assert.throws(() => validateAgentResult({ policyReviewDue: true }, { reason: '確認を行わずに終了しようとする', policyReview: null, improvement: null }), /not performed/);
  assert.throws(() => validateAgentResult({ policyReviewDue: false }, { reason: '期限を勝手に更新しようとする', policyReview: '確認したことにする', improvement: null }), /not due/);
});
test('accept a complete decision, but reject model-supplied ledger provenance', () => {
  const result = { reason: '検索ニーズへの不足を確認したので説明を補足する。', policyReview: null, improvement: { watchId: 'one', action: { method: 'intro', needs: '学習の手順を確認したい受験者', gap: '冒頭で学習の順序が明確ではない', done: '既存の導入に学習の順序を補足する', serp: [{ url: 'https://example.com', gap: '学習順の違い' }] }, replacements: [patch] } };
  assert.equal(validateAgentResult({ selected: { id: 'one' } }, result), result);
  result.improvement.action.rankAtAction = 1;
  assert.throws(() => validateAgentResult({ selected: { id: 'one' } }, result), /action fields/);
});
test('CI prepare/apply records waiting once without changing experiments, and rejects stale context', t => {
  const root = mkdtempSync(join(tmpdir(), 'seo-ci-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const save = (path, value) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), JSON.stringify(value)); };
  const config = JSON.parse(readFileSync('.claude/config/seo-watchwords.json', 'utf8'));
  config.strategy.reviewedAt = new Date().toISOString().slice(0, 10);
  save('.claude/config/seo-watchwords.json', config);
  for (const name of ['business-direction', 'exam-calendar']) save(`.claude/config/${name}.json`, JSON.parse(readFileSync(`.claude/config/${name}.json`, 'utf8')));
  const ledger = { experiments: [{ id: 'EXISTING1', status: 'running' }, { id: 'EXISTING2', status: 'running' }] };
  save('.claude/state/experiments.json', ledger);
  const cli = resolve('scripts/seo-rank-watch-ci.mjs');
  const run = command => execFileSync(process.execPath, [cli, command, '--dir', join(root, 'output')], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  run('prepare');
  assert.equal(JSON.parse(readFileSync(join(root, 'output/context.json'), 'utf8')).selected, null);
  run('apply'); run('apply');
  const history = join(root, '.claude/state/metrics/gsc/rank-watch');
  assert.equal(readdirSync(history).length, 1);
  const entry = JSON.parse(readFileSync(join(history, readdirSync(history)[0]), 'utf8'));
  assert.equal(entry.result, 'capacity-limit');
  assert.deepEqual(JSON.parse(readFileSync(join(root, '.claude/state/experiments.json'), 'utf8')), ledger);
  save('.claude/state/experiments.json', { ...ledger, editedConcurrently: true });
  assert.throws(() => run('apply'), /Prepared context changed/);
});
test('capacity waiting records the existing experiments instead of closing them', () => {
  assert.match(waitingReason({ capacity: false, activeExperiments: [{ id: 'EXP-007', nextReviewDate: '2026-09-18' }] }), /EXP-007/);
});
