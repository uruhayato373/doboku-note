/**
 * a8-report-csv.mjs — A8 レポート CSV の解析・正規化・SSOT upsert（純関数）
 * ---------------------------------------------------------------------------
 * ブラウザにも fs にも依存しない。ここだけを node:test で検証する
 * （scripts/__tests__/a8-report-csv.test.mjs）。
 *
 * 設計判断:
 *   - CSV パーサは google-console-csv.mjs の RFC4180 実装を再利用（コピーしない）
 *   - 列名は config の columnAliases で写像（A8 のヘッダー揺れをコードに埋めない）
 *   - A8 は承認確定で過去月の数値が遡及変化するため、SSOT は append でなく **upsert**
 *   - 未知プログラム名は握り潰さず rejects に出す（取りこぼしを黙って捨てない）
 */
import { parseCsv, stripBom } from "./google-console-csv.mjs";

/** Shift_JIS / UTF-8 のバイト列を文字列へ。config の csvEncoding を既定に、文字化けなら UTF-8 で再試行。 */
export function decodeCsvBuffer(buf, encoding = "shift_jis") {
  const tryDecode = (enc) => {
    try {
      return new TextDecoder(enc, { fatal: false }).decode(buf);
    } catch {
      return null;
    }
  };
  const primary = tryDecode(encoding);
  // U+FFFD が多いときは指定エンコーディングが誤り → もう一方で読み直す
  const badCount = (s) => (s ? (s.match(/�/g) || []).length : Infinity);
  const alt = tryDecode(encoding === "utf-8" ? "shift_jis" : "utf-8");
  if (badCount(alt) < badCount(primary)) {
    return { text: stripBom(alt ?? ""), encoding: encoding === "utf-8" ? "shift_jis" : "utf-8", switched: true };
  }
  return { text: stripBom(primary ?? ""), encoding, switched: false };
}

/** "1,234" / "¥1,234" / "1234円" / "" → 数値（空・非数値は null）。 */
export function parseNumber(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/[,\s¥￥円件回%]/g, "").trim();
  if (s === "" || s === "-" || s === "―") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "2026/07/15" / "2026-07-15" / "20260715" → "2026-07-15"。不正は null。 */
export function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/** "2026/07" / "2026-07" / "2026年7月" / "202607" → "2026-07"。不正は null。 */
export function parseMonth(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})[/-年](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}`;
  m = s.match(/^(\d{4})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  const d = parseDate(s);
  return d ? d.slice(0, 7) : null;
}

/**
 * ヘッダー配列 → { field: columnIndex }。columnAliases は完全一致優先・次に部分一致。
 * 同じ field に複数当たった場合は最初の 1 つ（左側の列）を採る。
 */
export function mapColumns(headers, columnAliases) {
  const norm = headers.map((h) => stripBom(String(h ?? "")).trim());
  const out = {};
  for (const [field, aliases] of Object.entries(columnAliases)) {
    let idx = norm.findIndex((h) => aliases.some((a) => h === a));
    if (idx < 0) idx = norm.findIndex((h) => h !== "" && aliases.some((a) => h.includes(a)));
    if (idx >= 0) out[field] = idx;
  }
  return out;
}

/**
 * A8 レポート CSV → 正規化行。
 * reportKey により期待するキー列が異なる:
 *   period-monthly  → month
 *   period-daily    → date
 *   program-detail  → month(or date) + programName
 * サイト列があり isolationMode=site-column のときは targetSite 以外を除外する。
 */
export function normalizeA8Csv(csvText, { reportKey, cfg, fetchedAt = null } = {}) {
  const a8 = cfg.a8;
  const { headers, rows } = parseCsv(csvText);
  const cols = mapColumns(headers, a8.columnAliases);
  const out = [];
  const rejects = [];

  const need =
    reportKey === "period-daily"
      ? ["date"]
      : reportKey === "program-detail"
        ? ["programName"]
        : ["month"];
  const missing = need.filter((f) => cols[f] === undefined);
  if (missing.length > 0) {
    return {
      rows: [],
      rejects: rows.map((r, i) => ({ line: i + 2, reason: `必須列が見つからない: ${missing.join(",")}`, raw: r })),
      headers,
      cols,
      fatal: `必須列が見つからない: ${missing.join(",")}`,
    };
  }

  const get = (r, f) => (cols[f] === undefined ? null : (r[cols[f]] ?? null));

  rows.forEach((r, i) => {
    const line = i + 2;
    const siteRaw = get(r, "site");
    // 口座横断レポートのときは自サイト行だけ残す（stats47 の数値を SSOT に入れない）
    if (a8.isolationMode === "site-column") {
      if (siteRaw == null || String(siteRaw).trim() === "") {
        rejects.push({ line, reason: "site 列が空（サイト帰属を確定できない）", raw: r });
        return;
      }
      if (!String(siteRaw).includes(a8.targetSite)) return; // 他サイト行は静かに除外（reject ではない）
    }

    const month = parseMonth(get(r, "month")) ?? parseMonth(get(r, "date"));
    const date = parseDate(get(r, "date"));
    const programRaw = get(r, "programName") ? String(get(r, "programName")).trim() : null;

    if (reportKey === "period-daily" && !date) {
      rejects.push({ line, reason: "日付をパースできない", raw: r });
      return;
    }
    if (reportKey !== "period-daily" && !month) {
      rejects.push({ line, reason: "年月をパースできない", raw: r });
      return;
    }
    if (reportKey === "program-detail" && !programRaw) {
      rejects.push({ line, reason: "プログラム名が空", raw: r });
      return;
    }

    out.push({
      ...(date ? { date } : {}),
      ...(month ? { month } : {}),
      ...(programRaw ? { programRaw, program: a8.programIdMap[programRaw] ?? null } : {}),
      ...(siteRaw ? { site: String(siteRaw).trim() } : {}),
      impressions: parseNumber(get(r, "impressions")),
      clicks: parseNumber(get(r, "clicks")),
      conversions: parseNumber(get(r, "conversions")),
      approved: parseNumber(get(r, "approved")),
      revenueYen: parseNumber(get(r, "revenueYen")),
      pendingRevenueYen: parseNumber(get(r, "pendingRevenueYen")),
      ...(fetchedAt ? { fetchedAt } : {}),
    });
  });

  return { rows: out, rejects, headers, cols, fatal: null };
}

/**
 * キー一致で置換、無ければ追加（A8 は確定処理で過去分が変わるので最新 fetch を正とする）。
 * ソートキー順で安定化して返す。元配列は変更しない。
 */
export function upsertBy(existing, incoming, keyFn) {
  const map = new Map((existing || []).map((r) => [keyFn(r), r]));
  for (const row of incoming) map.set(keyFn(row), row);
  return [...map.values()].sort((a, b) => (keyFn(a) < keyFn(b) ? -1 : keyFn(a) > keyFn(b) ? 1 : 0));
}

export const KEY = {
  monthly: (r) => r.month,
  daily: (r) => r.date,
  programMonthly: (r) => `${r.month}::${r.programRaw}`,
  results: (r) => `${r.month}::${r.program}`,
};

/**
 * programMonthly の正規化行 → 既存 a8-results.json の records スキーマ。
 * 写像できない（programIdMap に無い）行は変換せず unmapped として返す（黙って捨てない）。
 */
export function toResultsRecords(programMonthlyRows) {
  const records = [];
  const unmapped = [];
  for (const r of programMonthlyRows) {
    if (!r.program) {
      unmapped.push({ month: r.month, programRaw: r.programRaw, reason: "programIdMap に未登録" });
      continue;
    }
    records.push({
      month: r.month,
      program: r.program,
      clicks: r.clicks ?? 0,
      conversions: r.conversions ?? 0,
      approved: r.approved ?? 0,
      revenueYen: r.revenueYen ?? 0,
      note: `A8 レポート自動取込（${r.programRaw}）`,
    });
  }
  return { records, unmapped };
}
