import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditProjectDoc } from '../scripts/check-project-task-refs.mjs';
import { parseBacklog } from '../scripts/lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IDS = new Set(['DN-0001', 'DN-0026']);

/**
 * docs/（恒久文書）↔ backlog の結線検査を固定する。
 *
 * 守りたい事故:
 *   - 廃止済み task-queue.json（2026-06-11 廃止・ファイル不在）を進捗 SSOT として案内する記述が
 *     現役文書に残り、読んだ人が存在しない台帳を探す
 *   - backlog から消えた ID を恒久文書が指したままになる
 *   - 「次のアクション」に実行タスクを書いたまま台帳へ出てこない
 * `_archive` は履歴として死んだパスを持てるので検査対象外にする（ここを間違えると
 * 過去の記録を直させる誤検知が大量に出る）。
 */

test('active 文書の task-queue.json 参照は error（フルパスでも裸でも 1 件ずつ）', () => {
  // フルパスは「.claude/state/…」と「裸の task-queue.json」の 2 パターンに当たりうるが、
  // 裸パターンは lookbehind で `/` 直後を除外しているので二重計上しない
  const full = auditProjectDoc('docs/strategy/x.md', '進捗は `.claude/state/task-queue.json` を参照', IDS);
  assert.deepEqual(full.errors.map((e) => e.rule), ['retired-ref']);
  const bare = auditProjectDoc('docs/strategy/x.md', '失敗時は task-queue.json に追記', IDS);
  assert.deepEqual(bare.errors.map((e) => e.rule), ['retired-ref']);
  const both = auditProjectDoc('docs/strategy/a.md', '`.claude/state/task-queue.json` と task-queue.json', IDS);
  assert.equal(both.errors.length, 2, '2 箇所の言及は 2 件として数える');
});

// 2026-08-18: docs/project/_archive を 3 件個別に分類して消した時点で、「履歴だから検査しない層」は
// 無くなった。逃げ場を残すとそこが検査の穴になるので、**どの恒久文書でも廃止参照は error**。
test('アーカイブ層は無い — どの恒久文書でも廃止参照は error', () => {
  const { errors } = auditProjectDoc('docs/strategy/old.md', '`task-queue.json` を参照', IDS);
  assert.deepEqual(errors.map((e) => e.rule), ['retired-ref']);
});

test('backlog に無い DN-#### は error、実在する ID は通す', () => {
  const bad = auditProjectDoc('docs/strategy/a.md', '関連タスク: `DN-9999`', IDS);
  assert.deepEqual(bad.errors.map((e) => e.rule), ['dangling-id']);
  const ok = auditProjectDoc('docs/strategy/a.md', '関連タスク: `DN-0026`', IDS);
  assert.deepEqual(ok.errors, []);
});

// 2026-08-25: この台帳は「完了＝カードごと削除」で完了を表すので、週次レビューが実績を
// 「DN-XXXX 完了」と ID で書くと翌週には必ず参照切れになる＝**片付けるほど赤くなる**。
// 偽赤は偽緑と同じくらい信号を殺すので、日付つきスナップショットに限って warning へ降格する。
// live 文書（作業指示書として今も読まれるレビューを含む）は error のまま——ここを緩めると
// 「読者を存在しないタスクへ案内する」本来の実害が拾えなくなる。
test('週次スナップショットの参照切れは warning、live 文書は error のまま', () => {
  const md = '- R2 台帳外の一掃（`DN-9999` 完了）';
  const snap = auditProjectDoc('docs/reviews/weekly/2026-W35-review.md', md, IDS);
  assert.deepEqual(snap.errors, [], '週次スナップショットで error にしない');
  assert.deepEqual(snap.warnings.map((w) => w.rule), ['dangling-id']);

  // 同じ reviews/ でも weekly/ の外は live 扱い（例: 作業指示書として参照され続ける静的監査）
  const live = auditProjectDoc('docs/reviews/2026-07-11-static-ui-codebase-audit.md', md, IDS);
  assert.deepEqual(live.errors.map((e) => e.rule), ['dangling-id']);

  // 廃止参照は週次でも error（降格するのは dangling-id だけ）
  const retired = auditProjectDoc('docs/reviews/weekly/2026-W35-review.md', '`task-queue.json` 参照', IDS);
  assert.deepEqual(retired.errors.map((e) => e.rule), ['retired-ref']);
});

test('「次のアクション」配下の ID 無し未チェックは warning、ID か criterion があれば出さない', () => {
  const base = ['## 次のアクション', '', '- [ ] 何かをする'].join('\n');
  assert.deepEqual(auditProjectDoc('docs/strategy/a.md', base, IDS).warnings.map((w) => w.rule), [
    'action-without-id',
  ]);
  const withId = ['## 次のアクション', '', '- [ ] 何かをする（`DN-0001`）'].join('\n');
  assert.deepEqual(auditProjectDoc('docs/strategy/a.md', withId, IDS).warnings, []);
  const withCriterion = ['## 次のアクション', '', '- [ ] 受入条件 <!-- criterion -->'].join('\n');
  assert.deepEqual(auditProjectDoc('docs/strategy/a.md', withCriterion, IDS).warnings, []);
});

test('次のアクション以外の見出し配下の未チェックは warning にしない（受入条件が混ざるため）', () => {
  const md = ['## 受入条件', '', '- [ ] 字数検査が通る'].join('\n');
  assert.deepEqual(auditProjectDoc('docs/strategy/a.md', md, IDS).warnings, []);
});

// 実リポジトリに対する健全性（検査ゼロを PASS と呼ばない・§9）
test('実 docs/ は error 0（廃止参照・参照切れなし）', () => {
  const backlog = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  const ids = new Set(parseBacklog(backlog).map((c) => c.id).filter(Boolean));
  assert.ok(ids.size > 15, `backlog ID が異常に少ない: ${ids.size}`);

  const walk = (dir, out = []) => {
    if (!existsSync(dir)) return out;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith('.md')) out.push(p);
    }
    return out;
  };
  const files = walk(join(ROOT, 'docs'));
  assert.ok(files.length > 30, `docs/ の .md が異常に少ない: ${files.length}`);

  const errors = files.flatMap((abs) => {
    const rel = `docs/${abs.slice(join(ROOT, 'docs').length + 1).split('\\').join('/')}`;
    return auditProjectDoc(rel, readFileSync(abs, 'utf8'), ids).errors;
  });
  assert.deepEqual(errors, [], `error: ${JSON.stringify(errors.slice(0, 5), null, 2)}`);
});
