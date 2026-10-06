// prh の送り仮名統一は名詞だけを揃える。動詞の活用（仕上がります・受け入れる・を組み合わせ）を置換対象にすると、
// lint-ja --staged に従って直した文が誤りになる（2026-10-06: 「答案に仕上がります」→「答案に仕上ります」）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const lines = {
  verb: ['答案に仕上がります。', '前期に仕上がりやすい。', '早く仕上がりそうだ。', '移住者を受け入れる。', '工法を組み合わせて使う。'],
  noun: ['仕上がりの確認をする。', '移住者の受け入れを進める。', '工法の組み合わせが典型だ。'],
};

test('prh: 動詞の活用は指摘せず、名詞だけを指摘する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dn-prh-'));
  try {
    const all = [...lines.verb, ...lines.noun];
    const file = join(dir, 'a.md');
    writeFileSync(file, all.join('\n\n') + '\n');
    const r = spawnSync('npx', ['textlint', '--format', 'unix', file], { encoding: 'utf8' });
    const flagged = new Set([...r.stdout.matchAll(/:(\d+):\d+: .*\[Error\/prh\]/g)].map((m) => all[(Number(m[1]) - 1) / 2]));
    for (const s of lines.verb) assert.equal(flagged.has(s), false, `動詞を指摘した: ${s}\n${r.stdout}${r.stderr}`);
    for (const s of lines.noun) assert.equal(flagged.has(s), true, `名詞を指摘しなかった: ${s}\n${r.stdout}${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
