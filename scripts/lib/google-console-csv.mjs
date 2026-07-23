/**
 * google-console-csv.mjs — GSC/GA4 の UI CSV をロケール非依存の共通 JSON へ正規化（純関数・テスト対象）
 * ---------------------------------------------------------------------------
 * Google の CSV は locale / BOM / 改行コード / 列名が変化し得る。`split(",")` は使わず、
 * RFC 4180 準拠パーサで quoted comma / quoted newline / エスケープ二重引用符を処理する。
 *
 * 提供:
 *   parseCsv(text)                      → { headers, rows }（生の 2 次元）
 *   mapHeader(header)                   → 正規化フィールド名 | null
 *   normalizePageIndexingCsv(text,meta) → 共通 JSON（rows[] + rejects[] + duplicateCount）
 */
import { toComparisonKey, tryParseUrl } from "./url-normalization.mjs";

/** 日本語/英語ヘッダー → 正規化フィールド名。前後空白・BOM・大小無視で照合する。 */
const HEADER_ALIASES = {
  url: ["url", "ページ", "page", "アドレス", "address", "リンク"],
  lastCrawled: [
    "最終クロール日",
    "最終クロール",
    "前回のクロール",
    "前回のクロール日",
    "last crawled",
    "last crawl time",
    "クロール日",
  ],
};

/** BOM 除去。UTF-8 BOM (EF BB BF) が文字列先頭に来た場合の U+FEFF を落とす。 */
export function stripBom(text) {
  if (typeof text !== "string") return "";
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * RFC 4180 CSV パーサ。
 * - CRLF / LF 両対応（引用符外の \r\n / \n / \r をレコード区切りに）
 * - 引用フィールド内の comma / 改行 / "" (エスケープ) を保持
 * - 末尾の空行は無視、ただし引用内の空行は保持
 * 返り値: string[][]（全レコード）。
 */
export function parseCsvRecords(input) {
  const text = stripBom(String(input ?? ""));
  const records = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  let sawAny = false;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    // outside quotes
    if (c === '"') {
      inQuotes = true;
      sawAny = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      sawAny = true;
      endField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      // CRLF or lone CR
      if (text[i + 1] === "\n") i += 1;
      endRecord();
      sawAny = false;
      i += 1;
      continue;
    }
    if (c === "\n") {
      endRecord();
      sawAny = false;
      i += 1;
      continue;
    }
    field += c;
    sawAny = true;
    i += 1;
  }
  // 末尾フィールド/レコードを確定（最後に改行が無い場合）
  if (sawAny || field.length > 0 || record.length > 0) {
    endRecord();
  }

  // 完全な空レコード（[""] だけ）を落とす
  return records.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** 先頭行をヘッダーとして { headers, rows } を返す。 */
export function parseCsv(input) {
  const records = parseCsvRecords(input);
  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1);
  return { headers, rows };
}

/** ヘッダー文字列を正規化フィールド名へ写像。未知なら null。 */
export function mapHeader(header) {
  const key = stripBom(String(header ?? ""))
    .trim()
    .toLowerCase();
  if (!key) return null;
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === key)) return field;
  }
  return null;
}

/**
 * GSC Page indexing の詳細 CSV を共通 JSON の rows へ正規化。
 *
 * @param {string} csvText  raw CSV（BOM/CRLF 可）
 * @param {object} meta     { schemaVersion, source, runId, property, issue, scope, uiTotal, sampleUrlCap }
 * @returns {object} 正規化 JSON。rows[] は元の並び順を維持、rejects[] に parse 不能行。
 *
 * ルール:
 *  - URL は trim。parse 不能行は rejects.json へ（rows には入れない）。
 *  - 同一 comparisonKey の重複は残しつつ duplicateCount（総出現回数）を付ける。
 *  - raw（全列の値）を保持。lastCrawled は判別できた場合のみ。
 *  - uiTotal > exportedRows もしくは uiTotal > sampleUrlCap で truncated 判定。
 */
export function normalizePageIndexingCsv(csvText, meta = {}) {
  const sampleCap = meta.sampleUrlCap ?? 1000;
  const { headers, rows } = parseCsv(csvText);

  // ヘッダー index の解決
  const fieldIndex = {};
  headers.forEach((h, idx) => {
    const f = mapHeader(h);
    if (f && fieldIndex[f] === undefined) fieldIndex[f] = idx;
  });
  // URL 列が特定できない場合は先頭列を URL とみなす（GSC は URL が第 1 列）
  const urlIdx = fieldIndex.url !== undefined ? fieldIndex.url : 0;

  const outRows = [];
  const rejects = [];
  const keyCounts = new Map();

  for (let r = 0; r < rows.length; r++) {
    const cols = rows[r];
    // 完全な空行はスキップ（reject にもしない）
    if (cols.every((c) => String(c ?? "").trim() === "")) continue;

    const rawUrl = String(cols[urlIdx] ?? "").trim();
    const raw = {};
    headers.forEach((h, idx) => {
      raw[h || `col${idx}`] = cols[idx] ?? "";
    });

    const parsed = tryParseUrl(rawUrl);
    if (!rawUrl || !parsed) {
      rejects.push({ line: r + 2, rawUrl, raw, reason: !rawUrl ? "empty-url" : "unparseable-url" });
      continue;
    }
    const comparisonKey = toComparisonKey(rawUrl);
    keyCounts.set(comparisonKey, (keyCounts.get(comparisonKey) ?? 0) + 1);

    const row = {
      url: rawUrl,
      comparisonKey,
      raw,
    };
    if (fieldIndex.lastCrawled !== undefined) {
      const lc = String(cols[fieldIndex.lastCrawled] ?? "").trim();
      row.lastCrawled = lc || null;
    }
    outRows.push(row);
  }

  // duplicateCount を付与（同一 comparisonKey の総出現回数）
  for (const row of outRows) {
    row.duplicateCount = keyCounts.get(row.comparisonKey) ?? 1;
  }

  const exportedRows = outRows.length;
  const uiTotal = meta.uiTotal ?? null;
  const truncated =
    (uiTotal != null && exportedRows < uiTotal) ||
    (uiTotal != null && uiTotal > sampleCap) ||
    exportedRows >= sampleCap;

  return {
    schemaVersion: meta.schemaVersion ?? 1,
    source: meta.source ?? "gsc-ui-page-indexing",
    runId: meta.runId ?? null,
    property: meta.property ?? null,
    issue: meta.issue ?? null,
    scope: meta.scope ?? null,
    uiTotal,
    exportedRows,
    truncated,
    rows: outRows,
    rejects,
  };
}
