/**
 * metric-reports.mjs — GA4・GSC の週次取得（レポート）を読み書きする唯一の実装（DN-0498 段階 3）。
 *
 * 置き場: 取得した日（JST）ごとに 1 ファイル。1 回の取得（fetch-metrics.yml）が書く 17＋4 種のレポートを
 *   data/ga4/reports/<日付>.json・data/gsc/reports/<日付>.json の reports.<種類> に入れる。
 *   同じ日に同じ種類を取り直したら上書きする（以前は別名のファイルが増えていた）。
 *   GA4 の CTA ラベル別だけは「暦月の窓」の取得（meta.windowKind === 'month'）を別の枠 cta-clicks-by-label:month に置く。
 *
 * 読み手は種類の id（台帳の旧い id と同じ ga4.page・gsc.query など）で引く。参照は「ファイル#種類」。
 * 移す前の名前（data/metrics/ga4/ga4-page-<時刻>.json）で書かれた参照も readReportRef で読める
 * （business 台帳・seo-watchwords が名前で指している）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { datasetFiles, datasetPath } from './datasets.mjs';

/** 種類 id → 取得元とファイル内の枠の名前（枠の名前は移す前のファイル名の前半） */
export const REPORT_KINDS = Object.fromEntries([
  ['ga4.page', 'page'], ['ga4.date', 'date'], ['ga4.channel', 'channel'], ['ga4.channel-organic', 'channel-organic'],
  ['ga4.source', 'source'], ['ga4.source-medium-sns', 'sourceMedium-sns'], ['ga4.campaign', 'campaign'], ['ga4.device', 'device'],
  ['ga4.host-name', 'hostName'], ['ga4.cta-clicks', 'cta-clicks'], ['ga4.cta-clicks-by-device', 'cta-clicks-by-device'],
  ['ga4.cta-clicks-by-label', 'cta-clicks-by-label'], ['ga4.cta-clicks-by-placement', 'cta-clicks-by-placement'],
  ['ga4.key-events-by-page', 'key-events-by-page'], ['ga4.quiz-funnel', 'quiz-funnel'], ['ga4.bot-audit', 'bot-audit'],
  ['gsc.page', 'page'], ['gsc.query', 'query'], ['gsc.page-query', 'page-query'], ['gsc.date', 'date'],
].map(([id, section]) => [id, { id, source: id.split('.')[0], section }]));

/** 取得元と枠の名前（ga4 と page・sourceMedium-sns など）→ 種類 id。台帳に無い枠は書かせない（読み手が引けなくなる） */
export function reportIdOf(source, section) {
  const hit = Object.values(REPORT_KINDS).find((k) => k.source === source && k.section === section);
  if (!hit) throw new Error(`レポートの種類が台帳に無い: ${source} の ${section}（scripts/lib/metric-reports.mjs の REPORT_KINDS に足す）`);
  return hit.id;
}

const MONTH_SUFFIX = ':month';
const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/;

function kindOf(id) {
  const k = REPORT_KINDS[id];
  if (!k) throw new Error(`レポートの種類ではない: ${id}（${Object.keys(REPORT_KINDS).join(', ')}）`);
  return k;
}

/** いまの UTC 時刻を名前用の書式（2026-09-25T21-00-03）で返す */
export const nowStamp = (now = new Date()) => now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

/** 名前用の時刻（UTC）→ JST の日付 */
export function jstDayOf(stamp) {
  const m = STAMP_RE.exec(stamp);
  if (!m) throw new Error(`時刻の書式が違う: ${stamp}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) + 9 * 3600_000).toISOString().slice(0, 10);
}

function readDay(root, abs) {
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, 'utf8'));
}

/**
 * レポートを 1 つ書く（その日のファイルの枠を上書きする）。data は従来どおり { meta, rows, ... }。
 * @returns {{ file: string, ref: string }} file はリポジトリ相対、ref は「file#枠」
 */
export function writeReport(root, id, data, { stamp = nowStamp() } = {}) {
  const k = kindOf(id);
  const date = jstDayOf(stamp);
  const file = datasetPath(`${k.source}.reports`, { date });
  const abs = join(root, file);
  const day = readDay(root, abs) ?? { schemaVersion: 1, source: k.source, date, reports: {} };
  const section = k.section + (data?.meta?.windowKind === 'month' && id === 'ga4.cta-clicks-by-label' ? MONTH_SUFFIX : '');
  day.reports[section] = { stamp: stamp.replace(/Z$/, ''), ...data };
  day.reports = Object.fromEntries(Object.entries(day.reports).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(day, null, 2)}\n`);
  return { file, ref: `${file}#${section}` };
}

/** その種類のレポートを新しい順に返す。{ id, file, ref, stamp, data }（data は書いたときの { meta, rows, ... }） */
export function listReports(root, id) {
  const k = kindOf(id);
  const out = [];
  for (const file of datasetFiles(root, `${k.source}.reports`)) {
    let day;
    try {
      day = readDay(root, join(root, file));
    } catch {
      continue; // 壊れた日のファイルは候補から外すだけ（ここで落とすと読み手全体が止まる）
    }
    for (const [section, report] of Object.entries(day?.reports ?? {})) {
      if (section !== k.section && section !== k.section + MONTH_SUFFIX) continue;
      const { stamp, ...data } = report;
      out.push({ id, file, ref: `${file}#${section}`, stamp, data });
    }
  }
  return out.sort((a, b) => b.stamp.localeCompare(a.stamp) || b.ref.localeCompare(a.ref));
}

/** その種類の最新のレポート（無ければ null） */
export const latestReport = (root, id) => listReports(root, id)[0] ?? null;

const LEGACY_RE = /^data\/metrics\/(ga4|gsc)\/((?:ga4|gsc)-[A-Za-z-]+|bot-audit)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})Z?\.json$/; // path-literal-ok: 移す前の名前を読み替える

/** 移す前の名前 → 「ファイル#枠」（違う形なら null）。同じ日に取り直していた旧いファイルは、その日の最新を指す */
export function legacyReportRef(path) {
  const m = LEGACY_RE.exec(path);
  if (!m) return null;
  const section = m[2].replace(/^(ga4|gsc)-/, '');
  return `${datasetPath(`${m[1]}.reports`, { date: jstDayOf(m[3]) })}#${section}`;
}

/** 「ファイル#枠」か移す前の名前を読み、{ meta, rows, ... } を返す（無ければ null） */
export function readReportRef(root, ref) {
  const r = legacyReportRef(ref) ?? ref;
  const [file, section] = r.split('#');
  const day = readDay(root, isAbsolute(file) ? file : join(root, file));
  if (!day) return null;
  const report = section ? day.reports?.[section] : null;
  if (!report) return null;
  const { stamp, ...data } = report;
  return data;
}

/** その種類の最新の参照「ファイル#枠」（無ければ null）。従来の「最新ファイルのパス」の置き換え */
export const latestReportRef = (root, id) => latestReport(root, id)?.ref ?? null;

/** 参照が「ファイル#枠」か */
export const isReportRef = (p) => /#[^/\\]+$/.test(String(p ?? ''));

/** JSON を読む。「ファイル#枠」と移す前の名前ならレポートを、そうでなければファイルをそのまま読む（読み手の readJson の置き換え） */
export function readJsonOrReport(root, path) {
  if (isReportRef(path) || legacyReportRef(String(path ?? '').replace(/\\/g, '/'))) return readReportRef(root, String(path).replace(/\\/g, '/'));
  return JSON.parse(readFileSync(isAbsolute(path) ? path : join(root, path), 'utf8'));
}
