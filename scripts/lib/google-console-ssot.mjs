/**
 * google-console-ssot.mjs — GSC/GA4 UI CSV から得た情報の **追跡される SSOT**
 * ---------------------------------------------------------------------------
 * なぜ必要か（2026-07-30 新設）: これまで正規化結果は run ディレクトリ配下
 * （当時の `data/metrics/gsc-ui/<runId>/normalized/`）にだけ書かれ、そこは gitignore だった。
 * raw CSV は再取得しかできない（＝再生成不可能）ため、worktree を捨てた時点で **URL レベルの情報が
 * 消え**、`report-search-growth` も「前回比」を出せず、別マシンでは診断そのものが再現できなかった。
 * 実際 2026-07-23 の run（1,952 行）は run ディレクトリごと消えて last-run.json だけが残っていた。
 *
 * そこで「CSV から得た情報」を追跡される SSOT として commit する（<取得元> は gsc-ui → gsc、ga4-ui → ga4）:
 *
 *   data/<取得元>/
 *     ui-last-run.json                  # 取得マーカー（完全性つき）
 *     ui-urls.json                      # 最新の正規化 URL 一覧（units[<issueKey>--<scope>]・lean 射影）
 *     ui-history.json                   # run 別のユニット件数履歴（append）
 *     ui-diff/<runId>.json              # 直前 SSOT との差分（added/removed URL）
 *     ui/<runId>/                       # raw CSV / ZIP / manifest（gitignore・再取得のみ）
 *
 * lean 射影の理由: 正規化 JSON の `rows[].raw` は CSV 全列の複製で、URL と lastCrawled から
 * 復元できる。追跡サイズを抑えるため raw を落とし、突合に必要な列だけを残す。
 * comparisonKey も url から導けて読み手がいない（差分は toComparisonKey(url) で数える）ので持たない（2026-10）。
 * rejects は件数が小さく「取りこぼしの証拠」なので残す。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { toComparisonKey } from "./url-normalization.mjs";

// 既定は追跡される記録のルート（data）。テスト時のみ差し替える（本番パスを汚さずに配線を検証するため）。
const ROOT_DIR = process.env.GOOGLE_CONSOLE_SSOT_ROOT || "data";

/** チャネル（gsc-ui・ga4-ui）→ 取得元のフォルダ（data/gsc・data/ga4） */
export function ssotDir(channel) {
  return join(ROOT_DIR, channel.replace(/-ui$/, ""));
}
export function urlsPath(channel) {
  return join(ssotDir(channel), "ui-urls.json");
}
export function diffDir(channel) {
  return join(ssotDir(channel), "ui-diff");
}
export function historyPath(channel) {
  return join(ssotDir(channel), "ui-history.json");
}
export function markerPath(channel) {
  return join(ssotDir(channel), "ui-last-run.json");
}
/** 手元だけの生データ（run ごとの CSV・manifest・正規化結果） */
export function rawDir(channel) {
  return join(ssotDir(channel), "ui");
}
/** SSOT が 1 つでもあるか（マーカーと別に「正規化したことがあるか」を判定する） */
export function hasSsot(channel) {
  return existsSync(urlsPath(channel)) || existsSync(historyPath(channel));
}

function readUnits(channel) {
  const p = urlsPath(channel);
  if (!existsSync(p)) return { schemaVersion: 1, channel, units: {} };
  try {
    const doc = JSON.parse(readFileSync(p, "utf-8"));
    return doc && typeof doc.units === "object" ? doc : { schemaVersion: 1, channel, units: {} };
  } catch {
    return { schemaVersion: 1, channel, units: {}, __broken: true };
  }
}

export function unitKey(issue, scope) {
  return `${issue}--${scope}`;
}

/** 正規化 JSON → 追跡用の lean 射影（raw 列を落とす）。 */
function leanRows(rows = []) {
  return rows.map((r) => {
    const out = { url: r.url };
    if (r.lastCrawled !== undefined) out.lastCrawled = r.lastCrawled ?? null;
    if (r.duplicateCount && r.duplicateCount > 1) out.duplicateCount = r.duplicateCount;
    return out;
  });
}

export function readUnitSsot(channel, key) {
  return readUnits(channel).units[key] ?? null;
}

export function listUnitSsot(channel) {
  const p = urlsPath(channel);
  return Object.keys(readUnits(channel).units).sort().map((key) => ({ key, path: p }));
}

/**
 * 1 ユニットの SSOT を更新し、直前 SSOT との差分を返す。
 * 差分は comparisonKey ベース（クエリ順・末尾スラッシュ差で誤検知しないため）。
 */
export function writeUnitSsot(channel, { issue, scope, norm, collectedAt }) {
  const key = unitKey(issue, scope);
  const prev = readUnitSsot(channel, key);
  const rows = leanRows(norm.rows);

  // 保存した行は comparisonKey を持たない（旧い行は持つ）。url から導く値と同じなので、どちらも同じ鍵になる
  const keyOf = (r) => r.comparisonKey ?? toComparisonKey(r.url);
  const prevKeys = new Set((prev?.rows ?? []).map(keyOf));
  const nextKeys = new Set(rows.map(keyOf));
  const added = rows.filter((r) => !prevKeys.has(keyOf(r))).map((r) => r.url);
  const removed = (prev?.rows ?? []).filter((r) => !nextKeys.has(keyOf(r))).map((r) => r.url);

  const doc = {
    schemaVersion: 1,
    channel,
    source: norm.source ?? "gsc-ui-page-indexing",
    property: norm.property ?? null,
    issue,
    scope,
    runId: norm.runId ?? null,
    collectedAt: collectedAt ?? null,
    uiTotal: norm.uiTotal ?? null,
    exportedRows: norm.exportedRows ?? rows.length,
    truncated: !!norm.truncated,
    rejectCount: (norm.rejects ?? []).length,
    rejects: norm.rejects ?? [],
    // 直前 run からの増減（履歴を全部持たずに変化だけ追える）
    previous: prev ? { runId: prev.runId, collectedAt: prev.collectedAt, exportedRows: prev.exportedRows } : null,
    delta: prev ? { added: added.length, removed: removed.length } : null,
    rows,
  };

  const all = readUnits(channel);
  delete all.__broken;
  all.units = Object.fromEntries(Object.entries({ ...all.units, [key]: doc }).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(ssotDir(channel), { recursive: true });
  writeFileSync(urlsPath(channel), JSON.stringify(all, null, 2), "utf-8");
  return { key, rows: rows.length, added, removed, previousRows: prev?.exportedRows ?? null };
}

/** run 単位の差分を 1 ファイルに束ねて書く（URL の増減の変更ログ）。 */
export function writeRunDiff(channel, { runId, collectedAt, units }) {
  mkdirSync(diffDir(channel), { recursive: true });
  const doc = {
    schemaVersion: 1,
    channel,
    runId,
    collectedAt,
    units: units.map((u) => ({
      unit: u.key,
      rows: u.rows,
      previousRows: u.previousRows,
      added: u.added,
      removed: u.removed,
    })),
  };
  writeFileSync(join(diffDir(channel), `${runId}.json`), JSON.stringify(doc, null, 2), "utf-8");
  return join(diffDir(channel), `${runId}.json`);
}

/**
 * run の件数履歴を append する（追跡・小サイズ）。
 * 同一 runId は上書き（再正規化の冪等性）。
 */
export function appendHistory(channel, entry) {
  mkdirSync(ssotDir(channel), { recursive: true });
  const p = historyPath(channel);
  let hist = { schemaVersion: 1, channel, runs: [] };
  if (existsSync(p)) {
    try {
      const parsed = JSON.parse(readFileSync(p, "utf-8"));
      if (Array.isArray(parsed?.runs)) hist = parsed;
    } catch {
      /* 壊れていたら作り直す（gate が不整合として拾う） */
    }
  }
  hist.runs = hist.runs.filter((r) => r.runId !== entry.runId);
  hist.runs.push(entry);
  hist.runs.sort((a, b) => String(a.runId).localeCompare(String(b.runId)));
  writeFileSync(p, JSON.stringify(hist, null, 2), "utf-8");
  return p;
}

export function readHistory(channel) {
  const p = historyPath(channel);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export function readMarker(channel) {
  const p = markerPath(channel);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}
