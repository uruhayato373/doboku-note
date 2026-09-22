#!/usr/bin/env node
/**
 * fetch-afb-outcomes.mjs — afb（アフィリエイトB）公式 API から成果（コンバージョン）を取得する。
 *
 * 参照実装: stats47（同一 afb 口座・READ-ONLY で移植）.claude/scripts/measurement/afb-outcomes.mjs。
 * Cookie フォールバックなし・口座全体取得なし（partner_site_id を必須クエリにする）。
 * サイト帰属は行ごとに scripts/lib/asp-site-guard.mjs の assertSiteOrThrow で例外化する
 * （経緯: afb の Playwright 走査で SID 不一致を警告して続行し、stats47 のデータを doboku-note と
 * 誤認した事故が実際に起きた。CLAUDE.md §9「検査ゼロを PASS と呼ばない」と同じ思想で fail-closed にする）。
 *
 * occurrence（conversion_date_type=2・commit_time 基準）と recognition（=3・recognition_time 基準）の
 * 2 窓を必ず両方取得する。**この 2 窓は同じコンバージョンを別の日付軸で数え直したもので、足し合わせない**
 * （basis.occurrence.totals と basis.recognition.totals は別々に保持する）。表示用の records は
 * conversionId で重複排除した和集合（1 コンバージョン = 1 行）。
 *
 * 出力:
 *   --commit なし: 集計を stdout に表示するだけ（書き込みなし）
 *   --commit あり: .claude/state/metrics/affiliate/afb-outcomes-YYYY-MM-DD.json（JST 日付）
 *                  + afb-outcomes-latest.json
 *                  寿命は scripts/lib/prune-state-snapshots.mjs の family 'affiliate'（`-YYYY-MM-DD.json` は keep-all）
 *
 * exit: 0 成功（0 件含む・[] は正常なゼロ結果）／ 1 HTTP・schema・サイト帰属エラー／ 2 検査不成立（AFB_API_KEY 未設定）
 *
 * Usage:
 *   node .claude/scripts/fetch-afb-outcomes.mjs
 *   node .claude/scripts/fetch-afb-outcomes.mjs --commit
 *   npm run fetch-afb-outcomes -- --commit
 *   node .claude/scripts/fetch-afb-outcomes.mjs --commit --now 2026-09-22T00:00:00Z   # テスト・再現用
 *
 * spec: .claude/config/affiliate-asp.json asps.afb.api.specUrl（specUpdated 時点の仕様）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSiteOrThrow } from '../../scripts/lib/asp-site-guard.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_PATH = join(ROOT, '.claude/config/affiliate-asp.json');
const OUT_DIR = join(ROOT, '.claude/state/metrics/affiliate');
const TAG = '[fetch-afb-outcomes]';

const DAY = 86_400_000;
const BASIS = { occurrence: '2', recognition: '3' };
const STATUS_BY_FLAG = ['pending', 'approved', 'rejected'];

// ── 純関数（テスト対象） ──────────────────────────────────────────────

/** payload の形を浅く要約する（schema エラーメッセージ用。値そのものは出さない）。 */
function responseShape(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return { type: 'array', length: value.length, item: depth < 2 && value.length ? responseShape(value[0], depth + 1) : null };
  }
  if (typeof value === 'object' && depth < 2) {
    return Object.fromEntries(Object.entries(value).slice(0, 30).map(([k, v]) => [k, responseShape(v, depth + 1)]));
  }
  return typeof value;
}

function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('report_schema_changed: date');
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('report_schema_changed: date');
  return value;
}

function id(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('report_schema_changed: id');
  if (!['string', 'number'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))) throw new Error('report_schema_changed: id');
  return String(value);
}

function providerDate(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}[-/]\d{2}[-/]\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(value)) {
    throw new Error('report_schema_changed: timestamp');
  }
  return dateOnly(value.slice(0, 10).replaceAll('/', '-'));
}

/** now を JST の YYYY-MM-DD に落とす（afb のタイムスタンプは JST 運用前提・提供元は未明記）。 */
export function jstDateString(now = new Date()) {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 前日で終わる直近 28 日（JST）。afb API は最大 30 日窓・当日を含められない。 */
export function afbPeriod(now = new Date()) {
  const today = jstDateString(now);
  const end = new Date(Date.parse(today) - DAY).toISOString().slice(0, 10);
  const start = new Date(Date.parse(today) - 28 * DAY).toISOString().slice(0, 10);
  return { start, end };
}

/** basis ('occurrence' | 'recognition') 1 件分のリクエストを組む。 */
export function afbRequest(config, period, basis, now = new Date()) {
  if (config.targetSiteName !== 'doboku-note') throw new Error('account_mismatch');
  const code = BASIS[basis];
  if (!code) throw new Error('report_schema_changed: basis');
  const partnerId = id(config.asps.afb.api.partnerId);
  const siteId = id(config.asps.afb.sites['doboku-note']);
  const start = dateOnly(period.start);
  const end = dateOnly(period.end);
  const today = jstDateString(now);
  if (start > end || end >= today || Date.parse(today) - Date.parse(start) > 30 * DAY) {
    throw new Error('report_incomplete: period');
  }
  const url = new URL(`https://api.afi-b.com/partners/${partnerId}/conversion`);
  url.search = new URLSearchParams({
    start_date: start,
    end_date: end,
    conversion_date_type: code,
    partner_site_id: siteId,
  }).toString();
  return { url, partnerId, siteId, period: { start, end }, basis };
}

/**
 * API レスポンス（JSON 配列）を検証しつつ正規化する。`[]` は正常なゼロ件（report_incomplete にしない）。
 * 行ごとに assertSiteOrThrow でサイト帰属を検査するので、他サイト（stats47）混入は例外で止まる。
 */
export function parseAfbOutcomes(payload, request) {
  if (!Array.isArray(payload)) throw new Error(`report_schema_changed: envelope ${JSON.stringify(responseShape(payload))}`);
  const seen = new Set();
  const totals = Object.fromEntries(STATUS_BY_FLAG.map((k) => [k, { count: 0, reportedMargin: 0 }]));
  const records = payload.map((row) => {
    if (!row || typeof row !== 'object') throw new Error('report_schema_changed: row');
    assertSiteOrThrow({ actualSiteId: row.partner_site_id, expectedSiteId: request.siteId });
    const conversionId = id(row.commit_id);
    const promotionId = id(row.adv_id);
    if (seen.has(conversionId)) throw new Error('report_incomplete: duplicate_conversion');
    seen.add(conversionId);
    const flag = String(row.commit_flg);
    const status = /^[012]$/.test(flag) ? STATUS_BY_FLAG[Number(flag)] : null;
    if (!status) throw new Error('report_schema_changed: status');
    const margin = row.margin;
    if (!['string', 'number'].includes(typeof margin) || !/^\d+(?:\.\d{1,2})?$/.test(String(margin))) {
      throw new Error('report_schema_changed: margin');
    }
    const [whole, fraction = ''] = String(margin).split('.');
    const marginCents = Number(whole + fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(marginCents)) throw new Error('report_schema_changed: margin');
    const dates = {
      clickDate: providerDate(row.visit_time),
      occurrenceDate: providerDate(row.commit_time),
      recognitionDate: providerDate(row.recognition_time),
    };
    const referenceDate = request.basis === 'occurrence' ? dates.occurrenceDate : dates.recognitionDate;
    if (
      !referenceDate ||
      referenceDate < request.period.start ||
      referenceDate > request.period.end ||
      (request.basis === 'recognition' && status === 'pending')
    ) {
      throw new Error('report_incomplete: basis_or_period');
    }
    totals[status].count += 1;
    totals[status].reportedMargin += marginCents;
    // ref / keyword は個人・私有識別子で計測に不要なので保持しない
    return { conversionId, promotionId, siteId: request.siteId, status, reportedMargin: Number(margin), ...dates };
  });
  for (const total of Object.values(totals)) {
    if (!Number.isSafeInteger(total.reportedMargin)) throw new Error('report_schema_changed: total');
    total.reportedMargin /= 100;
  }
  return { basis: request.basis, period: request.period, records, totals, rowCount: records.length };
}

/**
 * occurrence・recognition の両基準を取得し、1 サイトの成果として正規化する。
 * basis.occurrence / basis.recognition の totals は別々のまま（足し合わせない）。
 * 表示用 records は conversionId で重複排除した和集合（同じコンバージョンが両基準に出ても 1 行）。
 */
export async function collectAfbOutcomes({ config, apiKey, now = new Date(), fetchImpl = fetch }) {
  if (typeof apiKey !== 'string' || !/^[A-Za-z0-9_-]{20,256}$/.test(apiKey)) throw new Error('api_key_missing');
  const period = afbPeriod(now);
  const parsed = {};
  for (const basis of Object.keys(BASIS)) {
    const request = afbRequest(config, period, basis, now);
    let response;
    try {
      response = await fetchImpl(request.url, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json', authorizationtoken: apiKey },
      });
    } catch {
      throw new Error('api_unavailable');
    }
    if ([401, 403].includes(response.status)) throw new Error('api_auth_required');
    if (response.status === 429) throw new Error('api_rate_limited');
    if (!response.ok) throw new Error('api_unavailable');
    if (!(response.headers.get('content-type') ?? '').includes('application/json')) {
      throw new Error('report_schema_changed: content_type');
    }
    const text = await response.text();
    if (Buffer.byteLength(text) > 20 * 1024 * 1024) throw new Error('report_incomplete: response_too_large');
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('report_schema_changed: json');
    }
    parsed[basis] = parseAfbOutcomes(payload, request);
  }

  const siteId = id(config.asps.afb.sites['doboku-note']);
  const byConversion = new Map();
  for (const basis of Object.keys(BASIS)) {
    for (const record of parsed[basis].records) {
      if (!byConversion.has(record.conversionId)) byConversion.set(record.conversionId, record);
    }
  }

  return {
    schemaVersion: 1,
    source: 'afb',
    siteId,
    observedAt: now.toISOString(),
    period,
    basis: {
      occurrence: { rows: parsed.occurrence.rowCount, totals: parsed.occurrence.totals },
      recognition: { rows: parsed.recognition.rowCount, totals: parsed.recognition.totals },
    },
    records: [...byConversion.values()],
  };
}

// ── CLI ──────────────────────────────────────────────────────────────

function relative(p) {
  return p.split('\\').join('/').slice(ROOT.split('\\').join('/').length + 1);
}

/** records（重複排除済み和集合）から表示用の状態別件数を数える。基準を跨いだ二重計上をしない。 */
function summarizeRecords(records) {
  const out = { pending: 0, approved: 0, rejected: 0 };
  for (const r of records) out[r.status] += 1;
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes('--commit');
  const nowIdx = args.indexOf('--now');
  const now = nowIdx >= 0 && args[nowIdx + 1] ? new Date(args[nowIdx + 1]) : new Date();
  if (Number.isNaN(now.getTime())) {
    console.error(`${TAG} ✗ 検査不成立: --now の日時が読めない`);
    process.exit(2);
  }

  const apiKey = process.env.AFB_API_KEY;
  if (!apiKey) {
    console.error(`${TAG} ✗ 検査不成立: AFB_API_KEY が未設定（.env.local またはワークフロー secrets）`);
    process.exit(2);
  }
  if (!existsSync(CONFIG_PATH)) {
    console.error(`${TAG} ✗ 検査不成立: ${relative(CONFIG_PATH)} が無い`);
    process.exit(2);
  }
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

  let result;
  try {
    result = await collectAfbOutcomes({ config, apiKey, now });
  } catch (error) {
    console.error(`${TAG} ✗ 取得失敗: ${error.message}`);
    process.exit(1);
  }

  const rowsExamined = result.basis.occurrence.rows + result.basis.recognition.rows;
  const counts = summarizeRecords(result.records);
  // 0 件は「取得失敗」ではなく「request ok・成果 0 件」。CLAUDE.md §9「検査ゼロを PASS と呼ばない」の逆＝
  // 「0 件を無検査と混同しない」side。rows examined を必ず出して区別する。
  console.log(
    `${TAG} rows examined ${rowsExamined} / site ${result.siteId} ok / pending ${counts.pending} approved ${counts.approved} rejected ${counts.rejected}`,
  );

  if (!commit) return;

  mkdirSync(OUT_DIR, { recursive: true });
  const dated = join(OUT_DIR, `afb-outcomes-${jstDateString(now)}.json`);
  const latest = join(OUT_DIR, 'afb-outcomes-latest.json');
  const body = `${JSON.stringify(result, null, 2)}\n`;
  writeFileSync(dated, body);
  writeFileSync(latest, body);
  console.log(`${TAG} 書き込み: ${relative(dated)} / ${relative(latest)}`);
}

const isMain = process.argv[1] && process.argv[1].split('\\').join('/').endsWith('fetch-afb-outcomes.mjs');

if (isMain) {
  main().catch((error) => {
    console.error(`${TAG} ✗ 予期しないエラー: ${error?.stack ?? error}`);
    process.exit(1);
  });
}
