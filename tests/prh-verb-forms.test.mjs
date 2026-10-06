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

// 法令の条文・用語の引用は原文の表記のまま（2026-10-06: 1級土木 H29 No.52 の解説が施行令 第6条を「」で引いた
// 「土止め支保工の…取付け又は取り外しの作業」「…足場の組立て，解体又は変更の作業」を prh が直せと止めた）。
// 同じ語の一般の用法は従来どおり揃える。
const legal = {
  keep: [
    '「土止め支保工の切りばり又は腹起こしの取付け又は取り外しの作業」と規定されている。',
    '「張出し足場又は高さが5m以上の構造の足場の組立て，解体又は変更の作業」と規定されている。',
    '足場の組立て、解体又は変更の作業を行う。',
  ],
  fix: ['土止め壁を設ける。', '金物の取付けを確認する。', '鉄筋の組立てを行う。'],
};

test('prh: 法令の条文・用語の引用は直さず、同じ語の一般の用法だけを指摘する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dn-prh-legal-'));
  try {
    const all = [...legal.keep, ...legal.fix];
    const file = join(dir, 'a.md');
    writeFileSync(file, all.join('\n\n') + '\n');
    const r = spawnSync('npx', ['textlint', '--format', 'unix', file], { encoding: 'utf8' });
    const flagged = new Set([...r.stdout.matchAll(/:(\d+):\d+: .*\[Error\/prh\]/g)].map((m) => all[(Number(m[1]) - 1) / 2]));
    for (const s of legal.keep) assert.equal(flagged.has(s), false, `条文の引用を指摘した: ${s}\n${r.stdout}${r.stderr}`);
    for (const s of legal.fix) assert.equal(flagged.has(s), true, `一般の用法を指摘しなかった: ${s}\n${r.stdout}${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
