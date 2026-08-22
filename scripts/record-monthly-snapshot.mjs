#!/usr/bin/env node
/**
 * record-monthly-snapshot.mjs — 月次の「季節性を後から判定できる 1 行」を積む。
 * ---------------------------------------------------------------------------
 * 背景（2026-08-17〜18）: 「NSM（GA4）と GSC の乖離」の調査が 4 週も持ち越された真因は、
 *   検証手段に選んだ**前年同期比が実行不可能だった**こと。2025 年のデータが 1 件も無く、
 *   「比較する」と決めた時点で詰んでいたのに、それが分かるまで 4 週かかった。
 *
 *   結論そのもの（季節性で説明がつき計測異常ではない）は試験日 × 売上曲線で出たが、
 *   **来年の自分が同じ壁に当たらないよう、今から 1 行ずつ積む**のがこのスクリプト。
 *
 * 設計方針: **重くしない**。
 *   - 新しい取得はしない。既にリポジトリにある成果物（GA4 / GSC / 売上 / 試験カレンダー）だけを読む
 *   - 1 か月 1 行。追記のみで、既存行は上書きしない（`--force` で明示的に置換）
 *   - 2027 年に初めて前年同期比が成立する。それまでは試験日 × 売上曲線が判定手段
 *
 * 出力: .claude/state/metrics/monthly-snapshot.json
 *   { month, organicUsers, gscClicks, gscImpressions, salesYen, salesCount, examEvents[], sources{} }
 *
 * Usage:
 *   node scripts/record-monthly-snapshot.mjs              # 前月を追記（月初の実行を想定）
 *   node scripts/record-monthly-snapshot.mjs --month 2026-07
 *   node scripts/record-monthly-snapshot.mjs --force      # 既存行を置換
 *   node scripts/record-monthly-snapshot.mjs --json
 *
 * exit: 0 追記/既存あり / 1 検査不成立（データ源が読めない）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, writeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// 記録する日付は JST 基準。toISOString() は UTC なので JST 00:00〜08:59 に走らせると前日付になる。
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.claude/state/metrics/monthly-snapshot.json');
const JSON_OUT = process.argv.includes('--json');
const FORCE = process.argv.includes('--force');

const argOf = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
};

/** JST の「前月」を YYYY-MM で返す。todayJst() は日付までなので月境界の計算はここで持つ。 */
function prevMonthJst() {
  const now = new Date(Date.now() + 9 * 3600_000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11。前月は m-1 だが 0 のとき前年 12 月
  const d = new Date(Date.UTC(y, m - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** dir 内で prefix に一致する最新ファイル（名前順＝タイムスタンプ順）。 */
function latest(dir, prefix) {
  const d = join(ROOT, dir);
  if (!existsSync(d)) return null;
  const hits = readdirSync(d).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort();
  return hits.length ? join(d, hits[hits.length - 1]) : null;
}

function main() {
  const month = argOf('month') ?? prevMonthJst();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    console.error(`✗ --month は YYYY-MM 形式（受け取った値: ${month}）`);
    process.exit(1);
  }

  // ── 売上（唯一の完全なローカル台帳。月の全期間が入る） ──
  let salesYen = null;
  let salesCount = null;
  try {
    const sales = readJson(join(ROOT, '.claude/state/sales/sales-log.json')).sales ?? [];
    const inMonth = sales.filter((s) => String(s.date ?? '').startsWith(month));
    salesYen = inMonth.reduce((a, s) => a + (Number(s.price) || 0), 0);
    salesCount = inMonth.length;
  } catch (e) {
    console.error(`✗ 検査不成立: sales-log.json を読めない（${e.message}）`);
    process.exit(1);
  }

  // ── GA4 / GSC はスナップショットが「直近 7〜28 日」の窓なので月合計にはならない。
  //    値そのものより **どの窓を見た数字か** が後から効くので、期間もそのまま記録する。 ──
  // **ga4-sourceMedium-sns- は SNS 限定**（note/referral と x/social しか入っていない）ので
  // organic を数えると必ず 0 になる。チャネル別スナップショット（sessionDefaultChannelGroup）を使う。
  const ga4File = latest('.claude/state/metrics/ga4', 'ga4-channel-organic-');
  let organic = null;
  let ga4Window = null;
  if (ga4File) {
    const g = readJson(ga4File);
    ga4Window = `${g.meta?.startDate}〜${g.meta?.endDate}`;
    const organicRows = (g.rows ?? []).filter((r) => /organic/i.test(String(r.channel ?? '')));
    // 0 件なら「organic が 0」ではなく「想定した行が無い」＝ null で記録し、後から誤読させない
    organic = organicRows.length
      ? organicRows.reduce((a, r) => a + (Number(r.activeUsers) || 0), 0)
      : null;
  }

  const gscFile = latest('.claude/state/metrics/gsc', 'gsc-query-');
  let gscClicks = null;
  let gscImpr = null;
  let gscWindow = null;
  if (gscFile) {
    const g = readJson(gscFile);
    gscWindow = `${g.meta?.startDate}〜${g.meta?.endDate}`;
    gscClicks = (g.rows ?? []).reduce((a, r) => a + (Number(r.clicks) || 0), 0);
    gscImpr = (g.rows ?? []).reduce((a, r) => a + (Number(r.impressions) || 0), 0);
  }

  // ── その月の試験イベント（季節性の説明変数。売上曲線と重ねて読む） ──
  const examEvents = [];
  try {
    const cal = readJson(join(ROOT, '.claude/config/exam-calendar.json'));
    for (const [key, ex] of Object.entries(cal.exams ?? {})) {
      for (const ev of Object.values(ex.events ?? {})) {
        if (String(ev.date ?? '').startsWith(month)) {
          examEvents.push({ exam: key, label: `${ex.label} ${ev.label}`, date: ev.date });
        }
      }
    }
    examEvents.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    // カレンダーが読めなくても行は積む（試験イベントは説明変数であって必須ではない）
  }

  const row = {
    month,
    salesYen,
    salesCount,
    organicUsers: organic,
    gscClicks,
    gscImpressions: gscImpr,
    examEvents,
    // **窓を必ず残す**。GA4/GSC は月合計ではないので、これが無いと来年比較できない
    sources: { ga4Window, gscWindow, recordedAt: todayJst() },
  };

  const doc = existsSync(OUT)
    ? readJson(OUT)
    : {
        _doc: 'このファイルの目的は「来年の自分が前年同期比を実行できる状態にしておく」こと。'
          + '2026-08-17 の NSM 調査は前年データが 1 件も無く前年同期比が実行不可能で 4 週持ち越した。'
          + 'GA4/GSC は月合計ではなくスナップショットの窓なので sources に期間を必ず残す。'
          + '2027 年に初めて前年同期比が成立する。',
        months: [],
      };
  const idx = doc.months.findIndex((m) => m.month === month);
  if (idx >= 0 && !FORCE) {
    console.log(`[record-monthly-snapshot] ${month} は既に記録済み（置換するなら --force）`);
    if (JSON_OUT) writeSync(1, JSON.stringify(doc.months[idx], null, 2) + '\n');
    process.exit(0);
  }
  if (idx >= 0) doc.months[idx] = row;
  else doc.months.push(row);
  doc.months.sort((a, b) => a.month.localeCompare(b.month));
  doc.updatedAt = todayJst();

  writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');

  if (JSON_OUT) {
    writeSync(1, JSON.stringify(row, null, 2) + '\n');
    process.exit(0);
  }
  console.log(`[record-monthly-snapshot] ${month} を記録（累計 ${doc.months.length} か月）`);
  console.log(`  売上 ¥${(salesYen ?? 0).toLocaleString()}（${salesCount} 件）`);
  console.log(`  Organic users ${organic ?? '—'}（GA4 窓 ${ga4Window ?? '未取得'}）`);
  console.log(`  GSC ${gscClicks ?? '—'} clicks / ${gscImpr ?? '—'} impr（窓 ${gscWindow ?? '未取得'}）`);
  console.log(`  試験イベント ${examEvents.length} 件${examEvents.map((e) => `\n    - ${e.date} ${e.label}`).join('')}`);
  if (doc.months.length < 12) {
    console.log(`\n  前年同期比が成立するのは 12 か月分たまってから（現在 ${doc.months.length}/12）。`);
    console.log('  それまでの季節性判定は「試験日 × 売上曲線」で行う。');
  }
}

main();
