/**
 * google-console-ssot.mjs — GSC/GA4 UI CSV から得た情報の **追跡される SSOT**
 * ---------------------------------------------------------------------------
 * なぜ必要か（2026-07-30 新設）: これまで正規化結果は run ディレクトリ配下
 * （`.claude/state/metrics/gsc-ui/<runId>/normalized/`）にだけ書かれ、そこは gitignore だった。
 * raw CSV は再取得しかできない（＝再生成不可能）ため、worktree を捨てた時点で **URL レベルの情報が
 * 消え**、`report-search-growth` も「前回比」を出せず、別マシンでは診断そのものが再現できなかった。
 * 実際 2026-07-23 の run（1,952 行）は run ディレクトリごと消えて last-run.json だけが残っていた。
 *
 * そこで「CSV から得た情報」を .claude 内の SSOT として commit する:
 *
 *   .claude/state/metrics/<channel>/
 *     last-run.json                     # 取得マーカー（既存・完全性つき）
 *     ssot/
 *       urls/<issueKey>--<scope>.json    # 最新の正規化 URL 一覧（lean 射影・追跡）
 *       history.json                     # run 別のユニット件数履歴（append・追跡）
 *       diff/<runId>.json                # 直前 SSOT との差分（added/removed URL・追跡）
 *     <runId>/                           # raw CSV / ZIP / manifest（gitignore・再取得のみ）
 *
 * lean 射影の理由: 正規化 JSON の `rows[].raw` は CSV 全列の複製で、URL と lastCrawled から
 * 復元できる。追跡サイズを抑えるため raw を落とし、突合に必要な列だけを残す。
 * rejects は件数が小さく「取りこぼしの証拠」なので残す。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 既定は追跡される計測ステートのルート。テスト時のみ差し替える（本番パスを汚さずに配線を検証するため）。
const METRICS = process.env.GOOGLE_CONSOLE_SSOT_ROOT || ".claude/state/metrics";

export function ssotDir(channel) {
  return join(METRICS, channel, "ssot");
}
export function urlsDir(channel) {
  return join(ssotDir(channel), "urls");
}
export function diffDir(channel) {
  return join(ssotDir(channel), "diff");
}
export function historyPath(channel) {
  return join(ssotDir(channel), "history.json");
}

export function unitKey(issue, scope) {
  return `${issue}--${scope}`;
}

/** 正規化 JSON → 追跡用の lean 射影（raw 列を落とす）。 */
function leanRows(rows = []) {
  return rows.map((r) => {
    const out = { url: r.url, comparisonKey: r.comparisonKey };
    if (r.lastCrawled !== undefined) out.lastCrawled = r.lastCrawled ?? null;
    if (r.duplicateCount && r.duplicateCount > 1) out.duplicateCount = r.duplicateCount;
    return out;
  });
}

export function readUnitSsot(channel, key) {
  const p = join(urlsDir(channel), `${key}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export function listUnitSsot(channel) {
  const dir = urlsDir(channel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ key: f.replace(/\.json$/, ""), path: join(dir, f) }));
}

/**
 * 1 ユニットの SSOT を更新し、直前 SSOT との差分を返す。
 * 差分は comparisonKey ベース（クエリ順・末尾スラッシュ差で誤検知しないため）。
 */
export function writeUnitSsot(channel, { issue, scope, norm, collectedAt }) {
  const key = unitKey(issue, scope);
  const prev = readUnitSsot(channel, key);
  const rows = leanRows(norm.rows);

  const prevKeys = new Set((prev?.rows ?? []).map((r) => r.comparisonKey));
  const nextKeys = new Set(rows.map((r) => r.comparisonKey));
  const added = rows.filter((r) => !prevKeys.has(r.comparisonKey)).map((r) => r.url);
  const removed = (prev?.rows ?? []).filter((r) => !nextKeys.has(r.comparisonKey)).map((r) => r.url);

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

  mkdirSync(urlsDir(channel), { recursive: true });
  writeFileSync(join(urlsDir(channel), `${key}.json`), JSON.stringify(doc, null, 2), "utf-8");
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
  const p = join(METRICS, channel, "last-run.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}
