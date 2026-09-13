import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { REPO_ROOT } from "./repository-paths.mjs";

/**
 * MDX 内の <img> / <ArticleImage> の src を走査し、ファイル実在と mime 整合性を検証。
 * 2169 バイトの HTML エラーページを .jpg として投入した過去事例（commit 7e518e99 test）の再発防止。
 *
 * 戻り値: { file, severity: "MEDIUM", error: "..." } の配列（warnings 相当）
 */
export function checkImages(file, content, root = REPO_ROOT) {
  const warnings = [];
  const tagRegex = /<(img|ArticleImage)\b([\s\S]*?)\/?>/g;

  for (const match of content.matchAll(tagRegex)) {
    const attrs = match[2];
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/);
    if (!srcMatch || !srcMatch[1].startsWith("/posts/")) continue;

    const localPath = resolve(root, "content/site", srcMatch[1].slice("/posts/".length));
    if (relative(resolve(root, "content/site"), localPath).startsWith("..")) {
      warnings.push({ file, error: `image path escapes content/site: ${srcMatch[1]}` });
      continue;
    }
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
