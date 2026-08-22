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
const DRAFT_DIR = path.join(PROJECT_ROOT, "content/sns/x/draft");
const PUBLISHED_DIR = path.join(PROJECT_ROOT, "content/sns/x/published");

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
  const p = path.join(draftDir, "status.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as StatusJson;
  } catch {
    return null;
  }
}

function parseTweetTitles(draftDir: string): Record<string, string> {
  const mdPath = path.join(draftDir, "tweets.md");
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

function printDraft(draftName: string, baseDir: string): void {
  const draftDir = path.join(baseDir, draftName);
  const titles = parseTweetTitles(draftDir);
  const status = loadStatus(draftDir);
  const tweetCount = Object.keys(titles).length;

  if (tweetCount === 0) return;

  const shortName = draftName.replace(/^\d{3}-/, "").slice(0, 40);
  const postedCount = status
    ? Object.values(status.tweets).filter((t) => t.status === "posted").length
    : 0;
  const scheduledCount = status
    ? Object.values(status.tweets).filter((t) => t.status === "scheduled").length
    : 0;
  const pendingCount = tweetCount - postedCount - scheduledCount;

  console.log(
    `\n  ${draftName.slice(0, 3)} ${shortName} (${tweetCount} tweets | ✅${postedCount} 🕐${scheduledCount} ⬜${pendingCount})`
  );

  if (!status) {
    console.log("       ⬜ 1〜" + tweetCount + " 全件 pending（status.json なし）");
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
      console.log(`       ⬜ ${n} ${title}  pending`);
      continue;
    }
    const icon = statusIcon(tw.status);
    let detail = "";
    if (tw.status === "posted" && tw.posted_at) detail = `  ${formatDate(tw.posted_at)}`;
    else if (tw.status === "scheduled" && tw.scheduled_at) detail = `  ${formatDate(tw.scheduled_at)}`;
    console.log(`       ${icon} ${n} ${title}${detail}`);
  }

  // 全件投稿済みなら published への移動ヒントを表示
  if (postedCount === tweetCount && tweetCount > 0 && baseDir.endsWith("/draft")) {
    console.log(
      `\n  💡 全件投稿済み → git mv docs/x-posts/draft/${draftName} docs/x-posts/published/`
    );
  }
}

function listDir(baseDir: string, filterArg?: string): string[] {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir)
    .filter(
      (e) =>
        !e.startsWith(".") &&
        e !== "README.md" &&
        fs.statSync(path.join(baseDir, e)).isDirectory() &&
        (filterArg
          ? e === filterArg || e.startsWith(filterArg + "-") || e.startsWith(filterArg)
          : true)
    )
    .sort();
}

function main() {
  const arg = process.argv[2];

  const draftEntries = listDir(DRAFT_DIR, arg);
  const publishedEntries = listDir(PUBLISHED_DIR, arg);

  if (arg && draftEntries.length === 0 && publishedEntries.length === 0) {
    console.error(`draft が見つかりません: ${arg}`);
    process.exit(1);
  }

  if (draftEntries.length > 0) {
    console.log("\n[draft]");
    for (const entry of draftEntries) printDraft(entry, DRAFT_DIR);
  }

  if (publishedEntries.length > 0) {
    console.log("\n[published]");
    for (const entry of publishedEntries) printDraft(entry, PUBLISHED_DIR);
  }

  if (draftEntries.length === 0 && publishedEntries.length === 0) {
    console.log("（ドラフトがありません）");
  }

  console.log("");
}

main();
