import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findForwardMarkers,
  extractWeeklyHandoffItems,
  parseRouting,
  findHome,
  checkWeeklyDeletion,
  checkWeeklyRouting,
  routingRequired,
  normalizeForMatch,
  completedIdsFromDispatchLog,
  experimentIdsFrom,
} from '../scripts/lib/handoff-extraction.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts/check-handoff-extraction.mjs');

// DN-0230: W37 の申し送りは台帳に居場所が無いまま旧レビューごと削除された。その形を再現する。
const OLD_REVIEW = [
  '# 週次レビュー 2026-W38',
  '',
  '## 学び',
  '- 残タスク（申し送り節の外なので週次ゲートの対象外）',
  '',
  '## 来週への申し送り',
  '',
  '- DN-0100 の計測を記録',
  '- EXP-007 の裁定',
  '- #485 index coverage の切り分け',
  '- **09-15** knip の再検査',
  '  - 子行: DN-0200 に関連',
  '- ローカル依存の note drift 解消',
  '- PR #621 の後処理',
  '',
].join('\n');

const ctxBase = () => ({
  backlogIds: new Set(['DN-0100']),
  completedIds: new Set(['DN-0200']),
  experimentIds: new Set(['EXP-007']),
  carriedTexts: [],
});

test('申し送り節のトップレベル項目だけを拾い、子行は親に連結する', () => {
  const { hasSection, items } = extractWeeklyHandoffItems(OLD_REVIEW);
  assert.equal(hasSection, true);
  assert.deepEqual(items.map((i) => i.line), [8, 9, 10, 11, 13, 14]);
  assert.match(items[3].text, /DN-0200/);
  // 「次週への申し送り」（計画ファイル側の見出し）も同じ節として扱う
  assert.equal(extractWeeklyHandoffItems('## 次週への申し送り\n- a\n## 別\n- b').items.length, 1);
  // 「なし」は項目に数えない・節が無ければ hasSection=false
  assert.equal(extractWeeklyHandoffItems('## 来週への申し送り\n- なし').items.length, 0);
  assert.equal(extractWeeklyHandoffItems('## 学び\n- a').hasSection, false);
});

test('居場所: backlog / 完了記録 / 実験 / Issue / 定常 / 同文転記 のどれかで可、PR 番号は居場所ではない', () => {
  const ctx = ctxBase();
  assert.equal(findHome('DN-0100 の計測', ctx).via, 'backlog');
  assert.equal(findHome('DN-0200 を閉じた', ctx).via, 'completed');
  assert.equal(findHome('EXP-007 の裁定', ctx).via, 'experiment');
  assert.equal(findHome('#485 の切り分け', ctx).via, 'issue');
  assert.equal(findHome('drift 解消 → 振り分け: 定常', ctx).via, 'routine');
  assert.equal(findHome('PR #621 の後処理', ctx), null);
  assert.equal(findHome('DN-9999 の幽霊', ctx), null);
  const carried = { ...ctxBase(), carriedTexts: [normalizeForMatch('## 来週への申し送り\n- **ローカル依存の** note drift 解消 → 振り分け: 定常')] };
  assert.equal(findHome('ローカル依存の note drift 解消', carried).via, 'carried');
});

test('削除ゲート: 居場所の無い項目だけを行番号付きで返す', () => {
  const r = checkWeeklyDeletion(OLD_REVIEW, ctxBase());
  assert.equal(r.items, 6);
  assert.deepEqual(r.missing.map((m) => m.line), [13, 14]);
  assert.deepEqual(r.homes, { backlog: 1, experiment: 1, issue: 1, completed: 1 });
});

test('振り分け必須: 振り分け先の欠落・語彙外・未起票 DN・未登録 EXP を止める', () => {
  const review = [
    '## 来週への申し送り',
    '- a → 振り分け: DN-0100',
    '- b → 振り分け: 定常',
    '- c → 振り分け: #485',
    '- d → 振り分け: EXP-007',
    '- e（振り分け無し）',
    '- f → 振り分け: そのうち',
    '- g → 振り分け: DN-0999',
    '- h → 振り分け: EXP-099',
  ].join('\n');
  const r = checkWeeklyRouting(review, ctxBase());
  assert.equal(r.items, 8);
  assert.deepEqual(r.problems.map((p) => p.line), [6, 7, 8, 9]);
  assert.match(r.problems[2].reason, /DN-0999 が backlog に無い/);
  assert.equal(parseRouting('x → 振り分け：DN-0100').dnIds[0], 'DN-0100');
  assert.equal(routingRequired('2026-W38'), false);
  assert.equal(routingRequired('2026-W39'), true);
});

test('handoff の前送りマーカー検出（既存ルール2の判定部品）', () => {
  const hits = findForwardMarkers('# h\n完了\n残タスク: A\n🔴 B');
  assert.deepEqual(hits.map((h) => [h.line, h.marker]), [[3, '残タスク'], [4, '🔴']]);
});

test('台帳 JSON から完了 ID と実験 ID を読む', () => {
  const done = completedIdsFromDispatchLog({ entries: [{ id: 'DN-1', outcome: 'done' }, { id: 'DN-2', outcome: 'swept' }, { id: 'DN-3', outcome: 'blocked' }] });
  assert.deepEqual([...done], ['DN-1', 'DN-2']);
  assert.deepEqual([...experimentIdsFrom({ experiments: [{ id: 'EXP-001' }] })], ['EXP-001']);
  assert.equal(completedIdsFromDispatchLog(null).size, 0);
});

// --- pre-commit と同じ呼び方（--staged・index ベース）で CLI を回す ---

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'handoff-extract-'));
  const g = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  g('init', '-q');
  g('config', 'user.email', 't@example.com');
  g('config', 'user.name', 't');
  const write = (p, s) => {
    mkdirSync(join(dir, dirname(p)), { recursive: true });
    writeFileSync(join(dir, p), s);
  };
  write('.claude/todo/backlog.md', '# backlog\n\n## 🔴 High\n\n### [DN-0100] 計測\nタグ: [運用] [種類:改善]\n\n本文\n');
  write('.claude/state/dispatch/dispatch-log.json', JSON.stringify({ entries: [{ id: 'DN-0200', outcome: 'done' }] }));
  write('.claude/state/experiments.json', JSON.stringify({ experiments: [{ id: 'EXP-007' }] }));
  write('docs/reviews/weekly/2026-W38-review.md', OLD_REVIEW);
  g('add', '-A');
  g('commit', '-q', '-m', 'init');
  const run = () => spawnSync('node', [SCRIPT, '--staged'], { cwd: dir, encoding: 'utf8', env: { ...process.env, SKIP_HANDOFF_EXTRACT: '' } });
  return { dir, g, write, run };
}

test('CLI: 旧週レビューを抽出せずに削除するコミットは exit 1 で止まる', () => {
  const { dir, g, write, run } = makeRepo();
  try {
    g('rm', '-q', 'docs/reviews/weekly/2026-W38-review.md');
    write('docs/reviews/weekly/2026-W39-review.md', '# 週次レビュー 2026-W39\n\n## 来週への申し送り\n\n- 新しい話題 → 振り分け: DN-0100\n');
    g('add', 'docs/reviews/weekly/2026-W39-review.md');
    const r = run();
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /weekly-extract-before-delete\] docs\/reviews\/weekly\/2026-W38-review\.md/);
    assert.match(r.stderr, /L13 ローカル依存の note drift 解消/);
    assert.match(r.stderr, /L14 PR #621 の後処理/);
    assert.match(r.stdout, /申し送り 6 項目・居場所あり 4/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: 起票・転記・振り分けを済ませた削除は通る', () => {
  const { dir, g, write, run } = makeRepo();
  try {
    g('rm', '-q', 'docs/reviews/weekly/2026-W38-review.md');
    // knip は backlog へ起票（同一コミットの index 版 backlog を読む）、drift は定常へ、他は同文転記
    write(
      '.claude/todo/backlog.md',
      '# backlog\n\n## 🔴 High\n\n### [DN-0100] 計測\nタグ: [運用] [種類:改善]\n\n本文\n\n### [DN-0301] knip 再検査\nタグ: [運用] [種類:改善]\n\n本文\n'
    );
    write(
      'docs/reviews/weekly/2026-W39-review.md',
      [
        '# 週次レビュー 2026-W39',
        '',
        '## 来週への申し送り',
        '',
        '- **09-15** knip の再検査 → 振り分け: DN-0301',
        '- ローカル依存の note drift 解消 → 振り分け: 定常',
        '- PR #621 の後処理 → 振り分け: DN-0100',
        '',
      ].join('\n')
    );
    g('add', '.claude/todo/backlog.md', 'docs/reviews/weekly/2026-W39-review.md');
    const r = run();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /申し送り 6 項目・居場所あり 6/);
    assert.match(r.stdout, /確定 docs\/reviews\/weekly\/2026-W39-review\.md: 申し送り 3 項目・振り分け不備 0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: W39 以降のレビューは振り分け先が無い項目で止まる／backlog に無い DN も止まる', () => {
  const { dir, g, write, run } = makeRepo();
  try {
    write('docs/reviews/weekly/2026-W39-review.md', '## 来週への申し送り\n\n- 振り分け無し\n- 幽霊 → 振り分け: DN-0999\n');
    g('add', 'docs/reviews/weekly/2026-W39-review.md');
    const r = run();
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /weekly-routing-required/);
    assert.match(r.stderr, /振り分け先の記載が無い/);
    assert.match(r.stderr, /DN-0999 が backlog に無い/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: W38 以前のレビューの編集は振り分け必須の対象外（遡及しない）', () => {
  const { dir, g, write, run } = makeRepo();
  try {
    write('docs/reviews/weekly/2026-W38-review.md', OLD_REVIEW + '\n追記\n');
    g('add', 'docs/reviews/weekly/2026-W38-review.md');
    const r = run();
    assert.equal(r.status, 0, r.stdout + r.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: handoff の前送りマーカー付き削除は backlog 未同梱で止まる（既存ルール2の回帰）', () => {
  const { dir, g, write, run } = makeRepo();
  try {
    write('docs/handoffs/2026-09-01-x.md', '# h\n残タスク: A\n');
    g('add', 'docs/handoffs/2026-09-01-x.md');
    g('commit', '-q', '-m', 'handoff');
    g('rm', '-q', 'docs/handoffs/2026-09-01-x.md');
    const r = run();
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /extract-before-delete\] docs\/handoffs\/2026-09-01-x\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
