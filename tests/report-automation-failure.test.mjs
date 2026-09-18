/**
 * report-automation-failure の「自動クローズ」「担当者割当」「Slack」経路を固定する。
 *
 * 背景（2026-09-18）: 起票は動いていたが「クローズは人間」だったため、復旧しても誰も閉じず
 * automation-failure Issue が open 8 件・最古 43 日で溜まり、通知チャネルとして死んでいた
 * （W37 レビュー「消化停止」）。--resolve を起票元の成功経路へ配線し、7 日超 open だけが
 * 慢性問題として残る形にする。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts/report-automation-failure.mjs');

test('findExisting: 同 channel の open Issue をタイトル前方一致で探す（他 channel は拾わない）', async () => {
  const { findExisting, issuePrefix } = await import('../scripts/report-automation-failure.mjs');
  const list = [
    { number: 1, title: '[auto] pre-merge: Pre-merge check が赤（develop）' },
    { number: 2, title: '[auto] ops: 投稿・配信・転記に遅れがあります' },
    { number: 3, title: 'security: next bump' },
  ];
  assert.equal(findExisting(list, 'ops')?.number, 2);
  assert.equal(findExisting(list, 'pre-merge')?.number, 1);
  assert.equal(findExisting(list, 'uptime'), null);
  assert.equal(issuePrefix('ops'), '[auto] ops:');
});

test('resolveAssignee: 明示 > 環境変数 > Actions 既定（repo owner）、--no-assignee で null', async () => {
  const { resolveAssignee } = await import('../scripts/report-automation-failure.mjs');
  const env = { AUTOMATION_ISSUE_ASSIGNEE: 'person', GITHUB_REPOSITORY_OWNER: 'owner' };
  assert.equal(resolveAssignee({ flag: 'x', noAssignee: false, env }), 'x');
  assert.equal(resolveAssignee({ flag: null, noAssignee: false, env }), 'person');
  assert.equal(resolveAssignee({ flag: null, noAssignee: false, env: { GITHUB_REPOSITORY_OWNER: 'owner' } }), 'owner');
  assert.equal(resolveAssignee({ flag: null, noAssignee: false, env: {} }), null);
  assert.equal(resolveAssignee({ flag: 'x', noAssignee: true, env }), null);
});

test('postSlack: URL 未設定は送らない・HTTP 失敗と例外は理由付きで sent:false（Issue 記録を止めない）', async () => {
  const { postSlack, slackText } = await import('../scripts/report-automation-failure.mjs');
  assert.deepEqual(await postSlack('', 'x'), { sent: false, reason: 'SLACK_WEBHOOK_URL 未設定' });
  const calls = [];
  const okFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; };
  assert.deepEqual(await postSlack('https://hooks.example/x', 'hello', okFetch), { sent: true });
  assert.equal(calls[0].url, 'https://hooks.example/x');
  assert.deepEqual(JSON.parse(calls[0].init.body), { text: 'hello' });
  assert.deepEqual(await postSlack('https://hooks.example/x', 'h', async () => ({ ok: false, status: 500 })), { sent: false, reason: 'HTTP 500' });
  assert.deepEqual(await postSlack('https://hooks.example/x', 'h', async () => { throw new Error('ECONNRESET'); }), { sent: false, reason: 'ECONNRESET' });
  assert.match(slackText({ kind: 'resolved', channel: 'ops', title: 't', issueUrl: 'u' }), /復旧.*\[ops\] t\nu/s);
  assert.match(slackText({ kind: 'created', channel: 'ops', title: 't', issueUrl: null }), /失敗.*\[ops\] t$/s);
});

test('CLI: --resolve は channel 必須、--dry-run で gh を叩かずに復旧コメントを出す', () => {
  const noChannel = spawnSync(process.execPath, [SCRIPT, '--resolve'], { encoding: 'utf8' });
  assert.equal(noChannel.status, 1);
  assert.match(noChannel.stderr, /--resolve --channel/);

  const dry = spawnSync(process.execPath, [SCRIPT, '--resolve', '--channel', 'ops', '--body', 'run: X', '--dry-run'], { encoding: 'utf8', env: { ...process.env, PATH: '' } });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /resolve channel: ops/);
  assert.match(dry.stdout, /復旧/);
  assert.match(dry.stdout, /run: X/);
});

test('CLI: 起票の dry-run が担当者と Slack の有無を出す（GITHUB_REPOSITORY_OWNER 既定）', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--channel', 'ops', '--title', 't', '--dry-run'], {
    encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY_OWNER: 'owner', SLACK_WEBHOOK_URL: '', AUTOMATION_ISSUE_ASSIGNEE: '' },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /assignee: owner/);
  assert.match(r.stdout, /SLACK_WEBHOOK_URL 未設定/);
  assert.match(r.stdout, /自動クローズ/, '起票 footer が自動クローズの方針を書いていない');
  const off = spawnSync(process.execPath, [SCRIPT, '--channel', 'ops', '--title', 't', '--dry-run', '--no-assignee'], {
    encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY_OWNER: 'owner' },
  });
  assert.match(off.stdout, /assignee: \(なし\)/);
});

test('起票している channel には --resolve の配線がある（起票だけで閉じない channel を増やさない）', () => {
  // 起票元 workflow を全走査し、`--channel X` で起票する X ごとに `--resolve --channel X` が
  // どこかの workflow に在ることを求める。無い channel は「復旧しても open のまま」に戻る。
  const dir = join(ROOT, '.github/workflows');
  const files = readdirSync(dir).filter((f) => f.endsWith('.yml'));
  const filed = new Set();
  const resolved = new Set();
  for (const f of files) {
    const s = readFileSync(join(dir, f), 'utf8');
    for (const m of s.matchAll(/report-automation-failure\.mjs(?:\s*\\\n\s*|\s+)(?:--resolve\s+)?--channel\s+([a-z0-9-]+)/g)) {
      const isResolve = /--resolve/.test(m[0]);
      (isResolve ? resolved : filed).add(m[1]);
    }
    for (const m of s.matchAll(/--resolve --channel ([a-z0-9-]+)/g)) resolved.add(m[1]);
  }
  assert.ok(filed.size >= 5, `起票 channel が ${filed.size} 件しか取れていない（走査の破損を疑う）`);
  const orphan = [...filed].filter((c) => !resolved.has(c));
  assert.deepEqual(orphan, [], `復旧経路（--resolve）が無い channel: ${orphan.join(', ')}`);
});
