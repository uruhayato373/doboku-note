import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { addedLines, backlogTextProblems } from '../scripts/lib/backlog-text-guards.mjs';
import { DOMAINS_PATH } from '../scripts/lib/domains.mjs';
import { addCard } from '../scripts/todo-add.mjs';

const BEFORE = ['# バックログ', '', '## 🟡 中', '', '### [DN-0001] 既存', '本文', ''].join('\n');
const none = () => false;

test('増えた行だけを返す（同じ行は増えた分だけ）', () => {
  assert.deepEqual(addedLines('a\nb\n', 'a\nb\nb\nc\n'), ['b', 'c']);
  assert.deepEqual(addedLines('a\r\nb', 'a\nb'), []);
});

test('増えた行の試験日の誤記パターンを止める（DN-0893）', () => {
  const after = BEFORE.replace('本文', '本文\n2級の第二次検定は 2026-10-27 に実施');
  assert.match(backlogTextProblems(BEFORE, after, { exists: none }).join('\n'), /check-exam-calendar/);
});

test('既存の行の違反は見ない（全量は CI の check-exam-calendar が見る）', () => {
  const dirty = BEFORE.replace('本文', '2級の第二次検定は 2026-10-27 に実施');
  assert.deepEqual(backlogTextProblems(dirty, dirty + '\n追加の行', { exists: none }), []);
});

test('増えた行の相対リンクは宛先の実在で判定する', () => {
  const after = BEFORE.replace('本文', '本文\n[計画](../plans/x.md)');
  assert.match(backlogTextProblems(BEFORE, after, { exists: none }).join('\n'), /\[relative-links\] \.\.\/plans\/x\.md/);
  assert.deepEqual(backlogTextProblems(BEFORE, after, { exists: (p) => p === '.claude/plans/x.md' }), []);
});

/** addCard が読む package.json・領域の正本・backlog の git 履歴だけを持つ小さなリポジトリ（実リポジトリの履歴は 1 回 20 秒かかる） */
function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'backlog-guards-'));
  const put = (p, t) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), t); };
  put('package.json', JSON.stringify({ scripts: {} }));
  put(DOMAINS_PATH, JSON.stringify({ domains: [{ id: 'ops', label: '管理' }] }));
  put('.claude/todo/backlog.md', BEFORE);
  // pre-commit の中から走ると GIT_DIR 等が親リポジトリを指し、git init が親の core.bare を書き換える（2026-10-27 に実際に起きた）
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  const git = (a) => execFileSync('git', a, { cwd: root, env, stdio: 'ignore' });
  git(['init', '-q']);
  git(['add', '.']);
  git(['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'init']);
  return root;
}

test('todo:add は試験日の誤記を含む本文のカードを作らない（push の前に投げる）', () => {
  const root = fixtureRoot();
  try {
    const card = { title: '回帰テスト', tier: '中', kind: '改善', domain: '管理', when: '2026-10', body: '起点: 2級の第二次検定は 2026-10-27 に実施\n完了条件: x' };
    const opts = { root, exists: none, today: '2026-10-27' };
    assert.throws(() => addCard(BEFORE, card, opts), /check-exam-calendar/);
    assert.match(addCard(BEFORE, { ...card, body: '起点: x\n完了条件: y' }, opts).id, /^DN-\d{4}$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
