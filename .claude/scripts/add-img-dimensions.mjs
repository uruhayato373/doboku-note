/**
 * MDX 内の生 <img src="/posts/..."> に width / height attribute を追加
 *
 * Why: PSI で「unsized-images」warning + CLS 違反の原因。サイズ未指定の img は
 * 読み込み完了時にレイアウトが押し出される。
 *
 * 各画像ファイル (.webp / .png / .jpg) から sips で実 pixel 寸法を取得し、
 * width / height attribute を JSX 形式で追加する。
 *
 * Usage:
 *   node .claude/scripts/add-img-dimensions.mjs --dry-run
 *   node .claude/scripts/add-img-dimensions.mjs
 */

import { readdirSync, statSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { transformMdxFile, readMdxFile } from "./lib/mdx-io.mjs";

const ROOT = "content/site";
const DRY = process.argv.includes("--dry-run");

function findMdx(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) findMdx(p, out);
    else if (name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

const dimCache = new Map();
function getDim(absPath) {
  if (dimCache.has(absPath)) return dimCache.get(absPath);
  if (!existsSync(absPath)) {
    dimCache.set(absPath, null);
    return null;
  }
  try {
    const out = execSync(`sips -g pixelWidth -g pixelHeight "${absPath}"`, { encoding: "utf-8" });
    const w = out.match(/pixelWidth:\s*(\d+)/)?.[1];
    const h = out.match(/pixelHeight:\s*(\d+)/)?.[1];
    if (w && h) {
      const dim = { width: parseInt(w), height: parseInt(h) };
      dimCache.set(absPath, dim);
      return dim;
    }
  } catch (e) {}
  dimCache.set(absPath, null);
  return null;
}

let totalImgs = 0;
let updatedImgs = 0;
let skippedHasDim = 0;
let skippedNoFile = 0;

function transform(raw) {
  // <img ...> タグを正規表現でマッチ。属性順序に依存しないよう全属性をパース。
  return raw.replace(
    /<img\b([^>]*?)\/?>/g,
    (match, attrs) => {
      totalImgs++;
      // src を抽出
      const srcMatch = attrs.match(/\bsrc="([^"]+)"/);
      if (!srcMatch) return match;
      const src = srcMatch[1];
      // /posts/ で始まらない（外部 URL や別パス）はスキップ
      if (!src.startsWith("/posts/")) return match;
      // 既に width / height があるならスキップ
      if (/\bwidth\s*=/.test(attrs) || /\bheight\s*=/.test(attrs)) {
        skippedHasDim++;
        return match;
      }
      // 画像ファイルから dim 取得
      const localPath = `.local/r2${src}`;
      const dim = getDim(localPath);
      if (!dim) {
        skippedNoFile++;
        return match;
      }
      updatedImgs++;
      // width / height attribute を末尾に追加（self-closing 形式）
      const cleanAttrs = attrs.trimEnd();
      return `<img${cleanAttrs} width={${dim.width}} height={${dim.height}} />`;
    },
  );
}

let total = 0,
  changed = 0;
const files = findMdx(ROOT);
console.log(`Scanning ${files.length} MDX files...\n`);

for (const f of files) {
  total++;
  if (DRY) {
    const { raw } = readMdxFile(f);
    const newRaw = transform(raw);
    if (raw !== newRaw) {
      changed++;
      console.log(`  WOULD CHANGE: ${f}`);
    }
  } else {
    const did = transformMdxFile(f, transform);
    if (did) {
      changed++;
      console.log(`  changed: ${f}`);
    }
  }
}

console.log(`\n${DRY ? "[DRY RUN] " : ""}Files: ${changed} / ${total} changed`);
console.log(`Imgs: total=${totalImgs}, updated=${updatedImgs}, skipped(has dim)=${skippedHasDim}, skipped(no file)=${skippedNoFile}`);
