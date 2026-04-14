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
import { lintFrontmatter, loadTagAllowlist } from "./lint-frontmatter.mjs";

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

function checkLineEndings(content) {
  const hasCRLF = content.includes("\r\n");
  const afterCRLFRemoval = content.split("\r\n").join("");
  return hasCRLF && afterCRLFRemoval.includes("\n");
}

async function main() {
  const files = getStagedMdxFiles();

  if (files.length === 0) {
    process.exit(0); // No MDX files staged
  }

  console.log(`pre-commit: Validating ${files.length} MDX file(s)...`);

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
  }

  // 警告を先に出す（警告はブロックしない）
  if (warnings.length > 0) {
    console.warn(`\npre-commit: ⚠ ${warnings.length} warning(s) (MEDIUM/LOW):`);
    for (const { file, error, severity } of warnings) {
      console.warn(`  [${severity}] ${file}: ${error}`);
    }
  }

  if (errors.length === 0) {
    console.log(`pre-commit: ✓ All ${files.length} MDX file(s) OK.`);
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
