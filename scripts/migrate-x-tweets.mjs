/**
 * x.md → x/tweets.md 移行スクリプト
 * content/sns/x/ 配下の全ドラフトで x.md を tweets.md に移動する
 */
import { readdirSync, existsSync, renameSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DRAFTS_DIR = join(__dirname, "../content/sns/x");

const entries = readdirSync(DRAFTS_DIR).filter(
  (e) => e !== "README.md" && !e.startsWith(".")
);

let moved = 0;
let skipped = 0;

for (const entry of entries) {
  const draftDir = join(DRAFTS_DIR, entry);
  const oldPath = join(draftDir, "x.md");
  const xDir = join(draftDir, "x");
  const newPath = join(xDir, "tweets.md");

  if (!existsSync(oldPath)) {
    console.log(`  スキップ（x.md なし）: ${entry}`);
    skipped++;
    continue;
  }

  if (existsSync(newPath)) {
    console.log(`  スキップ（既に x/tweets.md あり）: ${entry}`);
    skipped++;
    continue;
  }

  if (!existsSync(xDir)) {
    mkdirSync(xDir, { recursive: true });
  }

  renameSync(oldPath, newPath);
  console.log(`  ✅ 移動: ${entry}/x.md → x/tweets.md`);
  moved++;
}

console.log(`\n完了: ${moved} 件移動, ${skipped} 件スキップ`);
