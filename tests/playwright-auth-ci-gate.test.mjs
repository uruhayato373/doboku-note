// playwright-auth-ci-gate.test.mjs — 「ログインは運営者の Mac だけ」を resolver と配線検査で固定する回帰テスト
// （registry version 3・DN-0817・2026-10-24）。
//
// 規則:
//   1. CI（GITHUB_ACTIONS / CI）では profile・state・auth root を返さない（AUTH_CI_NO_LOGIN）
//   2. エージェントのセッション（CLAUDECODE=1）では、collectors の script に返さない（AUTH_AGENT_COLLECT_REFUSED）。
//      土曜の Mac 収集（DOBOKU_WEEKLY_COLLECT=1）なら通す。writers と未登録の script は通す
//   3. .github の yml にログインの道具（DOBOKU_AUTH_・restore-auth-state・playwright-auth.mjs ci-・login script）が無い
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  detectCI,
  detectAgentSession,
  resolveAuthRoot,
  resolveProfileDir,
  resolveStatePath,
  ensureAuthDirectories,
  assertLoginProfileAllowed,
  invokedScriptRelative,
  validateServiceScripts,
  looksLikeWriteScript,
  loadAuthRegistry,
  WEEKLY_COLLECT_ENV,
} from '../scripts/lib/playwright-auth-profile.mjs';
import { checkAuthScriptLists, npmScriptsInvokingLogin, scanWorkflowForLogin } from '../scripts/lib/auth-ci-wiring.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const CI_ENV = { GITHUB_ACTIONS: 'true' };
const AGENT_ENV = { CLAUDECODE: '1' };

function tmp(prefix) { return mkdtempSync(join(tmpdir(), prefix)); }
const base = (dir, extra = {}) => ({ cwd: REPO_ROOT, repoRoot: REPO_ROOT, overrideRoot: dir, env: {}, homeDir: '/home/tester', platform: 'linux', ...extra });

test('detectCI / detectAgentSession: 環境変数から判定する', () => {
  assert.equal(detectCI({}), false);
  assert.equal(detectCI({ GITHUB_ACTIONS: 'true' }), true);
  assert.equal(detectCI({ CI: 'true' }), true);
  assert.equal(detectCI({ CI: 'false' }), false);
  assert.equal(detectAgentSession({}), false);
  assert.equal(detectAgentSession({ CLAUDECODE: '1' }), true);
  assert.equal(detectAgentSession({ CLAUDECODE: '0' }), false);
});

test('CI は自動検出され、profile・state・ディレクトリ作成のどれも AUTH_CI_NO_LOGIN で拒否する', () => {
  const dir = tmp('doboku-ci-no-login-');
  try {
    for (const env of [CI_ENV, { CI: 'true' }]) {
      const options = base(dir, { env });
      assert.throws(() => resolveAuthRoot(options), /AUTH_CI_NO_LOGIN/);
      assert.throws(() => resolveProfileDir('note', { ...options, invokedScript: 'scripts/note-sales-fetch.mjs' }), /AUTH_CI_NO_LOGIN/);
      assert.throws(() => resolveStatePath('note', { ...options, invokedScript: 'scripts/note-publish.mjs' }), /AUTH_CI_NO_LOGIN/);
      assert.throws(() => ensureAuthDirectories('note', options), /AUTH_CI_NO_LOGIN/);
    }
    // isCI の明示でも同じ（呼び出し側が env を渡し忘れても、isCI を渡せば拒否される）
    assert.throws(() => resolveProfileDir('kdp', { ...base(dir), isCI: true }), /AUTH_CI_NO_LOGIN/);
    assert.equal(existsSync(join(dir, 'profiles')), false, '拒否時はディレクトリを作らない');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CI のメッセージは「CI はログインしない・土曜の Mac 収集で行う」と案内する', () => {
  assert.throws(() => resolveAuthRoot({ env: CI_ENV, homeDir: '/home/tester', platform: 'linux' }), /CI.*ログインしません.*土曜の Mac 収集/);
});

test('エージェントのセッション: collectors の script は拒否・writers と未登録の script は許可', () => {
  const dir = tmp('doboku-agent-');
  try {
    const options = base(dir, { env: AGENT_ENV });
    const profile = join(dir, 'profiles', 'playwright-note-profile');
    assert.throws(() => resolveProfileDir('note', { ...options, invokedScript: 'scripts/note-sales-fetch.mjs' }), /AUTH_AGENT_COLLECT_REFUSED/);
    assert.throws(() => resolveStatePath('note', { ...options, invokedScript: 'scripts/note-traffic-fetch.mjs' }), /AUTH_AGENT_COLLECT_REFUSED/);
    assert.throws(() => ensureAuthDirectories('note', { ...options, invokedScript: 'scripts/check-note-attachments.mjs' }), /AUTH_AGENT_COLLECT_REFUSED/);
    assert.equal(existsSync(profile), false, '拒否時はディレクトリを作らない');
    // 拒否の文言は「記録済みのデータを読む」「運営者が weekly-collect --only で取り直す」を案内する
    assert.throws(() => resolveProfileDir('note', { ...options, invokedScript: 'scripts/note-sales-fetch.mjs' }), /記録済みのデータ.*weekly-collect\.mjs --only/s);
    // writers（運営者の依頼で行う投稿・編集）
    assert.equal(resolveProfileDir('note', { ...options, invokedScript: 'scripts/note-publish.mjs' }), profile);
    assert.equal(resolveProfileDir('x', { ...options, invokedScript: '.claude/skills/social/publish-x/publish-x.ts' }), join(dir, 'profiles', 'playwright-x-profile'));
    // 未登録（認証 CLI 自身・その他）
    assert.equal(resolveProfileDir('note', { ...options, invokedScript: 'scripts/playwright-auth.mjs' }), profile);
    assert.equal(resolveProfileDir('note', { ...options, invokedScript: undefined, repoRoot: '/nonexistent-repo' }), profile);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('エージェントのセッションでも DOBOKU_WEEKLY_COLLECT=1（土曜の Mac 収集）なら collectors を通す', () => {
  const dir = tmp('doboku-weekly-');
  try {
    const options = base(dir, { env: { ...AGENT_ENV, [WEEKLY_COLLECT_ENV]: '1' }, invokedScript: 'scripts/note-sales-fetch.mjs' });
    assert.equal(resolveProfileDir('note', options), join(dir, 'profiles', 'playwright-note-profile'));
    // 1 以外では通さない
    assert.throws(() => resolveProfileDir('note', { ...options, env: { ...AGENT_ENV, [WEEKLY_COLLECT_ENV]: '0' } }), /AUTH_AGENT_COLLECT_REFUSED/);
    // CI は DOBOKU_WEEKLY_COLLECT=1 があっても通さない
    assert.throws(() => resolveProfileDir('note', { ...options, env: { ...CI_ENV, [WEEKLY_COLLECT_ENV]: '1' } }), /AUTH_CI_NO_LOGIN/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('エージェントでもコレクタ判定は起動 script だけで決まる（人の端末は何も見ない）', () => {
  const dir = tmp('doboku-local-');
  try {
    const local = base(dir, { invokedScript: 'scripts/note-sales-fetch.mjs' });
    assert.equal(resolveProfileDir('note', local), join(dir, 'profiles', 'playwright-note-profile'));
    assert.equal(assertLoginProfileAllowed('note', { collectors: ['scripts/a.mjs'] }, { env: {}, invokedScript: 'scripts/a.mjs' }).kind, 'local');
    assert.equal(assertLoginProfileAllowed('note', { collectors: ['scripts/a.mjs'] }, { env: AGENT_ENV, invokedScript: 'scripts/b.mjs' }).kind, 'agent-unlisted');
    assert.equal(assertLoginProfileAllowed('note', { writers: ['scripts/w.mjs'] }, { env: AGENT_ENV, invokedScript: 'scripts/w.mjs' }).kind, 'agent-writer');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('invokedScriptRelative: repo 相対 posix・repo 外は null', () => {
  assert.equal(invokedScriptRelative('/repo', '/repo/scripts/x.mjs'), 'scripts/x.mjs');
  assert.equal(invokedScriptRelative('/repo', '/repo/.claude/skills/social/publish-x/publish-x.ts'), '.claude/skills/social/publish-x/publish-x.ts');
  assert.equal(invokedScriptRelative('/repo', '/elsewhere/scripts/x.mjs'), null);
  assert.equal(invokedScriptRelative('/repo', undefined), null);
});

test('validateServiceScripts: 不正な collectors / writers を拒否する', () => {
  const good = { collectors: ['scripts/a-fetch.mjs'], writers: ['scripts/a-publish.mjs'] };
  assert.equal(validateServiceScripts('svc', good, { required: true }), true);
  const bad = (patch, re, opts) => assert.throws(() => validateServiceScripts('svc', { ...good, ...patch }, opts), re);
  bad({ collectors: ['/abs/path.mjs'] }, /repo-relative/);
  bad({ writers: ['scripts\\w.mjs'] }, /repo-relative/);
  bad({ collectors: [''] }, /non-empty/);
  bad({ collectors: ['scripts/note-publish.mjs'] }, /write 系動詞/);
  bad({ collectors: ['scripts/coconala-edit.mjs'] }, /write 系動詞/);
  assert.throws(() => validateServiceScripts('svc', { collectors: [] }, { required: true }), /writers が無い/);
  // 旧版・fixture（キー自体が無い）は required でなければ通る
  assert.equal(validateServiceScripts('svc', {}), true);
  assert.equal(looksLikeWriteScript('scripts/note-sales-fetch.mjs'), false);
  assert.equal(looksLikeWriteScript('scripts/note-update-body.mjs'), true);
});

test('loadAuthRegistry: version 3 は collectors / writers が必須・write 系 collectors は拒否', () => {
  const dir = tmp('doboku-registry-v3-');
  try {
    const path = join(dir, 'registry.json');
    const svc = (extra) => ({ profileDirName: 'p', stateFileName: null, sessionMode: 'profile', ...extra });
    writeFileSync(path, JSON.stringify({ version: 3, services: { note: svc({}) } }));
    assert.throws(() => loadAuthRegistry({ cwd: dir, registryPath: path }), /AUTH_REGISTRY_INVALID_SCRIPTS/);
    writeFileSync(path, JSON.stringify({ version: 3, services: { note: svc({ collectors: ['scripts/note-publish.mjs'], writers: [] }) } }));
    assert.throws(() => loadAuthRegistry({ cwd: dir, registryPath: path }), /write 系動詞/);
    writeFileSync(path, JSON.stringify({ version: 3, services: { note: svc({ collectors: ['scripts/note-sales-fetch.mjs'], writers: ['scripts/note-publish.mjs'] }) } }));
    assert.deepEqual(loadAuthRegistry({ cwd: dir, registryPath: path }).services.note.collectors, ['scripts/note-sales-fetch.mjs']);
    writeFileSync(path, JSON.stringify({ version: 1, services: { note: svc({}) } }));
    assert.equal(loadAuthRegistry({ cwd: dir, registryPath: path }).services.note.profileDirName, 'p');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('実 registry: version 3・ci ブロックと暗号化 state の設定は無く、script は全て実在する', () => {
  const registry = loadAuthRegistry({ cwd: REPO_ROOT });
  assert.equal(registry.version, 3);
  // トップレベルは版・services・資格情報の方針だけ（暗号化 state の置き場の設定は無い）
  const raw = JSON.parse(readFileSync(join(REPO_ROOT, '.claude/config/playwright-auth-profiles.json'), 'utf8'));
  assert.deepEqual(Object.keys(raw).sort(), ['_comment', 'credentialPolicy', 'services', 'version']);
  const r = checkAuthScriptLists(registry.services, (s) => existsSync(join(REPO_ROOT, s)));
  assert.deepEqual(r.findings, []);
  assert.ok(r.servicesChecked >= 9 && r.scriptsChecked >= 50, `実検査が少なすぎる（${r.servicesChecked} service・${r.scriptsChecked} script）`);
  for (const [id, entry] of Object.entries(registry.services)) assert.equal('ci' in entry, false, `${id}: ci ブロックが残っている`);
});

test('checkAuthScriptLists: 存在しない script と write 系の collectors を検出する', () => {
  const services = { a: { collectors: ['scripts/a-fetch.mjs', 'scripts/a-publish.mjs'], writers: ['scripts/missing.mjs'] }, b: {} };
  const r = checkAuthScriptLists(services, (s) => s !== 'scripts/missing.mjs');
  assert.equal(r.servicesChecked, 2);
  assert.equal(r.scriptsChecked, 3);
  assert.ok(r.findings.some((f) => /存在しない.*missing\.mjs/.test(f)));
  assert.ok(r.findings.some((f) => /write 系動詞.*a-publish\.mjs/.test(f)));
  assert.ok(r.findings.some((f) => /service "b": collectors が無い/.test(f)));
});

test('scanWorkflowForLogin: DOBOKU_AUTH_・restore-auth-state・ci-* 復元・login script の起動を検出する', () => {
  const ctx = { loginScripts: ['scripts/note-sales-fetch.mjs', '.claude/skills/social/publish-x/publish-x.ts'], npmNames: ['note-sales-fetch'] };
  const scan = (text) => scanWorkflowForLogin(text, 'w.yml', ctx);

  assert.deepEqual(scan('steps:\n  - run: node scripts/ci-data.mjs add\n'), []);

  const env = scan('env:\n  DOBOKU_AUTH_NOTE_USER: ${{ secrets.DOBOKU_AUTH_NOTE_USER }}\n');
  assert.equal(env.length, 1);
  assert.match(env[0], /^w\.yml:2 DOBOKU_AUTH_/);

  assert.match(scan('  - uses: ./.github/actions/restore-auth-state\n')[0], /restore-auth-state/);
  assert.match(scan('  - run: node scripts/playwright-auth.mjs ci-plan --event schedule\n')[0], /playwright-auth\.mjs ci-/);
  assert.match(scan('  - run: node scripts/note-sales-fetch.mjs --month 2026-10\n')[0], /note-sales-fetch\.mjs/);
  assert.match(scan('  - run: npx tsx .claude/skills/social/publish-x/publish-x.ts post\n')[0], /publish-x\.ts/);
  assert.match(scan('  - run: npm run note-sales-fetch -- --month 2026-10\n')[0], /npm run note-sales-fetch/);
  // 前方一致で別の npm script を誤検出しない
  assert.deepEqual(scan('  - run: npm run note-sales-fetch-check\n'), []);
  // YAML のコメント・echo の案内文は実行ではないので script の起動に数えない（DOBOKU_AUTH_ は数える）
  assert.deepEqual(scan('  # node scripts/note-sales-fetch.mjs は Mac で回す\n  - run: echo "npm run note-sales-fetch"\n'), []);
  assert.equal(scan('  # DOBOKU_AUTH_ROOT は使わない\n').length, 1);
  // Windows の改行でも行番号が合う
  assert.match(scan('a: 1\r\nDOBOKU_AUTH_X: 1\r\n')[0], /^w\.yml:2 /);
});

test('npmScriptsInvokingLogin: login script を呼ぶ npm script の名前を返す', () => {
  const names = npmScriptsInvokingLogin({ a: 'node scripts/note-sales-fetch.mjs', b: 'node scripts/other.mjs', c: 'echo hi' }, ['scripts/note-sales-fetch.mjs']);
  assert.deepEqual(names, ['a']);
});

test('実リポジトリ: .github の yml に login の道具が無い（実検査数つき）', async () => {
  const { listFiles } = await import('../scripts/lib/fs-walk.mjs');
  const { relative } = await import('node:path');
  const registry = loadAuthRegistry({ cwd: REPO_ROOT });
  const loginScripts = [...new Set(Object.values(registry.services).flatMap((e) => [...e.collectors, ...e.writers]))];
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const npmNames = npmScriptsInvokingLogin(pkg.scripts, loginScripts);
  const files = listFiles(join(REPO_ROOT, '.github'), { match: (_p, name) => /\.ya?ml$/.test(name) });
  assert.ok(files.length >= 10, `検査した yml が少なすぎる（${files.length} 本）`);
  const findings = files.flatMap((f) => scanWorkflowForLogin(readFileSync(f, 'utf8'), relative(REPO_ROOT, f), { loginScripts, npmNames }));
  assert.deepEqual(findings, []);
});

test('共有セッション lib は CI 環境でも import だけでは resolver を呼ばない（オフライン検査を巻き込まない）', async () => {
  // 2026-09-21 PR #549: coconala-session.mjs が import 時に resolveProfileDir を呼び、ブラウザを開かない
  // check-coconala-blog（ci:true）まで落ちた。profile は launch の瞬間に解決する。CI は AUTH_CI_NO_LOGIN で拒否するので、なお必要。
  const { spawnSync } = await import('node:child_process');
  for (const lib of ['scripts/lib/note-browser.mjs', 'scripts/lib/coconala-session.mjs', 'scripts/lib/google-console-browser.mjs', 'scripts/lib/asp-browser.mjs']) {
    const r = spawnSync(process.execPath, ['-e', `import(${JSON.stringify('./' + lib)}).then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); })`], {
      cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', CI: 'true', DOBOKU_AUTH_ROOT: '' },
    });
    assert.equal(r.status, 0, `${lib}: import が CI 環境で失敗した\n${r.stderr}`);
  }
});

test('classifyAuthSnapshot: X の datacenter 向けボット挑戦ページは blocked（unknown で待たない）', async () => {
  const { classifyAuthSnapshot } = await import('../scripts/lib/playwright-auth-adapters.mjs');
  const adapter = { supported: true, expectedMarkers: ['@doboku373'], expiredPattern: /\/login/i, loggedOutMarkers: [] };
  const r = classifyAuthSnapshot(adapter, { url: 'https://x.com/home', title: 'しばらくお待ちください...', text: 'x.com セキュリティ検証の実行 この Web サイトは、悪意のあるボットから保護するためにセキュリティ サービスを使用しています。' });
  assert.equal(r.status, 'blocked');
});
