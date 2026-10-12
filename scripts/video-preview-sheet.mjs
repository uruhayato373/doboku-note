#!/usr/bin/env node
/**
 * video-preview-sheet.mjs — 公開前の画面確認（DN-0603）。動画パック 1 本の無音プレビュー・10 秒ごとのコンタクトシート・数値を作る。
 *
 * 前提: 先に描画する（音声は要らない）: npm run render-longform -- --pack-dir content/sns/video-packs/{exam}/{slug} --skip-tts
 * 出力: .tmp/video-render/{packId}/preview/（preview-metrics.json・preview.mp4・contact-sheet*.jpg。Git に入れない）
 * 数値: 冒頭の表紙の秒数・直前と同じ画面の割合・20 秒以上同じ画面が続く箇所。閾値は config/video-content.json の visualCheck。
 * 注意が出ても終了コードは 0（承認を止めない・人が画面で判断する）。台帳を使う版は npm run media -- preview --pub <公開 ID>。
 *
 * Usage: node scripts/video-preview-sheet.mjs (--pack-dir content/sns/video-packs/{exam}/{slug} | --pack-id {packId}) [--metrics-only]
 * 終了コード: 0 完走 / 1 入力不足 / 2 検査不成立（ffmpeg が無い。数値は出す。--metrics-only なら ffmpeg を使わず 0）
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { runPackPreview } from './lib/media-preview.mjs';

const args = parseCliArgs({
  'pack-dir': { type: 'string' },
  'pack-id': { type: 'string' },
  'metrics-only': { type: 'boolean' },
});
let packId = args.packId;
if (!packId && args.packDir) {
  const dir = resolve(REPO_ROOT, args.packDir);
  const manifestPath = join(dir, 'video-pack.json');
  packId = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).packId : basename(dir);
}
if (!packId) {
  console.error('Usage: node scripts/video-preview-sheet.mjs (--pack-dir content/sns/video-packs/{exam}/{slug} | --pack-id {packId}) [--metrics-only]');
  process.exit(1);
}
const r = runPackPreview(REPO_ROOT, { packId, metricsOnly: Boolean(args.metricsOnly) });
process.exitCode = r.code;
