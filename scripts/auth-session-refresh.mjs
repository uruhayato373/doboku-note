#!/usr/bin/env node
/**
 * auth-session-refresh.mjs — A8 / もしも / KDP のログインを Mac 上で保ち、CI へ渡す（launchd 毎日 17:45）。
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   A8 は揮発性 Cookie で、Mac で export した state が CI の定期収集（予定より数時間遅れて動く）の時点で
 *   切れていた（2026-09-22 run 35670832802・Issue #570）。人が気づいて再ログインするまで収集が止まる。
 *   stats47 は同じ問題を `refresh-session.mjs`（launchd 17:30）で解いているので、同じ仕組みを移す。
 *
 * 流れ（サービスごと）:
 *   1. 共用 state の取り込み: A8・もしもは stats47 と同じ口座。stats47 が毎日 17:30 に
 *      `~/.local/share/asp-sessions/<service>-state.json` へ保存する state の方が新しければ auth root へ写す。
 *      同じ口座へ両プロジェクトから毎日ログインしないため、ここで通れば 2 には進まない
 *   2. 確認: `auth:status` と同じ判定（口座 assert 付き）
 *   3. 切れていればキーチェーンの ID/PW で 1 回だけログインし、もう一度 2 で確かめる
 *   4. --export: CI が使う service（ci.enabled）は暗号化 state を private R2 へ書き出す
 *   5. --dispatch-due: その service の定期収集（ci.cron）が 24 時間以内に来るなら、今すぐ
 *      login-collectors を起動する。定期実行の方は ci.skipScheduleIfFresh の gate が省略する
 *
 * 守ること（stats47 と同じ）:
 *   - ID/PW はキーチェーンからだけ読む。ログ・引数・ファイルへ出さない
 *   - 2FA / CAPTCHA / 追加確認は突破しない。human_required で止めて通知する
 *   - 自動ログインの失敗は 1 回で止め、失敗印（auth root の metadata/<service>.autologin-failed）を残す。
 *     人が確認して印を消すまで再試行しない（アカウントロック回避）
 *   - 共用口座以外（KDP）は doboku-note 専用のキーチェーン項目だけを使う
 *
 * キーチェーン登録（オーナーが 1 回だけ。-w を値なしで付けるとパスワードを対話入力できる）:
 *   security add-generic-password -s doboku-note-auth-kdp -a <Amazon のメールアドレス> -w
 *   A8・もしもは stats47 の項目（stats47-measurement-a8 / -moshimo）があればそれを使う。
 *   doboku-note だけ別にするなら doboku-note-auth-a8 / -moshimo を登録する（こちらが優先）
 *
 * 使い方:
 *   node scripts/auth-session-refresh.mjs [--service a8,moshimo,kdp] [--export] [--dispatch-due] [--dry-run|--no-login] [--json]
 *   --service を省くと、資格情報の出どころ（共用 state かキーチェーン）がある service だけを回す
 *   --dry-run: 取り込み判定と status だけ（取り込みの書き込み・ログイン・export・dispatch はしない）
 *   --no-login: 共用 state の取り込みと status まで（キーチェーンでのログインはしない）
 * 導入: npm run auth-refresh:install（launchd）
 *
 * exit: 0 全件 ok（または対象外）/ 1 いずれかが要対応（通知済み）/ 2 検査不成立（macOS 以外・対象 0 件）
 * ---------------------------------------------------------------------------
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUTO_LOGIN,
  classifyLoginOutcome,
  cronFiresWithin,
  decideSharedImport,
  keychainServiceNames,
  parseKeychainAccount,
  sharedStatePath,
} from './lib/auth-session-refresh.mjs';
import { withAuthLock } from './lib/playwright-auth-lock.mjs';
import {
  ensureAuthDirectories,
  loadAuthRegistry,
  resolveMetadataPath,
  resolveProfileDir,
  resolveStatePath,
} from './lib/playwright-auth-profile.mjs';
import { mergeLeanOptions } from './lib/playwright-launch.mjs';
import { exportAuthState, REPO_ROOT, statusAuthService } from './playwright-auth.mjs';

const TAG = '[auth-session-refresh]';
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const DRY_RUN = argv.includes('--dry-run');
const NO_LOGIN = DRY_RUN || argv.includes('--no-login');
const DO_EXPORT = argv.includes('--export') && !DRY_RUN;
const DISPATCH_DUE = argv.includes('--dispatch-due') && !DRY_RUN;
const AS_JSON = argv.includes('--json');
const authOptions = { cwd: REPO_ROOT, repoRoot: REPO_ROOT, env: process.env, isCI: false };

function keychainCredential(service) {
  for (const name of keychainServiceNames(service)) {
    const run = (extra) => execFileSync('security', ['find-generic-password', '-s', name, ...extra], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    try {
      const user = parseKeychainAccount(run([]));
      const password = run(['-w']).replace(/\n$/, '');
      if (user && password) return { user, password, source: name };
    } catch { /* 次の候補へ */ }
  }
  return null;
}

function hasKeychainItem(service) {
  return keychainServiceNames(service).some(
    (name) => spawnSync('security', ['find-generic-password', '-s', name], { stdio: 'ignore' }).status === 0,
  );
}

function notify(message) {
  try {
    execFileSync('osascript', ['-e', `display notification ${JSON.stringify(message)} with title "doboku-note ログイン維持"`]);
  } catch { /* 通知は補助 */ }
}

function failMarkPath(service) {
  return join(dirname(resolveMetadataPath(service, authOptions)), `${service}.autologin-failed`);
}

function mtimeMs(path) {
  try { return statSync(path).mtimeMs; } catch { return NaN; }
}

/** 1. stats47 と共用する state が新しければ auth root へ写す。 */
function importSharedState(service) {
  const shared = sharedStatePath(service);
  const local = resolveStatePath(service, authOptions);
  if (!shared || !local) return { import: false, reason: 'not-shared' };
  let sharedCookieCount = 0;
  try { sharedCookieCount = JSON.parse(readFileSync(shared, 'utf8')).cookies?.length ?? 0; } catch { /* 無い・壊れている */ }
  const decision = decideSharedImport({ sharedMtimeMs: mtimeMs(shared), localMtimeMs: mtimeMs(local), sharedCookieCount });
  if (decision.import && !DRY_RUN) {
    ensureAuthDirectories(service, authOptions);
    copyFileSync(shared, local);
    try { chmodSync(local, 0o600); } catch { /* best-effort */ }
  }
  return decision;
}

async function pageSignals(page) {
  return page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const hasPassword = [...document.querySelectorAll('input[type=password]')].some(visible);
    const text = document.body?.innerText ?? '';
    const hasChallenge = !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"]')
      || /認証コード|ワンタイム|確認コード|私はロボットではありません|画像認証|2段階認証|文字を入力してください/.test(text);
    return { hasPassword, hasChallenge };
  }).catch(() => ({ hasPassword: true, hasChallenge: false }));
}

/** ID/PW を入れて送信する。1 画面（A8・もしも）と、メール → 次へ → パスワードの 2 段階（Amazon）の両方に対応する。 */
async function submitCredential(page, spec, cred) {
  const visible = (sel) => page.locator(sel).first().isVisible().catch(() => false);
  if (await visible(spec.user)) {
    await page.fill(spec.user, cred.user);
    if (spec.next && await visible(spec.next)) {
      await page.click(spec.next);
      await page.waitForSelector(spec.password, { state: 'visible', timeout: 30000 }).catch(() => {});
    }
  }
  if (!(await visible(spec.password))) return;
  await page.fill(spec.password, cred.password);
  if (spec.remember && await visible(spec.remember)) await page.check(spec.remember).catch(() => {});
  await page.click(spec.submit);
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
}

/** 3. キーチェーンで 1 回だけログインし、state を保存する。 */
async function autoLogin(service, cred, checkUrl) {
  const spec = AUTO_LOGIN[service];
  return withAuthLock(service, { command: 'auto-login', authOptions }, async () => {
    ensureAuthDirectories(service, authOptions);
    const { chromium } = await import('playwright');
    const context = await chromium.launchPersistentContext(resolveProfileDir(service, authOptions), mergeLeanOptions({
      channel: 'chrome',
      headless: !spec.headed,
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      viewport: { width: 1366, height: 1000 },
      args: ['--disable-blink-features=AutomationControlled'],
    }));
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(spec.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await submitCredential(page, spec, cred);
      let status = classifyLoginOutcome(service, { url: page.url(), ...(await pageSignals(page)) });
      if (status === 'ok' && checkUrl) {
        // 確認先（KDP は Reports）で別途パスワードを求められたら、同じ資格情報で 1 回だけ送る
        await page.goto(checkUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(3000);
        if ((await pageSignals(page)).hasPassword) {
          await submitCredential(page, spec, cred);
          status = classifyLoginOutcome(service, { url: page.url(), ...(await pageSignals(page)) });
        }
      }
      if (status !== 'ok') return { status };
      const statePath = resolveStatePath(service, authOptions);
      if (statePath) {
        await context.storageState({ path: statePath });
        try { chmodSync(statePath, 0o600); } catch { /* best-effort */ }
      }
      return { status: 'ok' };
    } finally {
      await context.close().catch(() => {});
    }
  });
}

function dispatchCollector(service) {
  const r = spawnSync('gh', ['workflow', 'run', 'login-collectors.yml', '--ref', 'main', '-f', `service=${service}`, '-f', 'mode=collect'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return r.status === 0 ? { ok: true } : { ok: false, reason: (r.stderr || r.stdout || '').trim().slice(0, 200) };
}

async function refresh(service, entry) {
  const result = { service };
  const failMark = failMarkPath(service);
  result.sharedImport = importSharedState(service);

  let status = await statusAuthService({ repoRoot: REPO_ROOT }, service);
  result.statusBefore = status.status;

  if (status.status !== 'authenticated') {
    if (NO_LOGIN) return { ...result, status: 'needs-login', reason: status.reason };
    if (existsSync(failMark)) {
      return { ...result, status: 'blocked', reason: `前回の自動ログインが失敗したため停止中。確認後に ${failMark} を削除する` };
    }
    const cred = keychainCredential(service);
    if (!cred) {
      return { ...result, status: 'no_credential', reason: `キーチェーンに ${keychainServiceNames(service).join(' / ')} が無い` };
    }
    const checkUrl = service === 'kdp' ? 'https://kdpreports.amazon.co.jp/dashboard' : null;
    const login = await autoLogin(service, cred, checkUrl).catch((e) => ({ status: 'error', reason: String(e.message).slice(0, 160) }));
    result.loggedInWith = cred.source;
    status = login.status === 'ok' ? await statusAuthService({ repoRoot: REPO_ROOT }, service) : { status: login.status, reason: login.reason };
    if (status.status !== 'authenticated') {
      // 口座不一致・2FA・ID/PW 不通は自動で繰り返さない（アカウントロックと別口座の混入を避ける）
      mkdirSync(dirname(failMark), { recursive: true });
      writeFileSync(failMark, `${new Date().toISOString()} ${status.status}\n`, { mode: 0o600 });
      const reason = status.status === 'human_required'
        ? '2FA/CAPTCHA 等の人の確認が必要（npm run auth:login -- --service ' + service + '）'
        : `自動ログイン後も authenticated にならない（${status.reason ?? status.status}）`;
      return { ...result, status: status.status === 'authenticated' ? 'ok' : status.status, reason };
    }
  }
  result.status = 'ok';

  const ci = entry.ci ?? {};
  if (DO_EXPORT && ci.mode === 'encrypted-state' && ci.enabled) {
    const exported = await exportAuthState({ repoRoot: REPO_ROOT }, service).catch((e) => ({ ok: false, reason: String(e.message).slice(0, 160) }));
    result.export = exported.ok ? { ok: true, generation: exported.generation } : { ok: false, reason: exported.reason ?? exported.status };
    if (!exported.ok) return { ...result, status: 'export_failed', reason: result.export.reason };
    if (DISPATCH_DUE && cronFiresWithin(ci.cron, new Date(), 24)) {
      result.dispatch = dispatchCollector(service);
      if (!result.dispatch.ok) return { ...result, status: 'dispatch_failed', reason: result.dispatch.reason };
    }
  }
  return result;
}

async function main() {
  if (process.platform !== 'darwin') {
    console.error(`${TAG} macOS 専用（キーチェーンと launchd を使う）。検査不成立。`);
    return 2;
  }
  const registry = loadAuthRegistry({ cwd: REPO_ROOT });
  const requested = opt('--service')?.split(',').map((s) => s.trim()).filter(Boolean);
  const candidates = requested ?? Object.keys(AUTO_LOGIN);
  const targets = [];
  const skipped = [];
  for (const service of candidates) {
    if (!AUTO_LOGIN[service] || !registry.services[service]) throw new Error(`自動ログイン非対応の service: ${service}`);
    const shared = sharedStatePath(service);
    if (!requested && !(shared && existsSync(shared)) && !hasKeychainItem(service)) {
      skipped.push({ service, status: 'skipped', reason: `共用 state もキーチェーン（${keychainServiceNames(service).join(' / ')}）も無い` });
      continue;
    }
    targets.push(service);
  }
  if (targets.length === 0) {
    console.error(`${TAG} 対象 0 件（検査不成立）: ${skipped.map((s) => `${s.service}=${s.reason}`).join(' / ')}`);
    return 2;
  }

  const results = [];
  for (const service of targets) {
    const r = await refresh(service, registry.services[service])
      .catch((e) => ({ service, status: 'error', reason: String(e.message).slice(0, 160) }));
    results.push(r);
    if (r.status !== 'ok' && !NO_LOGIN) notify(`${service}: ${r.status} — ${r.reason ?? ''}`);
  }
  const all = [...results, ...skipped];
  if (AS_JSON) console.log(JSON.stringify({ dryRun: DRY_RUN, checked: results.length, results: all }, null, 2));
  else for (const r of all) console.log(`${TAG} ${JSON.stringify(r)}`);
  console.error(`${TAG} 対象 ${targets.length} 件を実検査 / ok ${results.filter((r) => r.status === 'ok').length} / 対象外 ${skipped.length}`);
  return results.every((r) => r.status === 'ok') ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main().catch((e) => {
    console.error(`${TAG} ERROR: ${e.message}`);
    return 1;
  });
}
