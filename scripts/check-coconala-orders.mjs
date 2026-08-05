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

// --- 検査成立性の判定（緑の意味を守る） ---
if (!snap || snap.__parseError) {
  console.error(`${TAG} ✗ 検査不成立: 受注スナップショットがありません（${SNAPSHOT_PATH}）`);
  console.error(`   先に実行: npm run coconala-orders`);
  process.exit(2);
}
if (snap.status !== 'ok') {
  console.error(`${TAG} ✗ 検査不成立: snapshot.status="${snap.status}"（取得できなかったタブがある）`);
  console.error(`   取得タブ ${snap.scan?.tabsOk ?? '?'}/${snap.scan?.tabsTotal ?? '?'} — 再実行: npm run coconala-orders`);
  process.exit(2);
}
const ageDays = (Date.now() - Date.parse(snap.fetchedAt)) / 86_400_000;
if (!noFreshness && !(ageDays < SNAPSHOT_STALE_DAYS)) {
  console.error(`${TAG} ✗ 検査不成立: snapshot が古い（${ageDays.toFixed(1)} 日前・上限 ${SNAPSHOT_STALE_DAYS} 日）`);
  console.error(`   再取得: npm run coconala-orders`);
  process.exit(2);
}
if (!log || log.__parseError) {
  console.error(`${TAG} ✗ orders-log.json が読めません（${ORDERS_PATH}）`);
  process.exit(1);
}

const snapOrders = Array.isArray(snap.orders) ? snap.orders : [];
const logOrders = Array.isArray(log.orders) ? log.orders : [];
const logByRoom = new Map(logOrders.filter((o) => o.talkroomId).map((o) => [String(o.talkroomId), o]));

const violations = [];
const warnings = [];
const actions = [];
const now = Date.now();

// 1 & 2. snapshot → orders-log の突合
for (const s of snapOrders) {
  const l = logByRoom.get(String(s.talkroomId));
  if (!l) {
    violations.push(
      `ココナラに取引があるのに orders-log に記録がありません: room ${s.talkroomId}` +
      `（${s.serviceId ?? s.listingText.slice(0, 24)} / ¥${s.priceYen} / ${s.soldOn}）` +
      ` — /coconala-order で追記してください`
    );
    continue;
  }
  if (s.serviceId && l.serviceId !== s.serviceId) {
    violations.push(`room ${s.talkroomId}: serviceId 不一致（記録 "${l.serviceId}" vs 実体 "${s.serviceId}"）`);
  }
  if (typeof s.priceYen === 'number' && typeof l.priceYen === 'number' && s.priceYen !== l.priceYen) {
    violations.push(`room ${s.talkroomId}: priceYen 不一致（記録 ${l.priceYen} vs 実体 ${s.priceYen}）`);
  }
  if (s.soldOn && l.date && s.soldOn !== l.date) {
    violations.push(`room ${s.talkroomId}: 販売日 不一致（記録 ${l.date} vs 実体 ${s.soldOn}）`);
  }
}

// 3. 返信期限（48時間の自動キャンセル）
for (const s of snapOrders) {
  if (!s.unreplied) continue;
  if (!s.replyDueAt) {
    warnings.push(`room ${s.talkroomId}: 未返信だが返信期限を取得できていません（トークルームを直接確認）`);
    continue;
  }
  const left = (Date.parse(s.replyDueAt) - now) / 3_600_000;
  if (left < 0) {
    violations.push(
      `room ${s.talkroomId}: 返信期限を経過しています（${s.replyDueAt}）— 自動キャンセルの可能性。${s.talkroomUrl}`
    );
  } else if (left <= REPLY_WARN_HOURS) {
    actions.push(
      `room ${s.talkroomId}: 返信期限まで ${left.toFixed(1)} 時間（${s.replyDueAt}）— 無連絡で自動キャンセル。${s.talkroomUrl}`
    );
  } else {
    actions.push(`room ${s.talkroomId}: 未返信（期限 ${s.replyDueAt} / 残り ${Math.floor(left / 24)} 日）。${s.talkroomUrl}`);
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

// 5. orders-log にあって snapshot に無い
const snapRooms = new Set(snapOrders.map((s) => String(s.talkroomId)));
for (const l of logOrders) {
  if (!l.talkroomId) {
    warnings.push(`orders-log: ${l.serviceId}（${l.date}）に talkroomId がありません — 取引を追跡できません`);
    continue;
  }
  if (!snapRooms.has(String(l.talkroomId))) {
    warnings.push(`orders-log: room ${l.talkroomId}（${l.serviceId}）がココナラ側の一覧にありません（talkroomId 誤りの疑い）`);
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
