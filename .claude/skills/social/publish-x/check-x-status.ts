/**
 * X 投稿状態確認スクリプト
 *
 * 使い方:
 *   npx tsx .claude/skills/social/publish-x/check-x-status.ts          # 全ドラフト一覧
 *   npx tsx .claude/skills/social/publish-x/check-x-status.ts 004      # 特定ドラフト詳細
 */
import * as path from "path";
import * as fs from "fs";

const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const DRAFTS_DIR = path.join(PROJECT_ROOT, "docs/sns-drafts");

interface TweetStatus {
  title: string;
  status: "pending" | "scheduled" | "posted";
  scheduled_at?: string | null;
  posted_at?: string | null;
}

interface StatusJson {
  updated_at: string;
  tweets: Record<string, TweetStatus>;
}

function loadStatus(draftDir: string): StatusJson | null {
  const p = path.join(draftDir, "x/status.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as StatusJson;
  } catch {
    return null;
  }
}

function parseTweetTitles(draftDir: string): Record<string, string> {
  const mdPath = path.join(draftDir, "x/tweets.md");
  if (!fs.existsSync(mdPath)) return {};
  const raw = fs.readFileSync(mdPath, "utf-8");
  const result: Record<string, string> = {};
  for (const m of raw.matchAll(/^## Tweet (\d+):\s*(.+)/gm)) {
    result[String(parseInt(m[1], 10))] = m[2].trim();
  }
  return result;
}

function statusIcon(s: TweetStatus["status"]): string {
  return s === "posted" ? "✅" : s === "scheduled" ? "🕐" : "⬜";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.replace("+09:00", "").replace("T", " ");
}

function printDraft(draftName: string, verbose: boolean) {
  const draftDir = path.join(DRAFTS_DIR, draftName);
  const titles = parseTweetTitles(draftDir);
  const status = loadStatus(draftDir);
  const tweetCount = Object.keys(titles).length;

  if (tweetCount === 0) return; // tweets.md なし

  const shortName = draftName.replace(/^\d{3}-/, "").slice(0, 40);
  const postedCount = status
    ? Object.values(status.tweets).filter((t) => t.status === "posted").length
    : 0;
  const scheduledCount = status
    ? Object.values(status.tweets).filter((t) => t.status === "scheduled").length
    : 0;

  console.log(
    `\n${draftName.slice(0, 3)} ${shortName} (${tweetCount} tweets | ✅${postedCount} 🕐${scheduledCount} ⬜${tweetCount - postedCount - scheduledCount})`
  );

  if (!status) {
    console.log("     ⬜ 1〜" + tweetCount + " 全件 pending（status.json なし）");
    return;
  }

  const nums = Object.keys(titles)
    .map(Number)
    .sort((a, b) => a - b);
  for (const n of nums) {
    const key = String(n);
    const title = titles[key] ?? "?";
    const tw = status.tweets[key];
    if (!tw) {
      console.log(`     ⬜ ${n} ${title}  pending`);
      continue;
    }
    const icon = statusIcon(tw.status);
    let detail = "";
    if (tw.status === "posted" && tw.posted_at) detail = `  ${formatDate(tw.posted_at)}`;
    else if (tw.status === "scheduled" && tw.scheduled_at) detail = `  ${formatDate(tw.scheduled_at)}`;
    console.log(`     ${icon} ${n} ${title}${detail}`);
  }
}

function main() {
  const arg = process.argv[2];

  if (arg) {
    // 特定ドラフトのみ
    const entries = fs.readdirSync(DRAFTS_DIR).filter((e) => !e.startsWith(".") && e !== "README.md");
    const matched = entries.find(
      (e) => e === arg || e.startsWith(arg + "-") || e.startsWith(arg)
    );
    if (!matched) {
      console.error(`draft が見つかりません: ${arg}`);
      process.exit(1);
    }
    printDraft(matched, true);
  } else {
    // 全ドラフト
    const entries = fs
      .readdirSync(DRAFTS_DIR)
      .filter((e) => !e.startsWith(".") && e !== "README.md")
      .sort();
    for (const entry of entries) {
      printDraft(entry, false);
    }
  }

  console.log("");
}

main();
