/**
 * sot.mjs — SNS 投稿状態板（読み取り専用）のデータ統合。
 *
 * 読む SoT:
 *   - docs/sns/schedule.json           全チャネル統合スケジュール（slug × 日付）
 *   - IG posted.json                   scripts/ig-status.mjs の export を import 再利用
 *   - X draft の status.json + tweets.md  ツイート別 scheduled/posted/draft
 *
 * 集計ロジックは ig-status.mjs printSummary と同義（検証時に CLI 出力と突合する）。
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const SNS = join(ROOT, "docs", "sns");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** IG: パック一覧 + 試験別サマリ（ig-status.mjs summary と同じ集計）。 */
export async function igBoard() {
  const ig = await import(new URL("../../../scripts/ig-status.mjs", import.meta.url).href);
  const packs = ig.walkPacks(ig.IG_DIR).map(ig.packInfo);
  const anyPosted = (posted) => !!posted && ig.FORMATS.some((f) => posted[f]);

  const byExam = {};
  for (const p of packs) {
    if (!byExam[p.exam]) byExam[p.exam] = { done: 0, total: 0, carousel: 0, reels: 0, stories: 0 };
    byExam[p.exam].total++;
    if (anyPosted(p.posted)) byExam[p.exam].done++;
    for (const f of ig.FORMATS) if (p.posted?.[f]) byExam[p.exam][f]++;
  }
  const totalDone = packs.filter((p) => anyPosted(p.posted)).length;

  return {
    packs: packs.map((p) => ({
      rel: p.rel,
      exam: p.exam,
      slug: p.slug,
      year: p.year,
      posted: p.posted,
      status: statusStr(p.posted, ig.FORMATS),
      latest: latestDate(p.posted, ig.FORMATS),
    })),
    byExam,
    total: packs.length,
    totalDone,
  };
}

const FMT_LETTER = { carousel: "C", reels: "R", stories: "S" };

function statusStr(posted, formats) {
  return formats.map((f) => (posted?.[f] ? FMT_LETTER[f] : "-")).join("");
}

function latestDate(posted, formats) {
  const dates = formats.map((f) => posted?.[f]?.at).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : "";
}

/** X: draft ディレクトリごとの tweet 状態 + 直近予約日時。 */
export function xBoard() {
  const draftDir = join(SNS, "x", "draft");
  const drafts = [];
  if (!existsSync(draftDir)) return { drafts, totals: {} };
  for (const name of readdirSync(draftDir).sort()) {
    const dir = join(draftDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const status = readJson(join(dir, "status.json"));
    const tweets = Object.entries(status?.tweets || {}).map(([no, t]) => ({
      no,
      title: t.title || "",
      status: t.status || "draft",
      scheduledAt: t.scheduled_at || null,
      postedAt: t.posted_at || null,
    }));
    const counts = { draft: 0, scheduled: 0, posted: 0, other: 0 };
    for (const t of tweets) (t.status in counts ? counts[t.status]++ : counts.other++);
    drafts.push({
      name,
      rel: `x/draft/${name}`,
      updatedAt: status?.updated_at || null,
      counts,
      total: tweets.length,
      tweets,
    });
  }
  const totals = { draft: 0, scheduled: 0, posted: 0, other: 0, tweets: 0 };
  for (const d of drafts) {
    totals.tweets += d.total;
    for (const k of ["draft", "scheduled", "posted", "other"]) totals[k] += d.counts[k];
  }
  return { drafts, totals };
}

/** 統合スケジュール（slug × yt/ig 日付、650 件規模）。 */
export function readSchedule() {
  return readJson(join(SNS, "schedule.json")) || [];
}

/** 状態板の一括レスポンス。 */
export async function snsBoard() {
  return {
    ig: await igBoard(),
    x: xBoard(),
    schedule: readSchedule(),
    generatedAt: new Date().toISOString(),
  };
}
