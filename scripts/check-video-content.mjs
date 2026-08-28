/**
 * check-video-content.mjs — 動画パック（DN-0110）の整合ゲート CLI。
 *
 * 検査内容（実体はライブラリ scripts/lib/video-content-check.mjs）:
 *   manifest schema / packId 一意性 / sourceRef 実在・漏洩フラグ / CTA カタログ解決 /
 *   UTM 整合 / storyboard 尺・連続性・caption 長・定型反復 / 逐語転用 /
 *   mp4/wav 混入 / status の孤児・videoId 重複・承認欠落・relatedVideoId
 *
 * Usage:
 *   node scripts/check-video-content.mjs           通常（packs root 不在＝Phase 1 未着手は明示して exit 0）
 *   node scripts/check-video-content.mjs --strict  packs root 不在も検査不成立として exit 2
 *   node scripts/check-video-content.mjs --json    機械可読
 *
 * exit: 0 合格 / 1 違反あり / 2 検査不成立（root はあるのに対象 0 件、または --strict で root 不在）
 *   「検査 0 件」を PASS と区別するため、常に検査対象数と実検査数を出力する。
 *   チェッカー自体の健全性は tests/video-content-check.test.mjs（fixture）が npm test で担保する。
 *
 * 真実源: .claude/knowledge/reference/video-content-policy.md §8 ＋ .claude/config/video-content.json
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAll, loadConfig } from './lib/video-content-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const asJson = args.has('--json');

const config = loadConfig(ROOT);
const result = checkAll(ROOT, { config });

const fails = result.issues.filter((i) => i.severity === 'FAIL');
const warns = result.issues.filter((i) => i.severity === 'WARN');
const infos = result.issues.filter((i) => i.severity === 'INFO');
const verbose = args.has('--verbose');

let exitCode = 0;
let verdict;
if (result.notStarted) {
  verdict = `Phase 1 未着手（${config.paths.packsRoot} と state が未作成）`;
  exitCode = strict ? 2 : 0;
} else if (result.packCount === 0) {
  verdict = `検査不成立: ${config.paths.packsRoot} は在るのにパック 0 件`;
  exitCode = 2;
} else if (fails.length > 0) {
  verdict = 'FAIL';
  exitCode = 1;
} else {
  verdict = 'PASS';
}

if (asJson) {
  console.log(JSON.stringify({ verdict, exitCode, ...result }, null, 2));
} else {
  console.log(`check-video-content: パック ${result.packCount} 件中 ${result.checkedCount} 件を検査（state: ${result.stateExists ? 'あり' : 'なし'}）`);
  for (const i of result.issues) {
    if (i.severity === 'INFO' && !verbose) continue; // 企画のみ(draft)の未着手通知は --verbose でだけ列挙
    console.log(`  [${i.severity}] ${i.code} ${i.packId ?? '-'}: ${i.message}`);
  }
  console.log(`結果: ${verdict}（FAIL ${fails.length} / WARN ${warns.length} / INFO ${infos.length}${verbose ? '' : '・INFO の内訳は --verbose'}）`);
}

process.exit(exitCode);
