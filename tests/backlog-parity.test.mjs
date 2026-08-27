import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBacklog, TODO_LAYER_FILES } from '../scripts/lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// .bin/tsx は Windows では拡張子なしの sh スクリプトで execFileSync できない（ENOENT）。
// JS エントリを node で直接叩く（shell 不要・OS 非依存）。
const TSX_CLI = join(ROOT, 'node_modules/tsx/dist/cli.mjs');

/**
 * admin TODO ボードと sweep が同じカードを見ていることを固定する。
 *
 * 守りたい事故（2026-08-18 に解消）:
 *   tools/admin-app/src/lib/todo.ts が backlog-lib.mjs を import せず**手書きの重複実装**を
 *   持っており、`実行:`/`検証:`/`起票:` を特別扱いせず「Codex候補 以外の最初の token」を
 *   category にしていた。`[種類:不具合]` を先頭に置くとカテゴリバッジが壊れる状態だった。
 *
 * いま todo.ts はアダプタなので値は同一のはずだが、**フィールド写像は独立に壊れる**
 * （kind の写像漏れ・category の取り違え）。それを捕まえるのがこのテスト。
 *
 * ルート tsconfig.json の exclude に tools/** があり `npm run type-check` は todo.ts を
 * 見ないので、ここが唯一の自動検証になる。
 */

function todoBoardFiles() {
  const out = execFileSync(
    process.execPath,
    [TSX_CLI,
      '-e',
      `import { todoBoard } from './tools/admin-app/src/lib/todo.ts';
       process.stdout.write(JSON.stringify(todoBoard().files));`,
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

function todoBoardBacklogCards() {
  // tsx は devDependency。無ければ skip せず落とす（検査ゼロを PASS と呼ばない・§9）
  const out = execFileSync(
    process.execPath,
    [TSX_CLI,
      '-e',
      `import { todoBoard } from './tools/admin-app/src/lib/todo.ts';
       const b = todoBoard();
       process.stdout.write(JSON.stringify(b.items.filter((i) => i.file === 'backlog')));`,
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

function todoBoardPlanCards(file) {
  const out = execFileSync(
    process.execPath,
    [TSX_CLI,
      '-e',
      `import { todoBoard } from './tools/admin-app/src/lib/todo.ts';
       const b = todoBoard();
       process.stdout.write(JSON.stringify(b.items.filter((i) => i.file === ${JSON.stringify(file)})));`,
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

test('admin の backlog カードが backlog-lib と全件一致する（line/tier/title/category/kind/codex）', () => {
  const fromAdmin = todoBoardBacklogCards();
  const fromLib = parseBacklog(readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8'));

  assert.ok(fromLib.length > 15, `カード数が異常に少ない: ${fromLib.length}`);
  assert.equal(fromAdmin.length, fromLib.length, 'admin と lib でカード数が違う');

  const key = (c) => [c.line, c.tier, c.title, c.category, c.kind ?? null, c.codex].join('|');
  const diff = [];
  for (let i = 0; i < fromLib.length; i += 1) {
    if (key(fromAdmin[i]) !== key(fromLib[i])) {
      diff.push(`  admin: ${key(fromAdmin[i])}\n  lib  : ${key(fromLib[i])}`);
    }
  }
  assert.deepEqual(diff, [], `写像がずれているカードがある:\n${diff.join('\n')}`);
});

test('todo.ts は自前のタグ分解を持たない（パーサの再分岐を禁じる）', () => {
  const src = readFileSync(join(ROOT, 'tools/admin-app/src/lib/todo.ts'), 'utf8');
  assert.match(
    src,
    /from '\.\.\/\.\.\/\.\.\/\.\.\/scripts\/lib\/backlog-lib\.mjs'/,
    'backlog-lib.mjs を import していない（重複実装に戻っている疑い）',
  );
  // タグ行の token 分解はパーサ側の責務。ここに書き戻されたら 2 実装が再発する。
  const backlogFn = src.slice(src.indexOf('function parseBacklog'), src.indexOf('function parseSections'));
  assert.doesNotMatch(
    backlogFn,
    /matchAll\(\/\\\[/,
    'todo.ts の parseBacklog にタグ分解が書き戻されている',
  );
});

test('admin の TODO タブ構成が backlog-lib の 4 層と一致する（層の二重管理を禁じる）', () => {
  // 2026-08-18 の .claude/todo 再編では、層を 3 つ減らしたあと admin の FILES を**手で**直した。
  // 層の集合を 2 箇所に書いている限り同じ手作業が要る。いまは TODO_LAYER_FILES が唯一の宣言で、
  // ここはそれが admin のタブに素通しで反映されることを固定する。
  const files = todoBoardFiles();
  assert.deepEqual(
    files.map((f) => f.path),
    TODO_LAYER_FILES.map((f) => '.claude/todo/' + f),
    'admin のタブが 4 層の宣言とズレている（LAYER_META か TODO_LAYER_FILES の更新もれ）',
  );
  // 表示メタを足し忘れると todo.ts が throw する設計なので、ここまで来れば全層にメタがある
  assert.ok(files.every((f) => f.label && f.id), 'ラベル/id が欠けた層がある');
});

test('週間・月間は章見出しではなく計画表の各行をタスクとして読む', () => {
  const weekly = todoBoardPlanCards('weekly');
  const monthly = todoBoardPlanCards('monthly');
  const weeklyLines = readFileSync(join(ROOT, '.claude/todo/weekly.md'), 'utf8').split(/\r?\n/);
  const monthlyLines = readFileSync(join(ROOT, '.claude/todo/monthly.md'), 'utf8').split(/\r?\n/);

  assert.ok(weekly.length >= 3, '週間タスクが標準の3件未満になっている');
  assert.ok(monthly.length >= 3, '月間タスクが3件未満になっている');
  assert.ok(weekly.every((item) => /^\||^-\s+\*\*/.test(weeklyLines[item.line - 1].trim())),
    '週間の表行・手動キュー以外がタスクへ混入している');
  assert.ok(monthly.every((item) => monthlyLines[item.line - 1].trim().startsWith('|')),
    '月間の表行以外がタスクへ混入している');
  assert.ok([...weekly, ...monthly].every((item) => item.source === 'plan'));
  assert.ok(!weekly.some((item) => /^今週やること|今週やらないこと|メモ・ブロッカー/.test(item.title)),
    '章見出しがタスクに戻っている');
  assert.ok(!monthly.some((item) => /^今月のゴール|今月やらないこと/.test(item.title)),
    '月間テーマ見出しがタスクに戻っている');
});
