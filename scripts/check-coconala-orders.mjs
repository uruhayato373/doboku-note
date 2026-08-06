#!/usr/bin/env node
/**
 * check-coconala-orders.mjs — 受注スナップショット ↔ orders-log の突合と、要対応の surface
 * ---------------------------------------------------------------------------
 * 背景: ココナラの受注は「ココナラ側の実体」と「orders-log.json（リポジトリの記録）」の
 *   二層になる。人手の追記に依存すると、①売れたのに記録が無い ②記録の金額/商品がズレる
 *   ③返信期限（48時間で自動キャンセル）や納品を落とす、が起きる。本ガードは
 *   `coconala-orders.mjs` が採った snapshot と orders-log を決定論的に突合する。
 *
 * オフライン検査（ネットワークに出ない）。実体の取得は `npm run coconala-orders` が担当。
 *
 * 検査:
 *   1. snapshot の取引が orders-log に存在する（talkroomId で突合）＝記録漏れの検知
 *   2. 突合できた取引の serviceId / priceYen / soldOn が一致
 *   3. 未返信 かつ 返信期限が REPLY_WARN_HOURS 以内 or 経過 → 要対応（自動キャンセル防止）
 *   4. status:'received' のまま STALE_DAYS 超 → 納品滞留の警告
 *   5. orders-log にあって snapshot に無い → 警告（talkroomId 誤り or 取引が消えた）
 *
 * 「検査ゼロを PASS と呼ばない」:
 *   - snapshot が無い / status:'partial' / SNAPSHOT_STALE_DAYS より古い → **検査不成立で exit 2**。
 *     「取引 0 件だから緑」と「1件も見ていないから緑」を区別する。
 *
 * 使い方:
 *   node scripts/check-coconala-orders.mjs             # 全検査
 *   node scripts/check-coconala-orders.mjs --staged    # 関連 staged がある時だけ（pre-commit 用）
 *   node scripts/check-coconala-orders.mjs --no-freshness  # 鮮度ゲートを外す（CI/オフライン用）
 *
 * exit: 0=整合 / 1=違反あり / 2=検査不成立（snapshot 欠落・partial・古い）
 * 真実源: .claude/knowledge/reference/coconala-operations.md
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { assessSnapshot, reconcileOrders, classifyReplyDeadlines } from './lib/coconala-guards.mjs';

const TAG = '[check-coconala-orders]';
const ROOT = process.cwd();
const SNAPSHOT_PATH = join(ROOT, '.claude/state/coconala/orders-snapshot.json');
const ORDERS_PATH = join(ROOT, '.claude/state/coconala/orders-log.json');

const REPLY_WARN_HOURS = 24;      // 返信期限の何時間前から要対応にするか
const STALE_DAYS = 5;             // received のまま何日で納品滞留とみなすか
const SNAPSHOT_STALE_DAYS = 7;    // snapshot が何日古いと検査不成立にするか

const staged = process.argv.includes('--staged');
const noFreshness = process.argv.includes('--no-freshness');

if (staged) {
  let changed = '';
  try {
    changed = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf-8' });
  } catch { changed = ''; }
  const relevant = changed.split('\n').some((p) =>
    p.includes('.claude/state/coconala/orders-log.json') ||
    p.includes('.claude/state/coconala/orders-snapshot.json') ||
    p.includes('scripts/check-coconala-orders.mjs')
  );
  if (!relevant) process.exit(0);
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch (e) { return { __parseError: String(e) }; }
}

const snap = readJson(SNAPSHOT_PATH);
const log = readJson(ORDERS_PATH);

// --- 検査成立性の判定（緑の意味を守る）→ 判定は coconala-guards（テスト済み） ---
const health = assessSnapshot(snap, Date.now(), { staleDays: SNAPSHOT_STALE_DAYS, checkFreshness: !noFreshness });
if (!health.ok) {
  console.error(`${TAG} ✗ 検査不成立: ${health.reason}`);
  console.error(`   取得タブ ${snap?.scan?.tabsOk ?? '?'}/${snap?.scan?.tabsTotal ?? '?'} — 再取得: npm run coconala-orders`);
  process.exit(2);
}
const ageDays = health.ageDays;
if (!log || log.__parseError) {
  console.error(`${TAG} ✗ orders-log.json が読めません（${ORDERS_PATH}）`);
  process.exit(1);
}

const snapOrders = Array.isArray(snap.orders) ? snap.orders : [];
const logOrders = Array.isArray(log.orders) ? log.orders : [];

const actions = [];
// 出品者の作業が要らない事実（納品確認待ち等）。要対応と混ぜないための別枠。
const infos = [];
const now = Date.now();

// 1 & 2 & 5. snapshot ↔ orders-log の突合（判定は coconala-guards）
const rec = reconcileOrders(snapOrders, logOrders);
const violations = [...rec.violations];
const warnings = [...rec.warnings];

// 3. 返信期限（48時間の自動キャンセル）— 判定は coconala-guards（unreplied では判定しない）
for (const d of classifyReplyDeadlines(snapOrders, now, { warnHours: REPLY_WARN_HOURS })) {
  const s2 = d.order;
  if (d.level === 'unknown') {
    warnings.push(`room ${s2.talkroomId}: 未返信だが返信期限を取得できていません（トークルームを直接確認）`);
  } else if (d.level === 'expired') {
    violations.push(`room ${s2.talkroomId}: 返信期限を経過しています（${s2.replyDueAt}）— 自動キャンセルの可能性。${s2.talkroomUrl}`);
  } else if (d.level === 'buyer-confirm') {
    // 出品者の作業は無い（無回答なら自動で「承諾」）。要対応に混ぜると不在中に偽の緊急が立つ。
    infos.push(
      `room ${s2.talkroomId}: 納品確認待ち（買い手の承諾期限 ${s2.replyDueAt} / 残り ${Math.max(0, d.hoursLeft).toFixed(0)} 時間）` +
      ` — 無回答なら自動で承諾。出品者の対応は不要（差し戻しが来たときのみ要対応）`
    );
  } else if (d.level === 'urgent') {
    actions.push(`room ${s2.talkroomId}: 返信期限まで ${d.hoursLeft.toFixed(1)} 時間（${s2.replyDueAt}）— 無連絡で自動キャンセル。${s2.talkroomUrl}`);
  } else {
    actions.push(`room ${s2.talkroomId}: 連絡期限が有効（${s2.replyDueAt} / 残り ${Math.floor(d.hoursLeft / 24)} 日）。${s2.talkroomUrl}`);
  }
}

// 3b. 購入前の問い合わせ（DM）。受注と違い突合相手が無いので surface に徹する。
const inquiries = Array.isArray(snap.inquiries) ? snap.inquiries : [];
for (const q of inquiries) {
  const what = q.serviceId ?? (q.subject ? `「${q.subject}」` : '（対象商品不明）');
  if (q.unread) {
    actions.push(`DM ${q.dmId}: 未読の問い合わせ ${what}（${q.dateText}）。${q.dmUrl}`);
  } else {
    actions.push(`DM ${q.dmId}: 既読の問い合わせ ${what}（${q.dateText}）— 返信済みか確認。${q.dmUrl}`);
  }
}

// 4. received のまま滞留
for (const l of logOrders) {
  if (l.status !== 'received') continue;
  const days = (now - Date.parse(l.date)) / 86_400_000;
  if (days > STALE_DAYS) {
    warnings.push(
      `orders-log: ${l.serviceId}（${l.date}）が ${Math.floor(days)} 日 status:'received' のままです` +
      ` — 納品済みなら delivered へ、未納品なら着手してください`
    );
  }
}

// --- 出力（実検査数を必ず出す） ---
const inqScanned = snap.scan?.tabs?.some((t) => t.key === 'inquiries' && t.ok);
console.log(
  `${TAG} 実検査 ココナラ側 取引 ${snapOrders.length} 件 / orders-log ${logOrders.length} 件 / ` +
  `問い合わせ(DM) ${inqScanned ? `${inquiries.length} 件` : '未取得'}` +
  `（snapshot ${ageDays.toFixed(1)} 日前・タブ ${snap.scan?.tabsOk}/${snap.scan?.tabsTotal} 取得）`
);
if (!inqScanned) {
  warnings.push('DM 一覧を取得できていません（購入前の問い合わせを見落とす可能性）— npm run coconala-orders を再実行');
}

if (actions.length) {
  console.log('');
  console.log(`${TAG} ▼ 要対応 ${actions.length} 件`);
  for (const a of actions) console.log(`  - ${a}`);
}
if (infos.length) {
  console.log('');
  console.log(`${TAG} ・進行中（対応不要）${infos.length} 件`);
  for (const i of infos) console.log(`  - ${i}`);
}
if (warnings.length) {
  console.log('');
  console.log(`${TAG} ⚠ 警告 ${warnings.length} 件`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (violations.length) {
  console.error('');
  console.error(`${TAG} ✗ 不整合 ${violations.length} 件`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error('');
  console.error('   運用・スキーマの真実源: .claude/knowledge/reference/coconala-operations.md');
  process.exit(1);
}
console.log('');
console.log(`${TAG} ✓ ココナラ側の取引はすべて orders-log と一致`);
