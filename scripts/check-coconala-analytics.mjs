#!/usr/bin/env node
/**
 * check-coconala-analytics.mjs — 分析スナップショットと kpi.json の整合をオフラインで検査する
 * ---------------------------------------------------------------------------
 * coconala-analytics.mjs（取得）に対する検査側。外部アクセスはしない。
 *
 * 「検査ゼロを PASS と呼ばない」（CLAUDE.md 原則9）:
 *   - snapshot が無い / 古い / status:'partial' は **FAIL**（「異常なし」と言わない）
 *   - 対象サービス 0 件は FAIL（検査不成立）
 *   - 取得できなかったサービスは 0 ではなく欠測として数え、必ず件数を出力する
 *
 * 検査:
 *   1. snapshot 実在・status=ok・鮮度（既定 8 日以内＝週次運用の猶予）
 *   2. カタログの listed サービスが snapshot に**全件**載っている（取りこぼし検出）
 *   3. snapshot の serviceId がカタログに実在（typo・退役）
 *   4. マスク指標（セラーサクセス表示数）が 0 でなく null で記録されている
 *   5. kpi.json に snapshot と同じ weekOf の行がある（--append-kpi 忘れの検出）
 *   6. kpi.json の weekly 行が cumulative フラグと period を持つ（週次増分との取り違え防止）
 *
 * 使い方: node scripts/check-coconala-analytics.mjs [--max-age-days N]
 * exit: 0=OK（WARN のみ含む） / 1=FAIL
 * ---------------------------------------------------------------------------
 *
 * npm run check-coconala-analytics — 上記の鮮度・欠測・マスク値（0000は0でない）・kpi.json 整合をオフライン検査
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { todayJst } from './lib/jst-date.mjs';
import { datasetPath, freshnessDays } from './lib/datasets.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { parseCatalog } from './lib/coconala-catalog.mjs';

const TAG = '[check-coconala-analytics]';
const SNAP_PATH = join(ROOT, datasetPath('coconala.analytics'));
const KPI_PATH = join(ROOT, datasetPath('coconala.kpi'));
const CATALOG_PATH = join(ROOT, 'src/lib/coconala-services.ts');

const argMaxAge = process.argv.indexOf('--max-age-days');
// 既定の上限は台帳 coconala.analytics の freshness.failDays（--max-age-days で一時的に変えられる）
const MAX_AGE_DAYS = argMaxAge >= 0 ? Number(process.argv[argMaxAge + 1]) : freshnessDays('coconala.analytics', 'failDays');

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

/** カタログから id/status/serviceUrl を抜く。読み方は共通の parseCatalog（フィールドの並び順に依存しない）。
 *  2026-11-14: 独自の正規表現が status の直後に serviceUrl を要求し、末尾に serviceUrl を置いた技術士の添削 4 件を
 *  「カタログに無い」と誤判定して土曜の収集の検算を落としていた。 */
function readCatalogIds() {
  return Object.values(parseCatalog(readFileSync(CATALOG_PATH, 'utf8')));
}

function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function main() {
  if (!existsSync(SNAP_PATH)) {
    console.error(`${TAG} FAIL: snapshot が無い（${SNAP_PATH}）`);
    console.error(`${TAG}   これは「異常なし」ではなく検査不成立。npm run coconala-analytics を実行すること。`);
    process.exit(1);
  }
  const snap = JSON.parse(readFileSync(SNAP_PATH, 'utf8'));
  const catalog = readCatalogIds();
  const catalogById = new Map(catalog.map((c) => [c.id, c]));

  // 分析ページを持ちうる＝ serviceUrl から数値 ID が引けるもの
  const expected = catalog.filter((c) => /\/services\/\d+/.test(c.serviceUrl || ''));
  const listed = expected.filter((c) => c.status === 'listed');

  const services = snap.services || [];
  const gotOk = services.filter((s) => s.ok);
  const missingMetrics = services.filter((s) => !s.ok);

  console.log(`${TAG} snapshot ${snap.fetchedOnJst || '(日付なし)'} / status=${snap.status}`);
  console.log(`${TAG} 対象 ${expected.length} 件（うち listed ${listed.length}）→ 取得成功 ${gotOk.length} 件 / 欠測 ${missingMetrics.length} 件・ブログ ${(snap.blogs || []).length} 件`);

  // 1. 検査不成立の判定
  if (expected.length === 0) fail('カタログに serviceUrl 付きサービスが 0 件（検査不成立）');
  if (listed.length === 0) fail('listed のサービスが 0 件（検査不成立）');
  if (snap.status !== 'ok') fail(`snapshot.status=${snap.status}（取得できなかった対象がある。件数を全件として扱わない）`);
  // 欠測は必ず名指しする。特に「listed なのに分析ページが無い」は、出品がライブに実在しない
  // （アーカイブ済み・削除済み）疑いで、カタログ status のドリフトを意味する。
  for (const s of missingMetrics) {
    const cat = catalogById.get(s.serviceId);
    if (cat && cat.status === 'listed') {
      fail(`listed なのに分析ページが取得できない: ${s.serviceId}（${s.reason || '理由不明'}）— 出品がライブに実在しない疑い。${cat.serviceUrl} を実査してカタログ status を是正すること`);
    } else {
      warn(`欠測（公開中でないため想定内）: ${s.serviceId}（catalog=${cat?.status || '不明'}）`);
    }
  }
  const age = snap.fetchedOnJst ? daysBetween(snap.fetchedOnJst, todayJst()) : null;
  if (age === null) fail('snapshot に fetchedOnJst が無い（鮮度を判定できない）');
  else if (age > MAX_AGE_DAYS) fail(`snapshot が古い（${age} 日前・上限 ${MAX_AGE_DAYS} 日）— 数値は現状を表していない`);

  // 2. listed の取りこぼし
  const snapIds = new Set(services.map((s) => s.serviceId));
  for (const c of listed) {
    if (!snapIds.has(c.id)) fail(`listed なのに snapshot に無い: ${c.id}（取りこぼし）`);
  }

  // 3. 未知 serviceId
  for (const s of services) {
    if (!catalogById.has(s.serviceId)) fail(`snapshot の serviceId がカタログに無い: ${s.serviceId}`);
  }

  // 4. マスク指標が 0 で記録されていない
  const maskedAsZero = [];
  for (const s of services) {
    if ((s.masked || []).length && s.impressions === 0) maskedAsZero.push(s.serviceId);
  }
  if (snap.totals && (snap.totals.masked || []).length && snap.totals.impressions === 0) maskedAsZero.push('(totals)');
  if (maskedAsZero.length) fail(`マスク指標が 0 として記録されている（null であるべき）: ${maskedAsZero.join(', ')}`);
  const maskedCount = services.filter((s) => (s.masked || []).length).length;
  if (maskedCount) console.log(`${TAG} 注記: 表示数がマスク（セラーサクセス未加入）のサービス ${maskedCount} 件 → null 記録`);

  // 5-6. kpi.json 側
  if (!existsSync(KPI_PATH)) {
    fail(`${datasetPath('coconala.kpi')} が無い`);
  } else {
    const kpi = JSON.parse(readFileSync(KPI_PATH, 'utf8'));
    const weekly = kpi.weekly || [];
    if (gotOk.length && weekly.length === 0) {
      warn('snapshot は取れているが kpi.json.weekly が空（--append-kpi を実行していない）');
    }
    const autoRows = weekly.filter((r) => r.source === 'analytics-auto');
    for (const r of autoRows) {
      if (r.cumulative !== true) fail(`kpi.json.weekly に cumulative フラグが無い行（週次増分と誤読される）: ${r.weekOf} ${r.serviceId}`);
      if (!r.period || !r.period.from || !r.period.to) fail(`kpi.json.weekly に period が無い行: ${r.weekOf} ${r.serviceId}`);
      if (!catalogById.has(r.serviceId)) fail(`kpi.json.weekly の serviceId がカタログに無い: ${r.serviceId}`);
    }
    const latestWeek = autoRows.map((r) => r.weekOf).sort().pop() || null;
    console.log(`${TAG} kpi.json: weekly ${weekly.length} 行（自動 ${autoRows.length}・最新 weekOf=${latestWeek || 'なし'}）/ blogsWeekly ${(kpi.blogsWeekly || []).length} 行`);
  }

  for (const w of warns) console.log(`${TAG} WARN ${w}`);
  if (fails.length) {
    for (const f of fails) console.error(`${TAG} FAIL ${f}`);
    process.exit(1);
  }
  console.log(`${TAG} OK`);
}

main();
