import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { deleteCard, findCard, detectEol, nextId, backlogGitLog } from '../scripts/backlog-edit.mjs';

// 実カードの最小形（タグ行込み・parseBacklog が要求する構造）を CRLF で組む。
const CRLF = '\r\n';
function fixture(cards) {
  const body = ['## 🔴 高 — 来月中に着手', '']
    .concat(cards.flatMap((c) => [`### [${c.id}] ${c.title}`, `タグ: [収益化] [種類:改善]`, '', c.text || 'body', '']))
    .join(CRLF);
  return body;
}

test('CRLF を保持したまま削除する', () => {
  const md = fixture([{ id: 'DN-0001', title: 'A' }, { id: 'DN-0002', title: 'B' }]);
  assert.ok(md.includes('\r\n'));
  const result = deleteCard(md, 'DN-0001');
  assert.equal(result.ok, true);
  assert.ok(result.text.includes('\r\n'));
  // 裸の \n（\r が前に無い）が無い＝全行 CRLF で統一されている
  assert.equal(/(?<!\r)\n/.test(result.text), false);
  assert.doesNotMatch(result.text, /DN-0001/);
  assert.match(result.text, /DN-0002/);
});

test('カード境界はセクション区切り（次の ### / ##）で決まる', () => {
  const md = fixture([{ id: 'DN-0001', title: 'A', text: '本文1行目\r\n本文2行目' }, { id: 'DN-0002', title: 'B' }]);
  const { card } = findCard(md, 'DN-0001');
  const result = deleteCard(md, 'DN-0001');
  assert.equal(result.removed, card.endLine - card.startLine + 1);
  // DN-0002 のタイトルと本文は残っている
  assert.match(result.text, /DN-0002/);
  assert.match(result.text, /body/);
});

test('最終カードの削除でも壊れない（末尾に次見出しが無い）', () => {
  const md = fixture([{ id: 'DN-0001', title: 'A' }, { id: 'DN-0002', title: 'Last' }]);
  const result = deleteCard(md, 'DN-0002');
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.text, /DN-0002/);
  assert.match(result.text, /DN-0001/);
});

test('存在しない ID は ok:false を返す（例外を投げない）', () => {
  const md = fixture([{ id: 'DN-0001', title: 'A' }]);
  const result = deleteCard(md, 'DN-9999');
  assert.equal(result.ok, false);
  assert.match(result.error, /存在しない/);
});

test('重複 ID はどちらも消さず error を返す', () => {
  const md = fixture([{ id: 'DN-0001', title: 'A' }, { id: 'DN-0001', title: 'A2' }]);
  const result = deleteCard(md, 'DN-0001');
  assert.equal(result.ok, false);
  assert.match(result.error, /重複/);
});

test('detectEol: CRLF/LF を判別する', () => {
  assert.equal(detectEol('a\r\nb'), '\r\n');
  assert.equal(detectEol('a\nb'), '\n');
});

test('タグ行の直後の空行は本文として残る（余計な行を巻き込まない）', () => {
  const md = fixture([{ id: 'DN-0001', title: 'A', text: '固有の本文マーカー' }, { id: 'DN-0002', title: 'B', text: '別の固有マーカー' }]);
  const result = deleteCard(md, 'DN-0001');
  assert.doesNotMatch(result.text, /固有の本文マーカー/);
  assert.match(result.text, /別の固有マーカー/);
});

// --- nextId ------------------------------------------------------------
// RESEED/新規起票のための採番。ID 再利用禁止（S10）を機械側でも守る。

test('nextId: 現存カードの最大値+1を返す', () => {
  const md = fixture([{ id: 'DN-0003', title: 'A' }, { id: 'DN-0007', title: 'B' }]);
  const r = nextId(md, null);
  assert.equal(r.next, 'DN-0008');
  assert.equal(r.max, 7);
  assert.equal(r.degraded, true);
});

test('nextId: git履歴にしか残っていない削除済みIDも欠番として避ける', () => {
  const md = fixture([{ id: 'DN-0003', title: 'A' }]); // 現存最大は3
  const gitLog = 'commit abc\n+### [DN-0009] 昔あって消えたタスク\ncommit def\n-### [DN-0009] 昔あって消えたタスク\n';
  const r = nextId(md, gitLog);
  assert.equal(r.next, 'DN-0010'); // 3ではなく9+1
  assert.equal(r.degraded, false);
});

test('nextId: カードが1件も無ければDN-0001から始める', () => {
  const r = nextId('## 🔴 高\r\n', null);
  assert.equal(r.next, 'DN-0001');
  assert.equal(r.max, 0);
});

test('nextId: gitLogTextがnullならdegraded:trueを立てる', () => {
  const md = fixture([{ id: 'DN-0001', title: 'A' }]);
  assert.equal(nextId(md, null).degraded, true);
  assert.equal(nextId(md, '').degraded, false); // 空文字は「取得できた（0件）」であってnullではない
});

test('backlogGitLog: 別ブランチでだけ使われて消えた ID も採番から避ける（DN-0340）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'backlog-next-id-'));
  try {
    const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...a], { cwd: dir, stdio: 'ignore' });
    const write = (md) => { mkdirSync(join(dir, '.claude/todo'), { recursive: true }); writeFileSync(join(dir, '.claude/todo/backlog.md'), md); };
    git('init', '-q', '-b', 'main');
    write(fixture([{ id: 'DN-0003', title: 'A' }]));
    git('add', '.'); git('commit', '-qm', 'base');
    git('checkout', '-qb', 'side');
    write(fixture([{ id: 'DN-0003', title: 'A' }, { id: 'DN-0009', title: '並行ブランチで起票' }]));
    git('commit', '-qam', 'add 9');
    write(fixture([{ id: 'DN-0003', title: 'A' }]));
    git('commit', '-qam', 'delete 9');
    git('checkout', '-q', 'main');
    const md = fixture([{ id: 'DN-0003', title: 'A' }]);
    const log = backlogGitLog({ cwd: dir });
    assert.notEqual(log, null);
    assert.equal(nextId(md, log).next, 'DN-0010'); // main の履歴だけなら DN-0004 になり 9 を踏む
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
