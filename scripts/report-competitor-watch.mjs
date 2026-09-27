#!/usr/bin/env node
/**
 * report-competitor-watch.mjs — ココナラ競合の「変化」と「追跡外の伸びている売り手」を週次で読む形に出す（read-only）
 * ---------------------------------------------------------------------------
 * 四半期の取得（competitor-scan.yml → scout-coconala-competitors / coconala-research）が書いた state を読むだけ。
 * 取得はしない。読み手＝週次レビュー（/weekly-review の Step「競合の変化」）。
 *
 *   1. 変化: competitors-snapshot.json の drift（価格・出品数・撤収・新規追跡）と、累計販売の伸びが大きい売り手
 *   2. 追跡候補: market-research.json（検索結果）に出た、追跡リスト外で関連サービスの販売実績が多い売り手
 *   3. 推定が一部だけの売り手: 取得できたサービスの販売実績が累計販売の半分未満（管理画面の「（一部）」と同じ基準）
 *
 * 使い方:
 *   node scripts/report-competitor-watch.mjs          # 人が読む出力
 *   node scripts/report-competitor-watch.mjs --json   # 週次レビューが読む JSON
 *
 * 終了コード: 0 = 読めた（変化や候補の有無は問わない）/ 2 = 入力の state が無い・壊れている（検査不成立）
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');

/** 追跡候補にする関連サービスの販売実績の下限（件）。追加した 8 社の下限（6〜27 件）より上の、明らかに伸びている相手だけを出す。 */
const CANDIDATE_MIN_SALES = 20;
/** 累計販売の伸びを「変化」として出す下限（件）。 */
const SALES_JUMP_MIN = 20;
/** 自社の資格に関係するサービスのタイトル。 */
const RELEVANT = /土木施工|土木.*経験記述|経験記述|経験論文|技術士.*(試験|論文|口頭|添削|二次)|総監|総合技術監理|RCCM|コンクリート(主任|診断)|舗装施工|測量士|上下水道/;
/** 技術士でも自社が扱わない部門だけのサービスは除く。 */
const OTHER_FIELD = /機械|情報工学|化学|金属|電気電子|電気工事|農業|IPA|情報処理|構造設計|法人様/;

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
  } catch {
    return null;
  }
}

const snapshot = readJson('.claude/state/coconala/competitors-snapshot.json');
const research = readJson('.claude/state/coconala/market-research.json');
const config = readJson('.claude/config/coconala-competitors.json');
const account = readJson('.claude/config/coconala-account.json');
if (!snapshot?.competitors || !research?.queries || !config?.competitors) {
  console.error('[report-competitor-watch] 入力の state が読めない（competitors-snapshot / market-research / coconala-competitors）— 検査不成立');
  process.exit(2);
}

const labelOf = Object.fromEntries(snapshot.competitors.map((c) => [c.handle, c.label]));

// 1. 変化
const changes = (snapshot.drift ?? [])
  .filter((d) => d.type !== 'sales' || (typeof d.after === 'number' && typeof d.before === 'number' && d.after - d.before >= SALES_JUMP_MIN))
  .map((d) => ({ handle: d.handle, label: labelOf[d.handle] ?? d.handle, type: d.type, detail: d.detail }));

// 2. 追跡候補（関連サービスを売り手ごとに集計・重複 URL は 1 回）
const tracked = new Set(config.competitors.map((c) => c.label.replace(/\s/g, '')));
const self = (account?.sellerName ?? '').replace(/\s/g, '');
const seen = new Set();
const bySeller = new Map();
let scannedServices = 0;
for (const q of research.queries) {
  for (const s of q.services ?? []) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    scannedServices++;
    const text = `${s.title ?? ''}${s.catchphrase ?? ''}`;
    if (!RELEVANT.test(text) || (OTHER_FIELD.test(text) && !/建設|総監|総合技術監理|上下水道/.test(text))) continue;
    const key = String(s.seller ?? '');
    if (!key || tracked.has(key.replace(/\s/g, '')) || key.replace(/\s/g, '') === self) continue;
    const row = bySeller.get(key) ?? { seller: key, services: 0, sales: 0, minPrice: Infinity, maxPrice: 0, sample: s.title, url: s.url };
    row.services++;
    row.sales += Number.parseInt(s.detail?.totalSales ?? s.reviews ?? 0, 10) || 0;
    if (typeof s.priceYen === 'number') {
      row.minPrice = Math.min(row.minPrice, s.priceYen);
      row.maxPrice = Math.max(row.maxPrice, s.priceYen);
    }
    bySeller.set(key, row);
  }
}
const candidates = [...bySeller.values()]
  .filter((r) => r.sales >= CANDIDATE_MIN_SALES)
  .sort((a, b) => b.sales - a.sales)
  .map((r) => ({ ...r, minPrice: Number.isFinite(r.minPrice) ? r.minPrice : null }));

// 3. 推定が一部だけ
const partial = snapshot.competitors
  .map((c) => ({ handle: c.handle, label: c.label, total: c.platformExtra?.totalSales ?? 0, captured: (c.services ?? []).reduce((n, s) => n + (s.reviews ?? 0), 0) }))
  .filter((c) => c.total && c.captured > 0 && c.captured * 2 < c.total);

const summary = {
  fetchedAt: snapshot.fetchedAt,
  driftBasis: snapshot.driftBasis ?? null,
  researchFetchedAt: research.updatedAt ?? research.fetchedAt ?? null,
  trackedSellers: snapshot.competitors.length,
  scannedServices,
  changes: changes.length,
  candidates: candidates.length,
  partial: partial.length,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify({ summary, changes, candidates, partial }, null, 2)}\n`);
} else {
  console.log(`[report-competitor-watch] ココナラ 追跡 ${summary.trackedSellers} 社（取得 ${String(summary.fetchedAt).slice(0, 10)}・比較 ${summary.driftBasis ?? 'なし'}）/ 検索結果 ${scannedServices} サービスを走査`);
  console.log(`  変化 ${changes.length} 件`);
  for (const c of changes) console.log(`    - ${c.label}: ${c.detail}`);
  console.log(`  追跡外の候補 ${candidates.length} 社（関連サービスの販売実績 ${CANDIDATE_MIN_SALES} 件以上）`);
  for (const c of candidates) console.log(`    - ${c.seller}: 販売 ${c.sales}・${c.services} 出品・¥${c.minPrice ?? '—'}〜${c.maxPrice || '—'}（${c.sample}）`);
  console.log(`  売上推定が一部だけ ${partial.length} 社`);
  for (const p of partial) console.log(`    - ${p.label}: 取得 ${p.captured} / 累計 ${p.total}`);
  console.log('  → 追跡に加えるなら .claude/config/coconala-competitors.json に handle を足す。一覧は管理画面 戦略 ＞ 資格と市場 ＞ 競合');
}
