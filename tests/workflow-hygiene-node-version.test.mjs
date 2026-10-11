// check-workflow-hygiene ルール 10（node-version の統一）の回帰ゲート（DN-0689・2026-10-11）。
// それまで node-version は "20" が 32 か所・"22" が 13 か所で混在していた（Node 20 は 2026-04 に EOL）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findNonStandardNodeVersions, NODE_VERSION } from '../scripts/check-workflow-hygiene.mjs';

test('22 以外の node-version を行番号つきで検出する（引用符の有無を問わない）', () => {
  const yml = 'steps:\n  - uses: actions/setup-node@abc\n    with:\n      node-version: "20"\n  - uses: x\n    with:\n      node-version: 18\n      node-version: \'22\'';
  const hits = findNonStandardNodeVersions(yml);
  assert.deepEqual(hits.map((h) => [h.line, h.version]), [[4, '20'], [7, '18']]);
});

test('22 だけなら検出しない。コメント内は見ない', () => {
  assert.deepEqual(findNonStandardNodeVersions('      node-version: "22"\n      # node-version: "20" は使わない'), []);
  assert.equal(NODE_VERSION, '22');
});

test('空・非文字列でも落ちない', () => {
  assert.deepEqual(findNonStandardNodeVersions(''), []);
  assert.deepEqual(findNonStandardNodeVersions(undefined), []);
});
