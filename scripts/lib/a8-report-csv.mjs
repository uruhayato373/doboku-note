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
  // 文字クラス内の `-` は必ず末尾に置く（[/-年] と書くと「/ から 年 まで」の範囲になり
  // ハイフン区切り "2026-07" を取りこぼす。2026-07-27 の実データで発覚）
  let m = s.match(/^(\d{4})[/年-](\d{1,2})/);
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
  // A8 のヘッダーは説明文が前置される（例「広告がクリックされた回数 ※… click数」）ため
  // 空白を潰してから部分一致を見る。完全一致を先に試すのは「発生金額」と「確定金額」の取り違え防止。
  const norm = headers.map((h) => stripBom(String(h ?? "")).replace(/\s+/g, " ").trim());
  const out = {};
  for (const [field, aliases] of Object.entries(columnAliases)) {
    // `_note` 等の解説キー（配列でない）は列定義ではないので飛ばす
    if (!Array.isArray(aliases)) continue;
    let idx = norm.findIndex((h) => aliases.some((a) => h === a));
    if (idx < 0) idx = norm.findIndex((h) => h !== "" && aliases.some((a) => h.includes(a)));
    if (idx >= 0) out[field] = idx;
  }
  return out;
}

/**
 * プログラム名の照合キー。A8 のプログラム名セルは末尾にプログラム ID が連結される
 * （例「ビルドジョブ｜…無料キャリア面談s00000024757004」）ため、programIdMap は
 * **部分一致**で当てる（config には「ビルドジョブ」のような短い語を登録すればよい）。
 */
export function resolveProgram(programRaw, programIdMap, programId = null) {
  const map = programIdMap || {};
  // プログラムID 完全一致を最優先（名前は A8 側で変わるが ID は不変）
  if (programId) {
    const byId = map[String(programId).trim()];
    if (typeof byId === "string") return byId;
  }
  if (!programRaw) return null;
  for (const [needle, program] of Object.entries(map)) {
    if (needle.startsWith("_")) continue; // 解説キー
    if (typeof program !== "string") continue;
    if (programRaw.includes(needle)) return program;
  }
  return null;
}

/** 合計行など、集計対象にしてはいけない行か。 */
const isTotalRow = (v) => {
  const s = String(v ?? "").trim();
  return s === "合計" || s === "総計" || s.toLowerCase() === "total";
};

/**
 * A8 レポート CSV → 正規化行。
 *
 * siteScope（レポートごと・config の reports[key].siteScope）で扱いが変わる:
 *   site-rows    → サイト列があり targetSite の行だけを採る（**完全に分離できる唯一の経路**）
 *   account-wide → 口座横断。サイト分離は不可なので、その事実を各行に `accountWide: true` として
 *                  刻む。program-detail は programIdMap の allowlist で doboku 分だけを採る。
 *
 * 必須キー列は reportKey で異なる（site-summary=site / period-daily=date / period-monthly=month /
 * program-detail=programName）。
 */
export function normalizeA8Csv(csvText, { reportKey, cfg, fetchedAt = null } = {}) {
  const a8 = cfg.a8;
  const spec = a8.reports?.[reportKey] || {};
  const siteScope = spec.siteScope || "account-wide";
  const { headers, rows } = parseCsv(csvText);
  const cols = mapColumns(headers, a8.columnAliases);
  const out = [];
  const rejects = [];

  const need =
    reportKey === "site-summary"
      ? ["site"]
      : reportKey === "period-daily"
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
      siteScope,
      fatal: `必須列が見つからない: ${missing.join(",")}（columnAliases の調整が必要）`,
    };
  }

  const get = (r, f) => (cols[f] === undefined ? null : (r[cols[f]] ?? null));

  rows.forEach((r, i) => {
    const line = i + 2;
    const siteRaw = get(r, "site");
    const programRaw = get(r, "programName") ? String(get(r, "programName")).replace(/\s+/g, " ").trim() : null;

    // 合計行は集計に混ぜない（二重計上の防止）
    if (isTotalRow(siteRaw) || isTotalRow(programRaw) || isTotalRow(get(r, "month")) || isTotalRow(get(r, "date"))) return;

    if (siteScope === "site-rows") {
      if (siteRaw == null || String(siteRaw).trim() === "") {
        rejects.push({ line, reason: "サイト列が空（帰属を確定できない）", raw: r });
        return;
      }
      if (!String(siteRaw).includes(a8.targetSite)) return; // 他サイト行は静かに除外（異常ではない）
    }

    const month = parseMonth(get(r, "month")) ?? parseMonth(get(r, "date"));
    const date = parseDate(get(r, "date"));

    if (reportKey === "period-daily" && !date) {
      rejects.push({ line, reason: "日付をパースできない", raw: r });
      return;
    }
    if (reportKey === "period-monthly" && !month) {
      rejects.push({ line, reason: "年月をパースできない", raw: r });
      return;
    }
    if (reportKey === "program-detail" && !programRaw) {
      rejects.push({ line, reason: "プログラム名が空", raw: r });
      return;
    }

    const programId = get(r, "programId") ? String(get(r, "programId")).trim() : null;

    out.push({
      ...(date ? { date } : {}),
      ...(month ? { month } : {}),
      ...(programRaw || programId
        ? {
            programId,
            programRaw,
            program: resolveProgram(programRaw, a8.programIdMap, programId),
          }
        : {}),
      ...(siteRaw ? { site: String(siteRaw).trim() } : {}),
      ...(siteScope === "account-wide" ? { accountWide: true } : {}),
      impressions: parseNumber(get(r, "impressions")),
      clicks: parseNumber(get(r, "clicks")),
      conversions: parseNumber(get(r, "conversions")),
      grossRevenueYen: parseNumber(get(r, "grossRevenueYen")),
      approved: parseNumber(get(r, "approved")),
      revenueYen: parseNumber(get(r, "revenueYen")),
      cancelledCount: parseNumber(get(r, "cancelledCount")),
      cancelledYen: parseNumber(get(r, "cancelledYen")),
      pendingCount: parseNumber(get(r, "pendingCount")),
      pendingRevenueYen: parseNumber(get(r, "pendingRevenueYen")),
      ...(fetchedAt ? { fetchedAt } : {}),
    });
  });

  return { rows: out, rejects, headers, cols, siteScope, fatal: null };
}

/**
 * 口座横断レポートから抽出した doboku 分を、サイト別レポート（真実源）と突合する。
 * 抽出分がサイト別の doboku-note 行を**超えていたら** stats47 の混入を疑う。
 * 判定は呼び出し側（auditor）が行うため、ここでは差分を返すだけ。
 */
export function crossCheckAgainstSite(siteRow, allowlistedRows) {
  if (!siteRow) return { comparable: false, reason: "サイト別レポートが無い" };
  const sum = (f) => allowlistedRows.reduce((s, r) => s + (typeof r[f] === "number" ? r[f] : 0), 0);
  const fields = ["clicks", "conversions", "grossRevenueYen", "approved", "revenueYen"];
  const deltas = {};
  let exceeded = false;
  for (const f of fields) {
    const site = typeof siteRow[f] === "number" ? siteRow[f] : null;
    const picked = sum(f);
    deltas[f] = { site, picked, delta: site == null ? null : picked - site };
    if (site != null && picked > site) exceeded = true;
  }
  return { comparable: true, exceeded, deltas };
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

/** upsert キー。period は「その run が対象とした期間」（CSV ファイル名由来・例 202601-202607）。 */
export const KEY = {
  siteSummary: (r) => `${r.period ?? "current"}::${r.site}`,
  monthly: (r) => r.month,
  daily: (r) => r.date,
  programPeriod: (r) => `${r.period ?? "current"}::${r.programId ?? r.programRaw}`,
  results: (r) => `${r.month}::${r.program}`,
};

/**
 * A8 の CSV ファイル名から対象期間を取る。
 * 例 "site_202601-202607_20260727105756.csv" → { raw:"202601-202607", start:"2026-01", end:"2026-07", singleMonth:null }
 * 期間が 1 ヶ月に閉じているときだけ singleMonth に "YYYY-MM" が入る（月次 SSOT へ写せる条件）。
 */
export function parsePeriodFromFilename(name) {
  const m = String(name ?? "").match(/(\d{6})-(\d{6})/);
  if (!m) return null;
  const fmt = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  const start = fmt(m[1]);
  const end = fmt(m[2]);
  return { raw: `${m[1]}-${m[2]}`, start, end, singleMonth: start === end ? start : null };
}

/**
 * プログラム別の正規化行 → 既存 a8-results.json の records スキーマ。
 *
 * a8-results.json は **月次**キーのため、対象期間が 1 ヶ月に閉じている run でしか写せない。
 * 現状の A8 既定期間は「年初〜当月の累計」なので、その場合は records を作らず
 * `notAttributable` として理由付きで返す（累計値を特定月の実績として書き込まない）。
 * 写像できない（programIdMap に無い）行は unmapped として返す（黙って捨てない）。
 */
export function toResultsRecords(programRows, { singleMonth = null } = {}) {
  const records = [];
  const unmapped = [];
  const notAttributable = [];
  for (const r of programRows) {
    const month = r.month ?? singleMonth;
    if (!r.program) {
      unmapped.push({
        month: month ?? null,
        programId: r.programId ?? null,
        programRaw: r.programRaw,
        reason: "programIdMap に未登録",
      });
      continue;
    }
    if (!month) {
      notAttributable.push({
        program: r.program,
        programRaw: r.programRaw,
        period: r.period ?? null,
        reason: "対象期間が単月でないため月次 SSOT に写せない（期間フォーム対応が必要）",
      });
      continue;
    }
    records.push({
      month,
      program: r.program,
      clicks: r.clicks ?? 0,
      conversions: r.conversions ?? 0,
      approved: r.approved ?? 0,
      revenueYen: r.revenueYen ?? 0,
      note: `A8 レポート自動取込（${r.programRaw}）`,
    });
  }
  return { records, unmapped, notAttributable };
}
