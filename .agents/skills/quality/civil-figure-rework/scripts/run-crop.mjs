#!/usr/bin/env node
// .claude/skills/quality/civil-figure-rework/scripts/run-crop.mjs
//
// figure-spec.json を読み、各 figure に対して ImageMagick で crop を実行する。
//
// 入力 spec フォーマット（civil-exam-figure-extractor が出力）:
// {
//   "exam": "r06-a",
//   "pdf": "docs/textbook/.../R6-1ji-A.pdf",
//   "figures": [
//     {
//       "problem_no": 1,
//       "page": 3,
//       "page_image": ".tmp/pdf-pages/R6-1ji-A/page-03.png",
//       "bbox_pct": {"x": 0.20, "y": 0.18, "w": 0.60, "h": 0.35},
//       "alt": "土の構成の模式図",
//       "target_filename": "r06-a-fig-01.png"
//     }
//   ]
// }
//
// 使い方:
//   node run-crop.mjs --spec .tmp/r06-a-figure-spec.json \
//                     --out-dir .local/r2/posts/civil-construction-1/primary-r06-a/img
//
// 出力: stdout に結果 JSON を出力（success/fail per figure）

import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--spec') args.spec = argv[++i];
    else if (a === '--out-dir') args.outDir = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  if (!args.spec || !args.outDir) {
    console.error('Usage: run-crop.mjs --spec <path> --out-dir <path> [--dry-run]');
    process.exit(2);
  }
  return args;
}

function getImageSize(imagePath) {
  // ImageMagick identify で WxH を取得
  const out = execSync(`magick identify -format "%w %h" "${imagePath}"`, { encoding: 'utf-8' }).trim();
  const [w, h] = out.split(' ').map(Number);
  return { width: w, height: h };
}

function cropFigure(pageImage, bboxPct, outPath, dryRun) {
  const { width, height } = getImageSize(pageImage);

  // bbox_pct を px に変換（四捨五入）
  const cropW = Math.round(width * bboxPct.w);
  const cropH = Math.round(height * bboxPct.h);
  const cropX = Math.round(width * bboxPct.x);
  const cropY = Math.round(height * bboxPct.y);

  // 境界チェック（はみ出し防止）
  const safeW = Math.min(cropW, width - cropX);
  const safeH = Math.min(cropH, height - cropY);

  if (safeW <= 0 || safeH <= 0) {
    throw new Error(`Invalid bbox for ${pageImage}: x=${cropX} y=${cropY} w=${safeW} h=${safeH}`);
  }

  // magick <input> -crop WxH+X+Y +repage <output>
  const cmd = `magick "${pageImage}" -crop ${safeW}x${safeH}+${cropX}+${cropY} +repage "${outPath}"`;

  if (dryRun) {
    return { command: cmd, source_size: { width, height }, crop_px: { x: cropX, y: cropY, w: safeW, h: safeH } };
  }

  execSync(cmd, { stdio: 'pipe' });

  // 結果サイズ確認
  const result = getImageSize(outPath);
  return {
    source_size: { width, height },
    crop_px: { x: cropX, y: cropY, w: safeW, h: safeH },
    output_size: result,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const spec = JSON.parse(readFileSync(args.spec, 'utf-8'));

  if (!existsSync(args.outDir)) {
    mkdirSync(args.outDir, { recursive: true });
  }

  const results = {
    exam: spec.exam,
    out_dir: args.outDir,
    figures: [],
    success: 0,
    fail: 0,
  };

  for (const fig of spec.figures || []) {
    const outPath = join(args.outDir, fig.target_filename);
    try {
      const cropInfo = cropFigure(fig.page_image, fig.bbox_pct, outPath, args.dryRun);
      results.figures.push({
        target_filename: fig.target_filename,
        problem_no: fig.problem_no,
        ok: true,
        out_path: outPath,
        ...cropInfo,
      });
      results.success++;
    } catch (e) {
      results.figures.push({
        target_filename: fig.target_filename,
        problem_no: fig.problem_no,
        ok: false,
        error: e.message,
      });
      results.fail++;
    }
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(results.fail > 0 ? 1 : 0);
}

main();
