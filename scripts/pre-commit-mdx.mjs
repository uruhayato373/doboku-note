/**
 * pre-commit フック用 MDX検証
 *
 * git stageされた変更MDXファイルのみをコンパイルチェックする。
 * エラーがあればexit 1でコミットをブロック。
 *
 * Usage:
 *   node scripts/pre-commit-mdx.mjs
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { lintFrontmatter, loadTagAllowlist } from "#shared/lint-frontmatter.mjs";
import { detectBrokenExplanations } from "../.claude/skills/quality/check-mdx/scripts/rules/explanations/detect.mjs";
import { auditSvgFile } from "../.claude/skills/quality/check-mdx/scripts/rules/svg/detect.mjs";
import { detectEmptyContainers } from "../.claude/skills/quality/check-mdx/scripts/rules/empty-container/detect.mjs";

// Get staged MDX files
function getStagedMdxFiles() {
  try {
    const output = execSync(
      'git diff --cached --name-only --diff-filter=ACM -- "*.mdx"',
      { encoding: "utf-8" }
    );
    return output
      .trim()
      .split("\n")
      .filter((f) => f && existsSync(f));
  } catch {
    return [];
  }
}

// Get staged SVG files under .local/r2/posts/**/img/
function getStagedSvgFiles() {
  try {
    const output = execSync(
      'git diff --cached --name-only --diff-filter=ACM -- ".local/r2/posts/**/img/*.svg"',
      { encoding: "utf-8" }
    );
    return output
      .trim()
      .split("\n")
      .filter((f) => f && existsSync(f));
  } catch {
    return [];
  }
}

function checkLineEndings(content) {
  const hasCRLF = content.includes("\r\n");
  const afterCRLFRemoval = content.split("\r\n").join("");
  return hasCRLF && afterCRLFRemoval.includes("\n");
}

/**
 * MDX 内の <img> / <ArticleImage> の src を走査し、ファイル実在と mime 整合性を検証。
 * 2169 バイトの HTML エラーページを .jpg として投入した過去事例（commit 7e518e99 test）の再発防止。
 *
 * 戻り値: { file, severity: "MEDIUM", error: "..." } の配列（warnings 相当）
 */
function checkImages(file, content) {
  const warnings = [];
  const tagRegex = /<(img|ArticleImage)\b([\s\S]*?)\/?>/g;

  for (const match of content.matchAll(tagRegex)) {
    const attrs = match[2];
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/);
    if (!srcMatch || !srcMatch[1].startsWith("/posts/")) continue;

    const localPath = "public" + srcMatch[1];
    if (!existsSync(localPath)) {
      warnings.push({ file, error: `image file not found: ${localPath}` });
      continue;
    }

    try {
      const buf = readFileSync(localPath);
      const head = buf.slice(0, 200).toString("utf-8");
      const first4 = buf.slice(0, 4);
      const isJPEG = first4[0] === 0xff && first4[1] === 0xd8 && first4[2] === 0xff;
      const isPNG =
        first4[0] === 0x89 &&
        first4[1] === 0x50 &&
        first4[2] === 0x4e &&
        first4[3] === 0x47;
      const isGIF = /^GIF8/.test(head);
      const isWebP =
        buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP";
      const isSVG = /<svg[\s>]|<\?xml[\s\S]{0,200}<svg/.test(head);
      const looksHTMLerror =
        !isSVG && /^<(!DOCTYPE|!doctype|html|HTML|\?xml[\s\S]{0,200}<(html|body))/i.test(head.trim());

      const ext = srcMatch[1].toLowerCase().split(".").pop();
      let mimeOk = true;
      if (ext === "jpg" || ext === "jpeg") mimeOk = isJPEG;
      else if (ext === "png") mimeOk = isPNG;
      else if (ext === "gif") mimeOk = isGIF;
      else if (ext === "webp") mimeOk = isWebP;
      else if (ext === "svg") mimeOk = isSVG;

      if (looksHTMLerror) {
        warnings.push({
          file,
          error: `image looks like HTML/text error page: ${localPath} (${buf.length} bytes)`,
        });
      } else if (!mimeOk) {
        const headerHex = [...first4].map((b) => b.toString(16).padStart(2, "0")).join(" ");
        warnings.push({
          file,
          error: `image mime mismatch: ${localPath} (ext=${ext}, header=${headerHex})`,
        });
      }
    } catch {
      // I/O errors are swallowed
    }
  }
  return warnings;
}

/**
 * MDX 内の生 <img src="/posts/..."> が width/height を持っているか検証。
 * width/height なしの img はレイアウトシフト（CLS）の主因。Issue #84 / 2026-04-28
 * 一括対応（207 imgs / 37 files）の再発防止。
 *
 * 戻り値: { file, error: "..." } の配列（HIGH 相当、commit ブロック）
 */
function checkImageDimensions(file, content) {
  const errors = [];
  const tagRegex = /<img\b([\s\S]*?)\/?>/g;
  for (const match of content.matchAll(tagRegex)) {
    const attrs = match[1];
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    // /posts/ 配下の img のみ対象（avatar や外部 URL は対象外）
    if (!src.startsWith("/posts/")) continue;
    const hasWidth = /\bwidth\s*=/.test(attrs);
    const hasHeight = /\bheight\s*=/.test(attrs);
    if (!hasWidth || !hasHeight) {
      errors.push({
        file,
        error: `<img src="${src}"> needs width/height (CLS prevention). Run: node .claude/scripts/add-img-dimensions.mjs`,
      });
    }
  }
  return errors;
}

/**
 * CommonMark 仕様: bold 閉じ ** の直前が Unicode punctuation の場合、
 * 直後が通常文字だと right-flanking と認識されず bold が無音で崩壊する。
 * 全角閉じ括弧類が最頻出パターン。§14-b 参照。
 */
/**
 * CommonMark 仕様: bold 閉じ ** の直前が Unicode punctuation（全角閉じ括弧類）の場合、
 * 直後が通常文字だと right-flanking と認識されず bold が無音で崩壊する。§14-b 参照。
 *
 * 検出は行内の `**` を左から (0,1)(2,3)… とペアリングして「太字スパン」を復元し、
 * 各スパンの閉じ ** のみを判定する（regex 一括マッチ方式は隣接太字 `**A**…（x）**B**`
 * の "隙間" を誤検知し、開き括弧フォロワー `**…」**（` も誤検知していた。2026-06-01 改善）。
 *
 * 誤検知除外（＝右 flanking が成立し崩壊しないケース）:
 *  - 閉じ ** の直後が 空白 / 行末 / 区切り記号 / 各種括弧（開き・閉じ）
 *  - 隣接太字の "隙間"（先頭 ** が前の太字の閉じデリミタ）はペアリングで構造的に除外される
 */
function checkBoldEndingParen(file, content) {
  const warnings = [];
  const closeBracket = /[）」』】）]/u; // 太字内容の末尾がこれだと崩壊リスク
  // CommonMark: 閉じ ** の直後が「文字/数字」（\p{L}/\p{N}＝かな・漢字・英数字）のときのみ
  // right-flanking が崩れて崩壊する。空白・句読点・記号・各種括弧（〈〉等含む）は安全。
  const wordFollower = /[\p{L}\p{N}]/u;
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    const stars = [];
    for (let i = 0; i + 1 < line.length; i++) {
      if (line[i] === "*" && line[i + 1] === "*") { stars.push(i); i++; }
    }
    for (let p = 0; p + 1 < stars.length; p += 2) {
      const close = stars[p + 1];
      const lastContentChar = line[close - 1]; // 閉じ ** の直前
      if (!lastContentChar || !closeBracket.test(lastContentChar)) continue;
      const after = line[close + 2]; // 閉じ ** の直後
      if (after === undefined || !wordFollower.test(after)) continue;
      warnings.push({
        file,
        error: `bold ending with full-width bracket won't render (line ${idx + 1}): move ）outside **`,
      });
      break; // 1行1警告
    }
  });
  return warnings;
}

/**
 * NoteLink のサイト管理画像と自社 note リンク表記を検証する。
 *
 * - imageSrc は /images/note-links/*.webp 必須
 * - ファイル実在・WebP 実体を確認
 * - 旧 coverImage と <NoteLink> 外の自社 note 記事 URL を禁止
 * - kind="product" は price 必須
 */
function checkNoteLinkImage(file, content) {
  const issues = [];
  const blockRegex = /<NoteLink\b[\s\S]*?\/>/g;
  const blocks = [...content.matchAll(blockRegex)];

  for (const match of blocks) {
    const block = match[0];
    if (/\bcoverImage=/.test(block)) {
      issues.push({ file, error: "NoteLink coverImage is abolished; use imageSrc" });
    }
    if (/\bkind=["']product["']/.test(block) && !/\bprice=["'][^"']+["']/.test(block)) {
      issues.push({ file, error: 'NoteLink kind="product" requires price' });
    }
    const src = block.match(/\bimageSrc=["']([^"']+)["']/)?.[1];
    if (!src) {
      issues.push({ file, error: "NoteLink imageSrc is required" });
      continue;
    }
    if (!/^\/images\/note-links\/[A-Za-z0-9._/-]+\.webp$/.test(src)) {
      issues.push({
        file,
        error: `NoteLink imageSrc must use /images/note-links/*.webp, got: ${src}`,
      });
      continue;
    }
    const localImage = "public" + src;
    if (!existsSync(localImage)) {
      issues.push({ file, error: `NoteLink image not found: ${localImage}` });
      continue;
    }
    const data = readFileSync(localImage);
    const isWebP =
      data.slice(0, 4).toString() === "RIFF" &&
      data.slice(8, 12).toString() === "WEBP";
    if (!isWebP) {
      issues.push({ file, error: `NoteLink image is not WebP: ${localImage}` });
    }
  }

  const masked = content.replace(blockRegex, (block) => " ".repeat(block.length));
  if (/https?:\/\/(?:www\.)?note\.com\/dobokunote\/n\/[A-Za-z0-9]+/.test(masked)) {
    issues.push({
      file,
      error: "dobokunote article URL must be inside an image-backed <NoteLink>",
    });
  }

  return issues;
}

/**
 * 壊れた表（ヘッダー行＋セパレータ行のみで本文行がゼロ）を検出する。
 *
 * GFM では本文行の無い表は空テーブルとして崩れて描画される。PDF→MDX 変換や
 * 「キーバリュー表の散文化」途中で、表本体だけ箇条書き・段落に置換され、
 * ヘッダー行と区切り行が残骸として取り残されるパターン（2026-06-16、9 ファイル
 * 32 箇所を是正）。lint-mdx-mobile.mjs 1-7（HIGH）と同一判定。§4 参照。
 *
 * 戻り値: { file, error } の配列（HIGH 相当、コミットブロック）
 */
function checkBrokenTables(file, content) {
  const errors = [];
  const lines = content.split("\n");
  const isPipe = (s) => /^\s*\|.*\|\s*$/.test(s);
  const isSep = (s) => /^\s*\|[-:\s|]+\|\s*$/.test(s) && /-/.test(s);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!isPipe(lines[i]) || !isSep(lines[i + 1])) continue;
    // セパレータの直後に本文行（`| ... |`）が 1 行も無ければ壊れた表
    const hasBody = i + 2 < lines.length && isPipe(lines[i + 2]);
    if (!hasBody) {
      errors.push({
        file,
        error: `broken table with no body rows (line ${i + 1}): ${lines[i].trim()} — remove the orphan header+separator or add body rows (§4 / lint 1-7)`,
      });
    }
  }
  return errors;
}

async function main() {
  const files = getStagedMdxFiles();
  const svgFiles = getStagedSvgFiles();

  if (files.length === 0 && svgFiles.length === 0) {
    process.exit(0); // Nothing to validate
  }

  if (files.length > 0) {
    console.log(`pre-commit: Validating ${files.length} MDX file(s)...`);
  }
  if (svgFiles.length > 0) {
    console.log(`pre-commit: Auditing ${svgFiles.length} SVG file(s)...`);
  }

  const errors = []; // HIGH 相当（コミットブロック）
  const warnings = []; // MEDIUM/LOW（警告表示のみ）
  const allowlist = loadTagAllowlist();

  for (const file of files) {
    const raw = readFileSync(file, "utf-8");

    // Line ending check
    if (checkLineEndings(raw)) {
      errors.push({ file, error: "Mixed line endings (CRLF + LF)" });
      continue;
    }

    let data, content;
    try {
      const parsed = matter(raw);
      data = parsed.data;
      content = parsed.content;
    } catch (e) {
      errors.push({ file, error: `frontmatter parse: ${e.message?.split("\n")[0]}` });
      continue;
    }

    // Frontmatter lint (HIGH/MEDIUM/LOW)
    const issues = lintFrontmatter(file, data, allowlist);
    for (const issue of issues) {
      const entry = { file, error: `[${issue.code}] ${issue.message}` };
      if (issue.severity === "HIGH") errors.push(entry);
      else warnings.push({ ...entry, severity: issue.severity });
    }

    // MDX compile check
    try {
      await compileMDX({
        source: content,
        options: {
          mdxOptions: {
            remarkPlugins: [remarkMath, remarkGfm],
            rehypePlugins: [rehypeKatex],
          },
        },
      });
    } catch (e) {
      errors.push({
        file,
        error: e.message?.split("\n")[0] || "MDX compile error",
      });
    }

    // Image existence + mime check (warnings only, does not block commit)
    for (const w of checkImages(file, content)) {
      warnings.push({ ...w, severity: "MEDIUM" });
    }

    // Image dimensions check (HIGH - blocks commit, CLS prevention)
    for (const e of checkImageDimensions(file, content)) {
      errors.push(e);
    }

    // 壊れた表（HIGH — コミットブロック、§4 / lint 1-7）
    for (const e of checkBrokenTables(file, content)) {
      errors.push(e);
    }

    // Bold ending with full-width bracket (MEDIUM - warning only, §14-b)
    for (const w of checkBoldEndingParen(file, content)) {
      warnings.push({ ...w, severity: "MEDIUM" });
    }

    // 過去問解説の破損パターン検出（警告のみ、ブロックしない）
    // primary/secondary の article.mdx のみ対象（他カテゴリはスキップ）
    if (/\/(primary|secondary)-[^/]+\/article\.mdx$/.test(file)) {
      for (const f of detectBrokenExplanations(content)) {
        warnings.push({
          file,
          severity: "MEDIUM",
          error: `[${f.pattern}] line ${f.line}: ${f.snippet}`,
        });
      }
    }

    // 空コンテナ検出（HIGH — コミットブロック）
    // 中身が空の <Callout> はタイトルだけの無意味な枠。全 MDX 対象。
    // bulk リンク削除等でコンテナの中身が消えても枠が残る事故の再発防止。
    for (const f of detectEmptyContainers(content)) {
      errors.push({
        file,
        error: `[${f.pattern}] line ${f.line}: ${f.snippet}`,
      });
    }

    // NoteLink サイト管理画像 + 自社 note 生リンク検証（HIGH — コミットブロック）
    for (const e of checkNoteLinkImage(file, content)) {
      errors.push(e);
    }
  }

  // SVG 監査: staged SVG に対して audit-svg の detect を実行
  // HIGH は errors（コミットブロック）、MEDIUM/LOW は warnings
  for (const svgFile of svgFiles) {
    let findings;
    try {
      findings = auditSvgFile(svgFile);
    } catch (e) {
      errors.push({ file: svgFile, error: `SVG parse: ${e.message}` });
      continue;
    }
    for (const f of findings) {
      const entry = { file: svgFile, error: `[${f.pattern}] ${f.severity}` };
      if (f.severity === "HIGH") errors.push(entry);
      else warnings.push({ ...entry, severity: f.severity });
    }
  }

  // 警告を先に出す（警告はブロックしない）
  if (warnings.length > 0) {
    console.warn(`\npre-commit: ⚠ ${warnings.length} warning(s) (MEDIUM/LOW):`);
    for (const { file, error, severity } of warnings) {
      console.warn(`  [${severity}] ${file}: ${error}`);
    }
  }

  if (errors.length === 0) {
    const parts = [];
    if (files.length > 0) parts.push(`${files.length} MDX`);
    if (svgFiles.length > 0) parts.push(`${svgFiles.length} SVG`);
    console.log(`pre-commit: ✓ All ${parts.join(" + ")} file(s) OK.`);
    process.exit(0);
  } else {
    console.error(`\npre-commit: ✗ ${errors.length} HIGH error(s):\n`);
    for (const { file, error } of errors) {
      console.error(`  ${file}: ${error}`);
    }
    console.error("\nCommit aborted. Fix the HIGH errors and try again.");
    process.exit(1);
  }
}

main();
