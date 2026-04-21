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
import { detectBrokenExplanations } from "../.claude/skills/content/audit-exam-explanations/scripts/detect.mjs";
import { auditSvgFile } from "../.claude/skills/content/audit-svg/scripts/detect.mjs";

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
