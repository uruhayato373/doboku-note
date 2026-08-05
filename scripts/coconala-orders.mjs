#!/usr/bin/env node
/**
 * coconala-orders.mjs — ココナラ「取引管理（出品）」の受注実績を read-only で収集する
 * ---------------------------------------------------------------------------
 * なぜ必要か:
 *   ココナラの受注は購入通知メールと画面にしか無く、リポジトリ側（orders-log.json）は
 *   人手の追記に依存していた。2026-08-04 の初受注では、エージェントが「何が売れたか」を
 *   知る手段が無く、その場限りの Playwright を書いて調べる羽目になった（記録も残らない）。
 *   本スクリプトは受注一覧を**機械可読なスナップショット**に落とし、以後の突合
 *   （check-coconala-orders.mjs）と受注処理（/coconala-order）の入力にする。
 *
 * §4「ダッシュボードはスクレイプしない」との関係:
 *   あちらの対象は **KPI（閲覧数・お気に入り）＝手動貼付が正**。こちらは **取引の実在**
 *   （何が・いつ・いくらで売れ、どのトークルームか）で、記録の正確性が金銭と納品に直結し、
 *   人手転記では取りこぼす。read-only・低頻度・書き込み一切なし。
 *
 * 個人情報を保存しない（coconala-operations.md privacyNote）:
 *   購入者名・購入者 ID・トークルーム本文は**抽出しない**。保存するのは
 *   talkroomId / サービス / 金額 / 販売日 / 納品予定 / ステータス / 未返信フラグ / 返信期限。
 *
 * 受注（トークルーム）とは別に「購入前の問い合わせ（ダイレクトメッセージ）」も採る:
 *   2026-08-05、C8 の購入者から **DM で別商品(C1)の購入前質問**が届いたが、受注一覧しか
 *   見ていなかったため機械では拾えなかった（人が気づいて指摘した）。DM は売上機会そのもの
 *   なので一覧だけ採取する。**スレッドは開かない**（開くと未読→既読になり、人が気づく手段を壊す）。
 *
 * 実機確定（2026-08-05）:
 *   タブ URL = /mypage/received_orders/{required,requests,open,closed,canceled,flags}
 *   行 = .d-providerTalkroomCassetteBlock（PC/SP の二重描画があるため talkroomId で dedupe）
 *   未返信の絞り込み = /mypage/received_orders/open?message_status=2
 *   48時間の自動キャンセル期限は一覧に出ず、トークルーム本文の「期限 M/D HH:MM」にのみ出る。
 *   DM 一覧 = /message?fromMyPage=true、行 = a.c-messageItemWrap[href="/mypage/direct_message/{id}"]
 *     日時 = .c-messageItemDate_text（相対表記）／本文プレビュー = .c-messageItemBody_text
 *     未読バッジ = .c-messageItemIcon（中身あり＝未読）
 *
 * 使い方:
 *   node scripts/coconala-orders.mjs                 # 全タブ収集＋未返信ルームの期限取得
 *   node scripts/coconala-orders.mjs --no-deadline   # 期限取得を省く（ルーム個別訪問なし）
 *   node scripts/coconala-orders.mjs --headless
 *
 * 出力: .claude/state/coconala/orders-snapshot.json
 * exit: 0=全タブ取得成功 / 2=1つでも取得失敗（partial・「検査ゼロを PASS と呼ばない」）
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  launchContext,
  waitForLogin,
  assertAccount,
  readCatalog,
  sleep,
  ROOT,
} from './lib/coconala-session.mjs';

const TAG = '[coconala-orders]';
const HEADLESS = process.argv.includes('--headless');
const WITH_DEADLINE = !process.argv.includes('--no-deadline');
const MAX_DEADLINE_ROOMS = 10; // ルーム個別訪問の上限（無制限に開かない）

const OUT_PATH = join(ROOT, '.claude/state/coconala/orders-snapshot.json');

/** 取引管理（出品）のタブ。2026-08-05 に実機のタブをクリックして確定。 */
const TABS = [
  { key: 'required', label: '要対応', url: 'https://coconala.com/mypage/received_orders/required' },
  { key: 'requests', label: '見積り', url: 'https://coconala.com/mypage/received_orders/requests' },
  { key: 'open', label: '取引中', url: 'https://coconala.com/mypage/received_orders/open' },
  { key: 'closed', label: '完了', url: 'https://coconala.com/mypage/received_orders/closed' },
  { key: 'canceled', label: 'キャンセル', url: 'https://coconala.com/mypage/received_orders/canceled' },
];

/** 一覧の 1 行から、個人情報を含まない項目だけを抽出する。 */
function extractRows() {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const rows = [];
  for (const el of document.querySelectorAll('.d-providerTalkroomCassetteBlock')) {
    const titleEl = el.querySelector('a.d-providerTalkroomCassetteService_title');
    if (!titleEl) continue;
    const href = titleEl.getAttribute('href') || '';
    const id = (href.match(/\/talkrooms\/(\d+)/) || [])[1];
    if (!id) continue;
    const priceText = norm(el.querySelector('.d-providerTalkroomCassettePrice_price')?.innerText);
    const soldText = norm(el.querySelector('.d-providerTalkroomCassetteSchedule_openDate')?.innerText);
    const dueUnset = !!el.querySelector('.d-providerTalkroomCassetteSchedule_unset');
    const schedule = norm(el.querySelector('.d-providerTalkroomCassetteSchedule')?.innerText);
    rows.push({
      talkroomId: id,
      // サービス名＋キャッチが連結された表示名。カタログ title との前方一致で serviceId を引く。
      listingText: norm(titleEl.innerText),
      priceText,
      soldText,
      dueUnset,
      scheduleText: schedule,
      statusLabel: norm(el.querySelector('.d-providerTalkroomCassetteStatus_label')?.innerText),
      // 最終メッセージの時刻のみ（本文・氏名は取らない）
      lastMessageAt: norm(el.querySelector('.d-providerTalkroomCassetteService_sentAt')?.innerText),
    });
  }
  return rows;
}

/** DM 一覧の 1 行から、個人情報を含まない項目だけを抽出する（スレッドは開かない）。 */
function extractInquiries() {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const a of document.querySelectorAll('a.c-messageItemWrap')) {
    const href = a.getAttribute('href') || '';
    const id = (href.match(/\/direct_message\/(\d+)/) || [])[1];
    if (!id) continue;
    const preview = norm(a.querySelector('.c-messageItemBody_text')?.innerText);
    out.push({
      dmId: id,
      dateText: norm(a.querySelector('.c-messageItemDate_text')?.innerText),
      // プレビュー冒頭の「サービス名 …」だけを採る（購入者の文面は保存しない）
      subject: (preview.match(/^「([^」]{0,80})/) || [, ''])[1],
      unread: norm(a.querySelector('.c-messageItemIcon')?.innerText).length > 0
        || !!a.querySelector('.c-messageItemIcon')?.children.length,
    });
  }
  return out;
}

/** "2,500円" → 2500 */
function parseYen(s) {
  const m = String(s || '').replace(/,/g, '').match(/(\d+)\s*円/);
  return m ? Number(m[1]) : null;
}

/** "販売日： 2026/08/04" → "2026-08-04" */
function parseSoldOn(s) {
  const m = String(s || '').match(/(\d{4})\/(\d{2})\/(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 「期限 8/6 16:00」→ ISO 風文字列。年は販売日の年を採る（表示に年が無いため）。 */
function parseDeadline(text, soldOn) {
  const m = String(text || '').match(/期限\s*(\d{1,2})\/(\d{1,2})\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const year = (soldOn || '').slice(0, 4) || String(new Date().getFullYear());
  const [, mo, d, h, mi] = m;
  return `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${mi}`;
}

async function gotoTab(page, url) {
  for (let i = 0; i < 2; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
      await sleep(1800);
      return true;
    } catch {
      if (i === 1) return false;
      await sleep(1500);
    }
  }
  return false;
}

async function main() {
  const catalog = readCatalog();
  // 表示名（サービス名＋キャッチ）→ serviceId。カタログ title の前方一致で引く。
  const byTitle = Object.values(catalog)
    .filter((s) => s.title)
    .sort((a, b) => b.title.length - a.title.length); // 長い title を優先（前方一致の取り違え防止）
  const resolveServiceId = (listingText) =>
    byTitle.find((s) => listingText.startsWith(s.title))?.id ?? null;

  const ctx = await launchContext({ headless: HEADLESS });
  const page = ctx.pages()[0] || (await ctx.newPage());

  const login = await waitForLogin(page, { tag: TAG });
  if (!login.ok) {
    console.error(`${TAG} ✗ ${login.reason}`);
    await ctx.close();
    process.exit(2);
  }
  const acct = await assertAccount(page, { tag: TAG });
  if (!acct.ok) {
    console.error(`${TAG} ✗ アカウント不一致で中断: ${acct.reason}`);
    await ctx.close();
    process.exit(2);
  }

  const scan = [];
  const byRoom = new Map();

  for (const tab of TABS) {
    const ok = await gotoTab(page, tab.url);
    if (!ok) {
      scan.push({ ...tab, ok: false, rows: null, reason: 'ページ取得に失敗' });
      console.error(`${TAG} ✗ ${tab.label}: ページ取得に失敗`);
      continue;
    }
    const raw = await page.evaluate(extractRows);
    // PC/SP の二重描画があるため talkroomId で dedupe（素の件数を信じない）
    const seen = new Set();
    let added = 0;
    for (const r of raw) {
      if (seen.has(r.talkroomId)) continue;
      seen.add(r.talkroomId);
      added++;
      if (byRoom.has(r.talkroomId)) continue; // 先に見たタブの分類を優先
      byRoom.set(r.talkroomId, {
        talkroomId: r.talkroomId,
        talkroomUrl: `https://coconala.com/talkrooms/${r.talkroomId}`,
        tab: tab.key,
        tabLabel: tab.label,
        serviceId: resolveServiceId(r.listingText),
        listingText: r.listingText,
        priceYen: parseYen(r.priceText),
        soldOn: parseSoldOn(r.soldText),
        deliveryDueSet: !r.dueUnset,
        statusLabel: r.statusLabel,
        lastMessageAt: r.lastMessageAt,
        unreplied: false,
        replyDueAt: null,
      });
    }
    scan.push({ ...tab, ok: true, rows: added, rawRows: raw.length });
    console.log(`${TAG} ${tab.label.padEnd(6)} 取引 ${added} 件（素 ${raw.length} 行→dedupe）`);
  }

  // 未返信の絞り込みタブでフラグを立てる
  let unrepliedOk = false;
  if (await gotoTab(page, 'https://coconala.com/mypage/received_orders/open?message_status=2')) {
    const raw = await page.evaluate(extractRows);
    const ids = new Set(raw.map((r) => r.talkroomId));
    for (const id of ids) if (byRoom.has(id)) byRoom.get(id).unreplied = true;
    unrepliedOk = true;
    console.log(`${TAG} 未返信 ${ids.size} 件`);
  } else {
    console.error(`${TAG} ✗ 未返信タブ: ページ取得に失敗`);
  }
  scan.push({ key: 'unreplied', label: '未返信', url: 'https://coconala.com/mypage/received_orders/open?message_status=2', ok: unrepliedOk, rows: unrepliedOk ? [...byRoom.values()].filter((o) => o.unreplied).length : null });

  // 自動キャンセル期限はトークルーム本文にしか出ない。**取引中の room はすべて**開いて拾う。
  //   当初は unreplied の room だけを対象にしていたが、2026-08-05 に
  //   「納品予定日を登録した（システムメッセージ）」だけで coconala 側の未返信フラグが
  //   false に反転する一方、**48時間の自動キャンセル期限バナーは残り続ける**ことを実測した。
  //   unreplied を条件にすると、期限が生きているのに検査が静かになる（＝取引を落とす偽陰性）。
  let deadlineFailed = 0;
  if (WITH_DEADLINE) {
    const targets = [...byRoom.values()].filter((o) => o.tab === 'open').slice(0, MAX_DEADLINE_ROOMS);
    for (const o of targets) {
      if (!(await gotoTab(page, o.talkroomUrl))) { deadlineFailed++; continue; }
      const text = await page.evaluate(() => (document.body?.innerText || '').slice(0, 1500));
      o.replyDueAt = parseDeadline(text, o.soldOn);
      if (!o.replyDueAt) deadlineFailed++;
    }
    if (targets.length) {
      console.log(`${TAG} 返信期限 ${targets.length - deadlineFailed}/${targets.length} 件を取得`);
    }
  }

  // 購入前の問い合わせ（DM）。一覧だけ採る＝スレッドは開かない（既読にしない）。
  let inquiries = [];
  let inquiriesOk = false;
  if (await gotoTab(page, 'https://coconala.com/message?fromMyPage=true')) {
    const raw = await page.evaluate(extractInquiries);
    inquiries = raw.map((r) => ({
      ...r,
      dmUrl: `https://coconala.com/mypage/direct_message/${r.dmId}`,
      serviceId: resolveServiceId(r.subject),
    }));
    inquiriesOk = true;
    console.log(`${TAG} 問い合わせ(DM) ${inquiries.length} 件（未読 ${inquiries.filter((i) => i.unread).length}）`);
  } else {
    console.error(`${TAG} ✗ DM 一覧: ページ取得に失敗`);
  }
  scan.push({ key: 'inquiries', label: '問い合わせ(DM)', url: 'https://coconala.com/message?fromMyPage=true', ok: inquiriesOk, rows: inquiriesOk ? inquiries.length : null });

  await ctx.close();

  const orders = [...byRoom.values()].sort((a, b) => String(b.soldOn).localeCompare(String(a.soldOn)));
  const tabsOk = scan.filter((s) => s.ok).length;
  const status = tabsOk === scan.length ? 'ok' : 'partial';
  const unresolved = orders.filter((o) => !o.serviceId);

  mkdirSync(join(ROOT, '.claude/state/coconala'), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        version: 1,
        fetchedAt: new Date().toISOString(),
        status,
        source: 'coconala.com /mypage/received_orders/*（Playwright・read-only）',
        privacyNote:
          '購入者名・購入者ID・トークルーム本文・DM 本文は保存しない。保存するのは talkroomId / dmId / サービス / 金額 / 日付 / ステータス / 未返信 / 返信期限のみ。DM は subject（引用されたサービス名）だけを採る。',
        scan: { tabs: scan, tabsOk, tabsTotal: scan.length, deadlineFailed },
        orders,
        inquiries,
      },
      null,
      2
    ) + '\n'
  );

  console.log('');
  console.log(
    `${TAG} タブ ${tabsOk}/${scan.length} 取得・取引 ${orders.length} 件・問い合わせ ${inquiries.length} 件 → ${OUT_PATH}`
  );
  if (unresolved.length) {
    console.error(`${TAG} ⚠ カタログに紐づかない取引 ${unresolved.length} 件（title 変更の疑い）:`);
    for (const o of unresolved) console.error(`    room ${o.talkroomId}: ${o.listingText.slice(0, 40)}`);
  }
  if (status !== 'ok') {
    console.error(`${TAG} ✗ partial（取得できなかったタブがあります）— 件数を「全件」と扱わないこと`);
    process.exit(2);
  }
  console.log(`${TAG} ✓ 全タブ取得`);
}

main().catch((e) => {
  console.error(`${TAG} ✗ ${e.message}`);
  process.exit(2);
});
