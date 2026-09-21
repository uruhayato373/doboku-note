#!/usr/bin/env node
/**
 * x-publish-scheduled.mjs — 承認済みキュー（scheduled/queued）から期日到来分を1本だけ CI で自動投稿する
 * ---------------------------------------------------------------------------
 * 背景: これまで X の予約投稿は Mac ローカルの手動 `publish-x.ts` 実行に依存していた。
 * CI（scheduled-publish.yml）から cron で回すには、単に「時間が来たから投稿」ではなく
 * 2026-06-12 凍結事故の再発防止（頻度・重複ゲート＝scripts/lib/x-frequency-gate.mjs）と、
 * ライブのアカウント状態（ロック・制限・凍結）を毎回確認したうえでしか投稿しない安全弁が要る。
 *
 * 判定不能は必ず block する設計（x-frequency-gate.mjs と同じ方針）:
 *   - kill switch（.claude/state/x-repost/PAUSED）が有る → gate-red で即終了
 *   - x-schedule-guard --queue / check-x-review が赤 → gate-red で即終了
 *   - 台帳と live のズレ（ledger-live-mismatch）・アカウント状態異常（account-state）は
 *     block ではなく「要人手」= exit 3（report-automation-failure 用の JSON を stdout に出す）。
 *     account-state のときは追加で kill switch ファイルを作成し、以後の run を止める。
 *   - 投稿後の live 検証（status.json の url を開いて本文先頭一致）が通らなければ exit 1。
 *
 * 各ステップは注入可能にしてある（tests/x-publish-scheduled.test.mjs が fake で全分岐を検証）。
 * 本番の既定実装（runGuardScripts / liveReader / publisher / verifyLive）だけが実際に
 * child_process・Playwright・ファイル書き込みに触れる。
 *
 * Usage:
 *   node scripts/x-publish-scheduled.mjs                 # dry-run（既定・投稿しない）
 *   node scripts/x-publish-scheduled.mjs --plan-only      # 候補選定と plan hash だけ（Playwright なし・CI の plan-x job）
 *   node scripts/x-publish-scheduled.mjs --commit         # allow のとき実際に投稿する（DOBOKU_CI_WRITE_PLAN_SHA256 が plan hash と一致するときだけ）
 *   node scripts/x-publish-scheduled.mjs --now <ISO>      # テスト用に現在時刻を固定
 *   node scripts/x-publish-scheduled.mjs --json           # summary を JSON 1 行で出力
 *
 * exit code:
 *   0 = 正常終了（ゲート作動・対象0件・dry-runでのallowを含む）
 *   1 = 投稿後の live 検証に失敗（本文不一致・非200）
 *   2 = 前提不成立（台帳が読めない等・想定外エラー）
 *   3 = 要人手（ledger-live-mismatch / account-state）。呼び出し側（workflow）が Issue にする
 * ---------------------------------------------------------------------------
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { WRITE_PLAN_HASH_ENV, stableStringify } from './lib/ci-write-gate.mjs';
import { nowJstIso } from './lib/jst-date.mjs';
import {
  evaluateXFrequencyGate,
  selectDueTweet,
  loadLedger,
  appendPostedLog,
} from './lib/x-frequency-gate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NAME = 'x-publish-scheduled';
const ACCOUNT = 'doboku373';
const PROFILE_URL = 'https://x.com/doboku373';
const PUBLISH_X_SCRIPT = '.claude/skills/social/publish-x/publish-x.ts';
export const PAUSED_RELATIVE = '.claude/state/x-repost/PAUSED';
const SALES_KEYWORD_RE = /(販売|¥|円|マガジン|購入)/;

/** アカウント状態異常を示す本文パターン（readOwnTimeline / defaultLiveReader 共通）。 */
export const ACCOUNT_STATE_ALERT_RE = /(アカウントがロック|一時的に制限|凍結|suspended|locked)/i;

/**
 * 承認済みキュー項目から plan hash を決める（pure）。scheduled-publish は人の dispatch を伴わないので、
 * 「人が status.json を scheduled/queued にした内容」そのものを承認とみなし、その hash を
 * DOBOKU_CI_WRITE_PLAN_SHA256 として資格情報側（resolver の writeScripts 許可）へ渡す。
 * plan-x job が計算して publish-x job へ渡し、--commit 時に本スクリプトが再計算して突合する。
 */
export function queueItemHash(item) {
  return createHash('sha256').update(stableStringify({
    draft: item.draft, key: String(item.key), text: item.text ?? '', title: item.title ?? '', scheduledAt: item.scheduledAt ?? null, kind: item.kind ?? 'post',
  })).digest('hex');
}

function pausedPath(root) {
  return join(root, PAUSED_RELATIVE);
}

/**
 * kill switch と2つの検査スクリプトを実行する。いずれか赤なら ok:false。
 * check-x-review.mjs が存在しなければ skip する（存在確認して無ければ skip と出す仕様）。
 */
function defaultRunGuardScripts({ root }) {
  const notes = [];
  let ok = true;

  if (existsSync(pausedPath(root))) {
    ok = false;
    notes.push('kill-switch: PAUSED が存在する');
  }

  const guard = spawnSync('node', ['scripts/x-schedule-guard.mjs', '--queue'], {
    cwd: root, encoding: 'utf-8', shell: process.platform === 'win32',
  });
  if (guard.status !== 0) {
    ok = false;
    notes.push(`x-schedule-guard --queue rc=${guard.status}`);
  } else {
    notes.push('x-schedule-guard --queue OK');
  }

  const reviewScript = join(root, 'scripts/check-x-review.mjs');
  if (!existsSync(reviewScript)) {
    notes.push('check-x-review.mjs: skip（存在しない）');
  } else {
    const review = spawnSync('node', ['scripts/check-x-review.mjs'], {
      cwd: root, encoding: 'utf-8', shell: process.platform === 'win32',
    });
    if (review.status !== 0) {
      ok = false;
      notes.push(`check-x-review rc=${review.status}`);
    } else {
      notes.push('check-x-review OK');
    }
  }

  return { ok, detail: notes.join(' / ') };
}

/**
 * @doboku373 のプロフィールから当日投稿数とアカウント状態を読む（read-only）。
 * DOM 構造は運用中に校正の余地がある前提で、判定不能側（accountState 不明・todayCount null）
 * に倒すことを優先する（frequency gate 側で live-unavailable として block される）。
 */
export async function readOwnTimeline(page, account) {
  await page.goto(`https://x.com/${account}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  if (ACCOUNT_STATE_ALERT_RE.test(bodyText)) {
    return { ok: true, accountState: 'locked', todayCount: null };
  }

  const todayJst = nowJstIso().slice(0, 10);
  const todayCount = await page.evaluate((today) => {
    const times = Array.from(document.querySelectorAll('article time[datetime]'));
    let count = 0;
    for (const t of times) {
      const iso = t.getAttribute('datetime');
      if (!iso) continue;
      const jst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (jst === today) count++;
    }
    return count;
  }, todayJst);

  return { ok: true, accountState: 'ok', todayCount };
}

async function defaultLiveReader({ account }) {
  const { chromium } = await import('playwright');
  const { resolveProfileDir } = await import('./lib/playwright-auth-profile.mjs');
  const { leanContextOptions } = await import('./lib/playwright-launch.mjs');
  const { attachCISession } = await import('./lib/playwright-auth-state.mjs');
  const { resolveStatePath } = await import('./lib/playwright-auth-profile.mjs');

  let ctx;
  try {
    const profile = resolveProfileDir('x', { cwd: ROOT, repoRoot: ROOT });
    ctx = await chromium.launchPersistentContext(profile, leanContextOptions({
      headless: true,
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 900 },
    }));
    await attachCISession(ctx, 'x', { statePath: resolveStatePath('x', { cwd: ROOT, repoRoot: ROOT }) });
    const page = ctx.pages()[0] || (await ctx.newPage());
    const result = await readOwnTimeline(page, account);
    await ctx.close();
    return result;
  } catch (e) {
    try { await ctx?.close(); } catch { /* best-effort */ }
    return { ok: false, accountState: 'unknown', todayCount: null, error: e.message };
  }
}

/** publish-x.ts を child_process 経由で1回だけ呼ぶ（allow かつ --commit のときだけ呼ばれる）。 */
function defaultPublisher({ draft, key, root, dryRun }) {
  const args = ['tsx', PUBLISH_X_SCRIPT, draft, '--tweet', String(key), '--immediate'];
  if (dryRun) args.push('--dry-run');
  const r = spawnSync('npx', args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) return { ok: false, detail: `publish-x.ts rc=${r.status}` };
  return { ok: true };
}

/** 投稿後 live 検証: status.json の url を開き 200 かつ本文先頭20文字一致。 */
async function defaultVerifyLive({ draft, key, root }) {
  const { readFileSync } = await import('node:fs');
  const statusPath = join(root, 'content/sns/x/draft', draft, 'status.json');
  let data;
  try {
    data = JSON.parse(readFileSync(statusPath, 'utf-8'));
  } catch (e) {
    return { ok: false, detail: `status.json 読み込み失敗: ${e.message}` };
  }
  const tweet = data.tweets?.[String(key)];
  const url = tweet?.url;
  const expectedHead = String(tweet?.text || '').replace(/\s+/g, '').slice(0, 20);
  if (!url) return { ok: false, detail: 'status.json に url が無い（投稿URLが記録されていない）' };
  if (!expectedHead) return { ok: false, detail: 'status.json に text が無く本文照合できない' };

  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = resp?.status() ?? 0;
    const bodyText = await page.evaluate(() => document.body.innerText || '');
    await browser.close();
    if (status !== 200) return { ok: false, detail: `HTTP ${status}`, url };
    const normalized = bodyText.replace(/\s+/g, '');
    if (!normalized.includes(expectedHead)) {
      return { ok: false, detail: `本文先頭${expectedHead.length}文字が一致しない`, url };
    }
    return { ok: true, url };
  } catch (e) {
    try { await browser?.close(); } catch { /* best-effort */ }
    return { ok: false, detail: `live 検証エラー: ${e.message}` };
  }
}

/**
 * 本体。全ステップを注入可能にしてある（テストは fake を渡す）。
 * @returns {Promise<{exitCode:number, summary:object}>}
 */
export async function run(opts = {}) {
  const {
    root = ROOT,
    argv = process.argv.slice(2),
    runGuardScripts = defaultRunGuardScripts,
    loadLedgerFn = (o) => loadLedger(o),
    liveReader = defaultLiveReader,
    publisher = defaultPublisher,
    verifyLive = defaultVerifyLive,
    appendPostedLogFn = (o) => appendPostedLog(o),
    fsImpl = { existsSync, mkdirSync, writeFileSync },
    log = console.log,
  } = opts;

  const COMMIT = argv.includes('--commit');
  const PLAN_ONLY = argv.includes('--plan-only'); // 候補選定と plan hash まで（Playwright を開かない・plan-x job 用）
  const JSON_OUT = argv.includes('--json');
  const nowArgIdx = argv.indexOf('--now');
  const NOW = nowArgIdx >= 0 ? argv[nowArgIdx + 1] : nowJstIso();

  const emit = (summary) => {
    log(JSON_OUT ? JSON.stringify(summary) : `[${NAME}] ${summary.result}: ${summary.detail ?? ''}`);
    return summary;
  };

  // (1) kill switch + x-schedule-guard --queue + check-x-review
  let guard;
  try {
    guard = await runGuardScripts({ root });
  } catch (e) {
    return { exitCode: 2, summary: emit({ name: NAME, result: 'precondition-error', detail: e.message }) };
  }
  if (!guard || !guard.ok) {
    return { exitCode: 0, summary: emit({ name: NAME, result: 'gate-red', detail: guard?.detail ?? '' }) };
  }

  // (2) 台帳 + 対象選定
  let ledger;
  try {
    ledger = loadLedgerFn({ root });
  } catch (e) {
    return { exitCode: 2, summary: emit({ name: NAME, result: 'precondition-error', detail: `台帳読み込み失敗: ${e.message}` }) };
  }
  const due = selectDueTweet(ledger, NOW);
  if (!due) {
    return { exitCode: 0, summary: emit({ name: NAME, result: 'no-due', detail: '対象 0 件' }) };
  }
  const planHash = queueItemHash(due);
  log(`[${NAME}] due ${due.draft}/${due.key} plan_hash=${planHash}`);
  if (PLAN_ONLY) {
    return { exitCode: 0, summary: emit({ name: NAME, result: 'plan', detail: `${due.draft}/${due.key}`, planHash, draft: due.draft, key: String(due.key) }) };
  }
  // --commit は plan-x job が渡した hash と一致するときだけ（キュー内容が plan 後に変わっていたら何もしない）
  const env = opts.env ?? process.env;
  if (COMMIT && env[WRITE_PLAN_HASH_ENV] !== planHash) {
    return { exitCode: 2, summary: emit({ name: NAME, result: 'plan-hash-mismatch', detail: `${WRITE_PLAN_HASH_ENV} がキュー項目の hash と一致しない（plan 後に status.json が変わった可能性）`, planHash }) };
  }

  const paused = fsImpl.existsSync(pausedPath(root));

  // (3) live 読み取り
  const live = await liveReader({ account: ACCOUNT, profileUrl: PROFILE_URL, root });

  // (4) 頻度・重複ゲート
  const candidateText = due.text || due.title || '';
  const candidate = {
    text: candidateText,
    isSales: SALES_KEYWORD_RE.test(`${due.title || ''}${due.text || ''}`),
    kind: due.kind || 'post',
    mediaSha256: Array.isArray(due.mediaSha256) ? due.mediaSha256 : [],
    scheduledAtJst: due.scheduledAt,
  };
  const gate = evaluateXFrequencyGate({ ledger, live, candidate, now: NOW, paused });

  const rules = gate.blocks.map((b) => b.rule);
  const countsLine = `候補 1 / 帯内 1 / 台帳当日 ${gate.counts.today} / live 当日 ${live?.todayCount ?? '不明'} / 判定 ${gate.allow ? 'allow' : `block(${rules.join(',')})`}`;
  log(countsLine);

  if (!gate.allow) {
    const needsHuman = rules.includes('ledger-live-mismatch') || rules.includes('account-state');
    if (needsHuman) {
      if (rules.includes('account-state')) {
        fsImpl.mkdirSync(dirname(pausedPath(root)), { recursive: true });
        fsImpl.writeFileSync(pausedPath(root), `reason: account-state\nblocks: ${JSON.stringify(gate.blocks)}\nat: ${NOW}\n`);
      }
      const payload = {
        channel: 'x-publish',
        title: `x-publish-scheduled 要人手: ${rules.join(',')}`,
        body: JSON.stringify({ blocks: gate.blocks, counts: gate.counts }, null, 2),
      };
      log(JSON.stringify(payload));
      return { exitCode: 3, summary: { name: NAME, result: 'manual', rules, gate } };
    }
    log(`::notice::x-publish-scheduled block rule=${rules.join(',')} counts=${JSON.stringify(gate.counts)}`);
    return { exitCode: 0, summary: { name: NAME, result: 'gate-block', rules, gate } };
  }

  if (!COMMIT) {
    return { exitCode: 0, summary: emit({ name: NAME, result: 'dry-run-allow', detail: countsLine, planHash }) };
  }

  // (5) 投稿
  const pub = await publisher({ draft: due.draft, key: due.key, root, dryRun: false });
  if (!pub.ok) {
    return { exitCode: 2, summary: emit({ name: NAME, result: 'publish-failed', detail: pub.detail }) };
  }

  // (6) live 検証
  const verify = await verifyLive({ draft: due.draft, key: due.key, root });
  if (!verify.ok) {
    return { exitCode: 1, summary: emit({ name: NAME, result: 'verify-failed', detail: verify.detail }) };
  }

  // (7) posted-log 追記
  appendPostedLogFn({
    root,
    entry: { draft: due.draft, key: due.key, at: NOW, url: verify.url, kind: candidate.kind, mediaSha256: candidate.mediaSha256 },
  });

  return { exitCode: 0, summary: emit({ name: NAME, result: 'posted', detail: verify.url }) };
}

async function main() {
  const { exitCode, summary } = await run();
  if (!process.argv.includes('--json') && summary?.result && !['posted', 'dry-run-allow', 'gate-block', 'gate-red', 'no-due'].includes(summary.result)) {
    console.error(`[${NAME}] ${summary.result}: ${summary.detail ?? ''}`);
  }
  process.exit(exitCode);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) main();
