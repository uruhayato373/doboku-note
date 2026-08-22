/**
 * SNS チャンネル分離 + x/ フラット化 移行スクリプト
 *
 * 実行:
 *   node scripts/migrate-channel-split.mjs
 *
 * 処理内容:
 *   1. x-posts/draft/NNN-.../x/tweets.md   => x-posts/draft/NNN-.../tweets.md  (x/ フラット化)
 *      x-posts/draft/NNN-.../x/img/        => x-posts/draft/NNN-.../img/
 *   2. x-posts/draft/NNN-.../instagram-carousel.md => ig-posts/draft/NNN-.../slides.md
 *      x-posts/draft/NNN-.../instagram-carousel/img/ => ig-posts/draft/NNN-.../img/
 *   3. x-posts/draft/NNN-.../youtube-shorts/ => yt-posts/draft/NNN-.../ (内容をそのまま移動)
 */
import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../../");
const X_DRAFT = join(ROOT, "docs/x-posts/draft");

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function gitMv(from, to) {
  ensureDir(dirname(to));
  try {
    execSync(`git mv "${from}" "${to}"`, { cwd: ROOT, stdio: "pipe" });
  } catch (e) {
    console.error(`  ⚠️  git mv 失敗 (${e.message?.split("\n")[0]}): ${from.split("/").slice(-2).join("/")}`);
  }
}

// ig-posts / yt-posts ルート作成
for (const d of [
  "docs/ig-posts/draft", "docs/ig-posts/published",
  "docs/yt-posts/draft", "docs/yt-posts/published",
]) {
  ensureDir(join(ROOT, d));
}
writeFileSync(join(ROOT, "docs/ig-posts/published/.gitkeep"), "");
writeFileSync(join(ROOT, "docs/yt-posts/published/.gitkeep"), "");

const drafts = readdirSync(X_DRAFT).filter(
  (e) => !e.startsWith(".") && statSync(join(X_DRAFT, e)).isDirectory()
);

for (const draft of drafts) {
  const xDir = join(X_DRAFT, draft);
  console.log(`\n📦 ${draft}`);

  // ── 1. x/ フラット化 ──────────────────────────────────
  const xSubDir = join(xDir, "x");
  for (const [rel, dest] of [
    ["x/tweets.md", "tweets.md"],
    ["x/img",       "img"],
    ["x/status.json","status.json"],
  ]) {
    const from = join(xDir, rel);
    if (existsSync(from)) {
      gitMv(from, join(xDir, dest));
      console.log(`  x/${rel.replace("x/", "")} → ${dest}`);
    }
  }

  // ── 2. Instagram → ig-posts/draft/NNN-*/ ─────────────
  const igDest = join(ROOT, "docs/ig-posts/draft", draft);
  ensureDir(igDest);

  const igMd = join(xDir, "instagram-carousel.md");
  if (existsSync(igMd)) {
    gitMv(igMd, join(igDest, "slides.md"));
    console.log(`  instagram-carousel.md → ig-posts/draft/${draft}/slides.md`);
  }

  const igImg = join(xDir, "instagram-carousel/img");
  if (existsSync(igImg)) {
    gitMv(igImg, join(igDest, "img"));
    console.log(`  instagram-carousel/img/ → ig-posts/draft/${draft}/img/`);
  }

  // ── 3. YouTube → yt-posts/draft/NNN-*/ ───────────────
  const ytSrc = join(xDir, "youtube-shorts");
  if (existsSync(ytSrc)) {
    const files = readdirSync(ytSrc).filter((f) => !f.startsWith("."));
    if (files.length > 0) {
      const ytDest = join(ROOT, "docs/yt-posts/draft", draft);
      ensureDir(ytDest);
      for (const f of files) {
        gitMv(join(ytSrc, f), join(ytDest, f));
      }
      console.log(`  youtube-shorts/* (${files.length} files) → yt-posts/draft/${draft}/`);
    }
  }
}

console.log("\n✅ 移行完了");
console.log("空になった x/ / instagram-carousel/ / youtube-shorts/ ディレクトリは `git status` で確認して削除してください。");
