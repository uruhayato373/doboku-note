import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildCard, filingWarnings, insertCard, resolveTier, validateNewCard } from '../scripts/todo-add.mjs';
import { commitFileToRemoteBranch } from '../scripts/lib/git-direct-commit.mjs';

const BACKLOG = [
  '# バックログ',
  '',
  '## 🔴 高 — 重要度が高い',
  '',
  '### [DN-0001] 既存の高',
  'タグ: [収益化] [領域:商品] [時期:2026-10] [種類:改善] [起票:2026-10-01]',
  '',
  'body',
  '',
  '## 🟡 中 — 重要度が中くらい',
  '',
  '### [DN-0002] 既存の中',
  'タグ: [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-01]',
  '',
  'body',
  '',
].join('\n');

const OPTS = { npmScripts: new Set(['check-note-sync']), allowedCategories: new Set(['収益化']), domainLabels: new Set(['商品', '管理']) };
const card = (extra = {}) => buildCard({ id: 'DN-0003', title: '新しい不具合', kind: '不具合', domain: '商品', category: '収益化', when: '2026-10', today: '2026-10-07', body: '起点: x\n完了条件: y', ...extra });

test('重要度は 高/中/低/判断待ち・英名・絵文字のどれでも受ける', () => {
  assert.equal(resolveTier('高'), '🔴');
  assert.equal(resolveTier('mid'), '🟡');
  assert.equal(resolveTier('🟣'), '🟣');
  assert.equal(resolveTier('急ぎ'), null);
});

test('見出しの直後へ差し込み、検査に通る', () => {
  const after = insertCard(BACKLOG, '🔴', card());
  assert.ok(after.indexOf('DN-0003') < after.indexOf('DN-0001'), '高の見出しの先頭に入る');
  assert.deepEqual(validateNewCard(BACKLOG, after, 'DN-0003', '🔴', OPTS), []);
});

test('CRLF の文書には CRLF で差し込む', () => {
  const crlf = BACKLOG.replace(/\n/g, '\r\n');
  const after = insertCard(crlf, '🟡', card());
  assert.equal(/(?<!\r)\n/.test(after), false);
});

test('語彙外の領域・🟡 の時期なし・実在しない検証コマンドは止める', () => {
  const bad = insertCard(BACKLOG, '🟡', card({ domain: '謎', when: undefined, verify: 'no-such-script' }));
  const problems = validateNewCard(BACKLOG, bad, 'DN-0003', '🟡', OPTS).join('\n');
  assert.match(problems, /domain/);
  assert.match(problems, /when-missing/);
  assert.match(problems, /verify/);
});

function sh(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** bare の origin と、別ブランチを checkout した作業用 clone を作る */
function fixtureRepos() {
  const dir = mkdtempSync(join(tmpdir(), 'todo-add-'));
  const origin = join(dir, 'origin.git');
  const work = join(dir, 'work');
  sh(dir, ['init', '-q', '--bare', '-b', 'develop', origin]);
  sh(dir, ['clone', '-q', origin, work]);
  for (const [k, v] of [['user.name', 't'], ['user.email', 't@example.com'], ['commit.gpgsign', 'false']]) sh(work, ['config', k, v]);
  mkdirSync(join(work, '.claude/todo'), { recursive: true });
  writeFileSync(join(work, '.claude/todo/backlog.md'), BACKLOG);
  sh(work, ['checkout', '-q', '-b', 'develop']);
  sh(work, ['add', '.']);
  sh(work, ['commit', '-q', '-m', 'init']);
  sh(work, ['push', '-q', 'origin', 'develop']);
  sh(work, ['checkout', '-q', '-b', 'feature']); // 別セッションが切り替えたブランチ
  writeFileSync(join(work, 'wip.txt'), 'uncommitted'); // 相手の未コミットの変更
  return { dir, origin, work };
}

test('今のブランチ・作業ツリーに触れず origin/develop へ積む', () => {
  const { dir, work } = fixtureRepos();
  try {
    const out = commitFileToRemoteBranch({
      root: work,
      path: '.claude/todo/backlog.md',
      transform: (t) => ({ text: t + 'added\n', message: 'todo: add\n' }),
    });
    assert.equal(out.pushed, true);
    assert.equal(sh(work, ['rev-parse', '--abbrev-ref', 'HEAD']), 'feature');
    assert.equal(sh(work, ['rev-parse', 'feature']), sh(work, ['rev-parse', 'develop']), 'feature は動いていない');
    assert.equal(readFileSync(join(work, 'wip.txt'), 'utf8'), 'uncommitted');
    assert.doesNotMatch(readFileSync(join(work, '.claude/todo/backlog.md'), 'utf8'), /added/);
    sh(work, ['fetch', '-q', 'origin']);
    assert.match(sh(work, ['show', 'origin/develop:.claude/todo/backlog.md']), /added$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('push で先を越されたら最新を取り直してやり直す', () => {
  const { dir, origin, work } = fixtureRepos();
  const other = join(dir, 'other');
  try {
    sh(dir, ['clone', '-q', '-b', 'develop', origin, other]);
    for (const [k, v] of [['user.name', 'o'], ['user.email', 'o@example.com'], ['commit.gpgsign', 'false']]) sh(other, ['config', k, v]);
    const attempts = [];
    commitFileToRemoteBranch({
      root: work,
      path: '.claude/todo/backlog.md',
      transform: (t, attempt) => {
        attempts.push(attempt);
        if (attempt === 1) { // 別セッションが先に push する
          writeFileSync(join(other, 'other.txt'), 'x');
          sh(other, ['add', 'other.txt']);
          sh(other, ['commit', '-q', '-m', 'other']);
          sh(other, ['push', '-q', 'origin', 'develop']);
        }
        return { text: t + 'mine\n', message: 'todo: mine\n' };
      },
    });
    assert.deepEqual(attempts, [1, 2]);
    sh(work, ['fetch', '-q', 'origin']);
    assert.equal(sh(work, ['show', 'origin/develop:other.txt']), 'x', '相手の commit を消していない');
    assert.match(sh(work, ['show', 'origin/develop:.claude/todo/backlog.md']), /mine$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('不具合を 🟢/🟣 に置くときだけ注意を出す（S2 の予防）', () => {
  assert.equal(filingWarnings({ kind: '不具合', tierEmoji: '🟢' }).length, 1);
  assert.equal(filingWarnings({ kind: '不具合', tierEmoji: '🟣' }).length, 1);
  assert.equal(filingWarnings({ kind: '不具合', tierEmoji: '🟡' }).length, 0);
  assert.equal(filingWarnings({ kind: '改善', tierEmoji: '🟢' }).length, 0);
});
