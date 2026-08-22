/**
 * check-a8-apply-budget.cjs — A8 提携申請の頻度ガード。
 *
 * A8 側のスパム判定を避けるため「週あたりの自動申請件数」に上限を設ける。
 * 上限は curated data の `weeklyApplyMax` を読む (ハードコードしない)。
 * a8-catalog.json の各エントリ history から "applied" 遷移の日時を JST 週で集計する。
 *
 * ハード上限: 週 weeklyApplyMax 件。超過分は apply しない (a8-browser.ts apply が本 API で判定)。
 *
 * API:
 *   loadCatalog()                 → a8-catalog.json (無ければ {entries:{}})
 *   appliedDates(catalog)         → ["YYYY-MM-DD", ...] (applied 遷移の JST 日付)
 *   isoWeekStart(dateStr)         → その日を含む週の月曜 "YYYY-MM-DD"
 *   weekAppliedCount(catalog, d)  → dateStr を含む週の申請件数
 *   applyBudget(catalog, dateStr) → { ok, weekCount, remaining, max, weekStart }
 *
 * CLI:
 *   node .claude/scripts/ads/check-a8-apply-budget.cjs [--date YYYY-MM-DD]
 *     → 今週の申請件数 + 残枠を表示。上限到達なら exit 1。
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const CATALOG_PATH = path.join(PROJECT_ROOT, ".claude/state/ads/a8-catalog.json");
const CURATED_PATH = path.join(PROJECT_ROOT, ".claude/scripts/ads/data/a8-curated.json");

function loadCatalog() {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  } catch {
    return { entries: {} };
  }
}

function loadCurated() {
  return JSON.parse(fs.readFileSync(CURATED_PATH, "utf8"));
}

/** history の "applied" 遷移の JST 日付を全て集める。 */
function appliedDates(catalog) {
  const out = [];
  for (const e of Object.values(catalog?.entries ?? {})) {
    for (const h of e.history ?? []) {
      if (h.to !== "applied" || !h.at) continue;
      const d = jstDate(h.at);
      if (d) out.push(d);
    }
  }
  return out;
}

/** ISO/日付文字列 → JST "YYYY-MM-DD"。 */
function jstDate(raw) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw.slice(0, 10) || null;
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** dateStr を含む週の月曜 (JST)。 */
function isoWeekStart(dateStr) {
  // 正午 JST を基準にする (00:00 JST は前日 15:00 UTC で getUTCDay が前日にずれるため)。
  const noon = new Date(`${dateStr}T12:00:00+09:00`);
  const dow = (noon.getUTCDay() + 6) % 7; // 月=0 ... 日=6
  const monday = new Date(noon.getTime() - dow * 24 * 60 * 60 * 1000);
  const jst = new Date(monday.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function weekAppliedCount(catalog, dateStr) {
  const weekStart = isoWeekStart(dateStr);
  const start = new Date(`${weekStart}T00:00:00+09:00`);
  const dates = appliedDates(catalog);
  const weekKeys = new Set();
  for (let i = 0; i < 7; i++) {
    const day = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const jst = new Date(day.getTime() + 9 * 60 * 60 * 1000);
    weekKeys.add(jst.toISOString().slice(0, 10));
  }
  return dates.filter((d) => weekKeys.has(d)).length;
}

/** dateStr の週にあと何件申請できるか。 */
function applyBudget(catalog, dateStr, curatedOverride) {
  const curated = curatedOverride ?? loadCurated();
  const max = curated.weeklyApplyMax;
  const weekCount = weekAppliedCount(catalog, dateStr);
  const remaining = Math.max(0, max - weekCount);
  return {
    ok: weekCount < max,
    weekCount,
    remaining,
    max,
    weekStart: isoWeekStart(dateStr),
  };
}

module.exports = {
  loadCatalog,
  loadCurated,
  appliedDates,
  jstDate,
  isoWeekStart,
  weekAppliedCount,
  applyBudget,
};

// ---------- CLI ----------
if (require.main === module) {
  const args = process.argv.slice(2);
  const di = args.indexOf("--date");
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const anchor = di >= 0 ? args[di + 1] : today;
  try {
    const catalog = loadCatalog();
    const b = applyBudget(catalog, anchor);
    console.log(`[check-a8-apply-budget] 週 ${b.weekStart}〜 (基準日 ${anchor})`);
    console.log(`  今週の申請: ${b.weekCount} 件 / 上限 ${b.max} 件 (残 ${b.remaining})`);
    if (!b.ok) {
      console.error(`🚨 週上限到達 (${b.max})。今週はこれ以上申請しません。`);
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
