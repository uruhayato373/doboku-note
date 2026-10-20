// E2E と Lighthouse の起動条件（DN-0803）: サイトの画面とビルドの手順が変わる PR だけで回す。
// 以前は scripts/** と content/** を丸ごと含み、検査や運用のスクリプトだけの PR でも 10 分の E2E が回っていた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChainFiles } from '../scripts/lib/build-chain.mjs';
import { escapeRegExp } from '../scripts/lib/regexp-escape.mjs';

function prPaths(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((l) => /^\s{2}pull_request:/.test(l));
  const out = [];
  let inPaths = false;
  for (const l of lines.slice(start + 1)) {
    if (/^\s{4}paths:/.test(l)) { inPaths = true; continue; }
    if (!inPaths) continue;
    const m = /^\s{6}- "([^"]+)"/.exec(l);
    if (m) out.push(m[1]);
    else if (/^\s{0,4}\S/.test(l)) break;
  }
  return out;
}
/** GitHub の paths のグロブ（** と *）を正規表現にする（依存を足さない最小の照合） */
const glob = (p) => new RegExp('^' + p.split('**').map((part) => part.split('*').map(escapeRegExp).join('[^/]*')).join('.*') + '$');
const triggers = (paths) => (f) => {
  let hit = false;
  for (const p of paths) {
    if (p.startsWith('!')) { if (glob(p.slice(1)).test(f)) hit = false; } else if (glob(p).test(f)) hit = true;
  }
  return hit;
};

const E2E = prPaths('.github/workflows/e2e.yml');
const LH = prPaths('.github/workflows/lighthouse.yml');

test('E2E の起動条件を読めている（0 件を合格にしない）', () => {
  assert.ok(E2E.length > 15, `E2E の paths が ${E2E.length} 件`);
  assert.ok(LH.length > 5, `Lighthouse の paths が ${LH.length} 件`);
});

test('ビルドの手順のスクリプトは全部 E2E を起動する（手順を変えたらここが落ちる）', () => {
  const chain = buildChainFiles(JSON.parse(readFileSync('package.json', 'utf8')).scripts);
  assert.ok(chain.length > 10, `ビルドの手順のスクリプトが ${chain.length} 本しか取れない`);
  const e2e = triggers(E2E);
  assert.deepEqual(chain.filter((f) => !e2e(f)), [], 'e2e.yml の paths に足す');
});

test('サイトの画面の変更は E2E と Lighthouse を起動し、検査・運用・SNS・note だけの変更は起動しない', () => {
  const e2e = triggers(E2E);
  const lh = triggers(LH);
  for (const f of ['src/lib/toc.ts', 'content/site/a/b/article.mdx', 'public/images/x.webp', 'package-lock.json']) {
    assert.ok(e2e(f), `E2E: ${f}`);
    assert.ok(lh(f), `Lighthouse: ${f}`);
  }
  for (const f of ['scripts/check-datasets.mjs', 'scripts/lib/qualification-ssot.mjs', 'tests/x.test.mjs', 'content/note/x/article.md', 'content/sns/x/tweets.md', 'package.json', '.claude/todo/backlog.md']) {
    assert.ok(!e2e(f), `E2E が起動する: ${f}`);
    assert.ok(!lh(f), `Lighthouse が起動する: ${f}`);
  }
});
