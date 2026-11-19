// quality-cycle の log-rewrite・merge-scores は、総監用と土木用で本体を 1 つにしてある（scripts-common）。
// 期待値は、まとめる前の 2 本ずつを同じ入力で動かして採った結果（2026-11-19）。
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRewriteResults } from '../.claude/skills/quality-cycle/scripts-common/log-rewrite-core.mjs';
import { applyScoreResults } from '../.claude/skills/quality-cycle/scripts-common/merge-scores-core.mjs';
import { computeWeighted as civilWeighted } from '../.claude/skills/quality-cycle/scripts-civil-textbook/lib/civil-state.mjs';

const REWRITE = [{"slug":"zz-fixture-a","wave":"T-1","applied_patterns":["G","D"],"added_sections":["## 参考資料"],"converted_tables":0,"migrated_images":5,"before_chars":100,"after_chars":150,"added_chars":50,"lint_high_before":1,"lint_high_after":0,"lint_medium_before":4,"lint_medium_after":0,"mojibake":false,"ignored":"x"},{"slug":"zz-fixture-a","wave":"T-1","after_chars":160},{"slug":"zz-fixture-b","converted_tables":2},{"wave":"T-1"},null];
const SCORES = [{"slug":"zz-fixture-a","group":"textbook","scores":{"structure":3,"mobile":2,"principle":3,"reference":1,"linking":2,"figures":1},"qualitative_comment":"c"},{"slug":"zz-fixture-b","scores":{"structure":0,"mobile":3,"principle":3,"reference":3,"linking":3,"figures":3},"weak_axes":["structure"]},{"slug":"zz-fixture-c"},null];
// 総監の重み（scripts-cem/merge-scores.mjs と同じ式）
const CEM_WEIGHTS = { structure: 0.30, mobile: 0.25, principle: 0.20, reference: 0.15, linking: 0.10 };
const cemWeighted = (s) => {
  const raw = Object.entries(CEM_WEIGHTS).reduce((acc, [k, w]) => acc + (s[k] || 0) * w, 0);
  return Object.values(s).some((v) => v === 0) ? Math.min(raw, 1.0) : parseFloat(raw.toFixed(2));
};
const clone = (o) => JSON.parse(JSON.stringify(o));

test('log-rewrite: 総監は wave の無い結果を飛ばし、migrated_images を写さない', () => {
  const state = { pages: {} };
  const r = applyRewriteResults(state, clone(REWRITE), { omit: ['migrated_images'], now: 'T' });
  assert.deepEqual(r, { merged: 1, appended: 1, skipped: 3 });
  assert.deepEqual(state.pages, {"zz-fixture-a":{"status":"rewritten","history":[{"date":"T","action":"rewritten","wave":"T-1","applied_patterns":["G","D"],"added_sections":["## 参考資料"],"converted_tables":0,"before_chars":100,"after_chars":160,"added_chars":50,"lint_high_before":1,"lint_high_after":0,"lint_medium_before":4,"lint_medium_after":0,"mojibake":false}]}});
});

test('log-rewrite: 土木は wave が無ければ次の周回として記録し、migrated_images を写す', () => {
  const state = { cycle: 0, pages: {} };
  const r = applyRewriteResults(state, clone(REWRITE), { defaultWave: (s) => `W${(s.cycle || 0) + 1}`, now: 'T' });
  assert.deepEqual(r, { merged: 1, appended: 2, skipped: 2 });
  assert.deepEqual(state.pages, {"zz-fixture-a":{"status":"rewritten","history":[{"date":"T","action":"rewritten","wave":"T-1","applied_patterns":["G","D"],"added_sections":["## 参考資料"],"converted_tables":0,"migrated_images":5,"before_chars":100,"after_chars":160,"added_chars":50,"lint_high_before":1,"lint_high_after":0,"lint_medium_before":4,"lint_medium_after":0,"mojibake":false}]},"zz-fixture-b":{"status":"rewritten","history":[{"date":"T","action":"rewritten","wave":"W1","converted_tables":2}]}});
});

test('merge-scores: 総監は group を持たない', () => {
  const state = { pages: {} };
  const r = applyScoreResults(state, clone(SCORES), { computeWeighted: cemWeighted, now: 'T' });
  assert.deepEqual(r, { merged: 2, skipped: 2 });
  assert.deepEqual(state.pages, {"zz-fixture-a":{"slug":"zz-fixture-a","scores":{"structure":3,"mobile":2,"principle":3,"reference":1,"linking":2,"figures":1},"weighted":2.35,"weak_axes":["reference","figures"],"qualitative_comment":"c","scored_at":"T"},"zz-fixture-b":{"slug":"zz-fixture-b","scores":{"structure":0,"mobile":3,"principle":3,"reference":3,"linking":3,"figures":3},"weighted":1,"weak_axes":["structure"],"qualitative_comment":"","scored_at":"T"}});
});

test('merge-scores: 土木は group を持ち、1 オブジェクトの入力も受ける', () => {
  const state = { pages: {} };
  const r = applyScoreResults(state, clone(SCORES), { computeWeighted: civilWeighted, withGroup: true, now: 'T' });
  assert.deepEqual(r, { merged: 2, skipped: 2 });
  assert.deepEqual(state.pages, {"zz-fixture-a":{"slug":"zz-fixture-a","group":"textbook","scores":{"structure":3,"mobile":2,"principle":3,"reference":1,"linking":2,"figures":1},"weighted":2.1,"weak_axes":["reference","figures"],"qualitative_comment":"c","scored_at":"T"},"zz-fixture-b":{"slug":"zz-fixture-b","group":null,"scores":{"structure":0,"mobile":3,"principle":3,"reference":3,"linking":3,"figures":3},"weighted":1,"weak_axes":["structure"],"qualitative_comment":"","scored_at":"T"}});
  const one = { pages: {} };
  assert.deepEqual(applyScoreResults(one, clone(SCORES[0]), { computeWeighted: civilWeighted, withGroup: true, now: 'T' }), { merged: 1, skipped: 0 });
  assert.deepEqual(one.pages['zz-fixture-a'], state.pages['zz-fixture-a']);
});
