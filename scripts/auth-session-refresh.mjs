#!/usr/bin/env node
/**
 * auth-session-refresh.mjs — A8 / もしも / KDP / note / ココナラのログインを手元の PC で保つ。
 *   Mac は launchd 毎日 17:45（CI への受け渡しも行う）、Windows はタスクスケジューラ（受け渡しはしない）。
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
 *   3. 切れていれば OS の資格情報ストア（Mac キーチェーン / Windows 資格情報マネージャー）の ID/PW で
 *      1 回だけログインし、もう一度 2 で確かめる
 *   4. --export（Mac のみ。CI へは Mac から一方向で渡す。Windows では無視する）: CI が使う service（ci.enabled）は暗号化 state を private R2 へ書き出す
 *   5. --dispatch-due: その service の定期収集（ci.cron）が 24 時間以内に来るなら、今すぐ
 *      login-collectors を起動する。定期実行の方は ci.skipScheduleIfFresh の gate が省略する
 *
 * 守ること（stats47 と同じ）:
 *   - ID/PW は scripts/lib/credential-store.mjs からだけ読む。ログ・引数・ファイルへ出さない
 *   - 2FA / CAPTCHA / 追加確認は突破しない。human_required で止めて通知する
 *   - 自動ログインの失敗は 1 回で止め、失敗印（auth root の metadata/<service>.autologin-failed）を残す。
 *     人が確認して印を消すまで再試行しない（アカウントロック回避）
 *   - 共用口座以外（KDP・note・ココナラ）は doboku-note 専用の項目だけを使う
 *
 * 資格情報の登録（オーナーが各 PC で 1 回だけ。値を省くとパスワードを対話入力できる）:
 *   Mac:     security add-generic-password -s doboku-note-auth-<service> -a <ログインID> -w
 *   Windows: cmdkey /generic:doboku-note-auth-<service> /user:<ログインID> /pass
 *   A8・もしもは stats47 の項目（stats47-measurement-a8 / -moshimo）があればそれを使う。
 *   doboku-note だけ別にするなら doboku-note-auth-a8 / -moshimo を登録する（こちらが優先）
 *
 * CI（--ci・GitHub Actions 専用）: login-collectors で暗号化 state が切れていたときだけ、Secrets の ID/PW
 *   （資格情報の正本で ciCredential=true の service だけ・credential-store の ciEnvCredentialServices）で 1 回ログインし直して state を保存する。
 *   共用 state の取り込み・export・dispatch・通知はしない。2026-10-01 オーナー決定（note・ココナラ）。
 *
 * 使い方:
 *   node scripts/auth-session-refresh.mjs [--service a8,moshimo,kdp] [--export] [--dispatch-due] [--dry-run|--no-login] [--json]
 *   node scripts/auth-session-refresh.mjs --ci --service coconala --json
 *   --service を省くと、資格情報の出どころ（共用 state か資格情報ストア）がある service だけを回す
 *   --dry-run: 取り込み判定と status だけ（取り込みの書き込み・ログイン・export・dispatch はしない）
 *   --no-login: 共用 state の取り込みと status まで（資格情報ストアでのログインはしない）
 * 導入: npm run auth-refresh:install（Mac は launchd、Windows はタスクスケジューラ）
 *
 * exit: 0 全件 ok（または対象外）/ 1 いずれかが要対応（通知済み）/ 2 検査不成立（Mac・Windows 以外・対象 0 件）
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
  detectChallenge,
  keychainServiceNames,
  maskLoginText,
  sharedStatePath,
  submitLoginForm,
} from './lib/auth-session-refresh.mjs';
import { agentSession, ciEnvCredentialServices, credentialStoreSupported, hasSecret, readFirstCredential, readServiceCredential } from './lib/credential-store.mjs';
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
const IS_MAC = process.platform === 'darwin';
const CI_MODE = argv.includes('--ci');
// CI への受け渡しは Mac から一方向（Windows からは書き出さない。DN-0362）
const DO_EXPORT = argv.includes('--export') && !DRY_RUN && IS_MAC;
const DISPATCH_DUE = argv.includes('--dispatch-due') && !DRY_RUN && IS_MAC;
const AS_JSON = argv.includes('--json');
const authOptions = { cwd: REPO_ROOT, repoRoot: REPO_ROOT, env: process.env, isCI: CI_MODE };

function storedCredential(service) {
  // CI は Secrets（環境変数）から、手元は資格情報ストアから読む。どちらも credential-store だけが読み口
  return CI_MODE ? readServiceCredential(service) : readFirstCredential(keychainServiceNames(service));
}

function hasStoredCredential(service) {
  return keychainServiceNames(service).some((name) => hasSecret(name));
}

// Windows の通知: 文言は環境変数で渡す（コマンド文字列へ埋め込まない）
const WINDOWS_NOTIFY_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon = [System.Drawing.SystemIcons]::Warning
$n.Visible = $true
$n.ShowBalloonTip(10000, 'doboku-note ログイン維持', $env:DOBOKU_NOTIFY_TEXT, 'Warning')
Start-Sleep -Seconds 10
$n.Dispose()
`;

function notify(message) {
  try {
    if (IS_MAC) {
      execFileSync('osascript', ['-e', `display notification ${JSON.stringify(message)} with title "doboku-note ログイン維持"`]);
    } else if (process.platform === 'win32') {
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_NOTIFY_SCRIPT], {
        env: { ...process.env, DOBOKU_NOTIFY_TEXT: message.slice(0, 250) },
        stdio: 'ignore',
        windowsHide: true,
      });
    }
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
  const raw = await page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const hasPassword = [...document.querySelectorAll('input[type=password]')].some(visible);
    const text = document.body?.innerText ?? '';
    const frames = [...document.querySelectorAll('iframe')].map((f) => ({ src: f.getAttribute('src') || '', visible: visible(f) }));
    // 拒否の理由（「メールアドレスまたはパスワードが違います」等）を残すため、エラー表示らしい要素の文言だけを拾う
    const errorText = [...document.querySelectorAll('[role=alert], [class*=error], [class*=Error], [class*=alert], [class*=flash], [class*=warning]')]
      .filter(visible).map((el) => el.innerText.trim()).filter(Boolean).join(' / ');
    return { hasPassword, text, frames, errorText };
  }).catch(() => null);
  if (!raw) return { hasPassword: true, hasChallenge: false, errorText: '' };
  return { hasPassword: raw.hasPassword, hasChallenge: detectChallenge(raw), errorText: maskLoginText(raw.errorText) };
}

/** 自動ログインが ok にならなかった画面の写し（auth root の metadata・リポジトリの外）。パスワード欄は伏せ字で写る。 */
function failShotPath(service) {
  return join(dirname(resolveMetadataPath(service, authOptions)), `${service}.autologin-failed.png`);
}

/**
 * エージェント（Claude Code が実行するコマンドは CLAUDECODE=1）からは資格情報でログインしない。
 * 実行はオーナー・定期実行・CI（2026-10-01: エージェントが自動ログインを走らせて失敗印を付けた）。
 * credential-store も同じ条件で読まないが、ここで先に止めて「資格情報が無い」と誤って言わない。
 */
const AGENT_RUN = !CI_MODE && agentSession();

const submitCredential = submitLoginForm;

/** 3. 資格情報ストアの ID/PW で 1 回だけログインし、state を保存する。 */
async function autoLogin(service, cred, checkUrl) {
  const spec = AUTO_LOGIN[service];
  return withAuthLock(service, { command: 'auto-login', authOptions }, async () => {
    ensureAuthDirectories(service, authOptions);
    const { chromium } = await import('playwright');
    const context = await chromium.launchPersistentContext(resolveProfileDir(service, authOptions), mergeLeanOptions({
      channel: 'chrome',
      // 画面ありは手元の PC だけ（CI のランナーには画面が無く、headed では起動できない）
      headless: CI_MODE || !spec.headed,
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      viewport: { width: 1366, height: 1000 },
      args: ['--disable-blink-features=AutomationControlled'],
    }));
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(spec.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await submitCredential(page, spec, cred);
      let signals = await pageSignals(page);
      let status = classifyLoginOutcome(service, { url: page.url(), ...signals });
      if (status === 'ok' && checkUrl) {
        // 確認先（KDP は Reports）で別途パスワードを求められたら、同じ資格情報で 1 回だけ送る
        await page.goto(checkUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(3000);
        if ((await pageSignals(page)).hasPassword) {
          await submitCredential(page, spec, cred);
          signals = await pageSignals(page);
          status = classifyLoginOutcome(service, { url: page.url(), ...signals });
        }
      }
      if (status !== 'ok') {
        // 次に人が見るときに理由が分かるよう、送信後の場所・表示の文言・画面の写しを残す（ID/PW は書かない）
        const shot = failShotPath(service);
        await page.screenshot({ path: shot }).catch(() => {});
        const where = page.url().split('?')[0];
        return { status, reason: `送信後 ${where}・表示「${signals.errorText || '文言なし'}」・画面 ${shot}` };
      }
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
  if (AUTO_LOGIN[service].inProcessOnly) {
    return { ...result, status: 'skipped', reason: 'ログイン状態を別プロセスへ持ち出せないため、取得スクリプトの中でログインする（asp-browser の openAsp）' };
  }
  const failMark = failMarkPath(service);
  result.sharedImport = CI_MODE ? null : importSharedState(service);

  let status = await statusAuthService({ repoRoot: REPO_ROOT }, service);
  result.statusBefore = status.status;

  if (status.status !== 'authenticated') {
    if (NO_LOGIN) return { ...result, status: 'needs-login', reason: status.reason };
    if (existsSync(failMark)) {
      return { ...result, status: 'blocked', reason: `前回の自動ログインが失敗したため停止中。確認後に ${failMark} を削除する` };
    }
    if (AGENT_RUN) {
      return { ...result, status: 'agent_skipped', reason: 'エージェント（Claude Code）からの実行では資格情報でログインしない。定期実行（17:45）かオーナーが実行する' };
    }
    const cred = storedCredential(service);
    if (!cred) {
      return { ...result, status: 'no_credential', reason: CI_MODE ? `Secrets（DOBOKU_AUTH_${service.toUpperCase()}_USER / _PASSWORD）が無い` : `資格情報ストアに ${keychainServiceNames(service).join(' / ')} が無い` };
    }
    const checkUrl = service === 'kdp' ? 'https://kdpreports.amazon.co.jp/dashboard' : null;
    const login = await autoLogin(service, cred, checkUrl).catch((e) => ({ status: 'error', reason: String(e.message).slice(0, 160) }));
    result.loggedInWith = cred.source;
    status = login.status === 'ok' ? await statusAuthService({ repoRoot: REPO_ROOT }, service) : { status: login.status, reason: login.reason };
    if (status.status !== 'authenticated') {
      // 口座不一致・2FA・ID/PW 不通は自動で繰り返さない（アカウントロックと別口座の混入を避ける）
      const reason = status.status === 'human_required'
        ? `2FA/CAPTCHA 等の人の確認が必要（npm run auth:login -- --service ${service}）${status.reason ? `・${status.reason}` : ''}`
        : `自動ログイン後も authenticated にならない（${status.reason ?? status.status}）`;
      mkdirSync(dirname(failMark), { recursive: true });
      writeFileSync(failMark, `${new Date().toISOString()} ${status.status} ${reason}\n`, { mode: 0o600 });
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
  if (CI_MODE) {
    const requested = opt('--service')?.split(',').map((x) => x.trim()).filter(Boolean) ?? [];
    if (process.env.GITHUB_ACTIONS !== 'true' || requested.length === 0 || requested.some((x) => !ciEnvCredentialServices().includes(x))) {
      console.error(`${TAG} --ci は GitHub Actions で、Secrets を許可した service（${ciEnvCredentialServices().join(' / ')}）を --service で指定したときだけ使える。検査不成立。`);
      return 2;
    }
  }
  if (!credentialStoreSupported() && !CI_MODE) {
    console.error(`${TAG} Mac・Windows 専用（OS の資格情報ストアを使う）。検査不成立。`);
    return 2;
  }
  if (!IS_MAC && (argv.includes('--export') || argv.includes('--dispatch-due'))) {
    console.error(`${TAG} --export / --dispatch-due は Mac 専用（CI へは Mac から一方向で渡す）。この PC では無視する。`);
  }
  const registry = loadAuthRegistry({ cwd: REPO_ROOT });
  const requested = opt('--service')?.split(',').map((s) => s.trim()).filter(Boolean);
  const candidates = requested ?? Object.keys(AUTO_LOGIN);
  const targets = [];
  const skipped = [];
  for (const service of candidates) {
    if (!AUTO_LOGIN[service] || !registry.services[service]) throw new Error(`自動ログイン非対応の service: ${service}`);
    const shared = sharedStatePath(service);
    if (!CI_MODE && !requested && !(shared && existsSync(shared)) && !hasStoredCredential(service)) {
      skipped.push({ service, status: 'skipped', reason: `共用 state も資格情報（${keychainServiceNames(service).join(' / ')}）も無い` });
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
    if (r.status !== 'ok' && r.status !== 'agent_skipped' && !NO_LOGIN && !CI_MODE) notify(`${service}: ${r.status} — ${r.reason ?? ''}`);
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
