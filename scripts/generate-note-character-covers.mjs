#!/usr/bin/env node
// generate-note-character-covers.mjs — note カバー（記事＋マガジン）を独立した出力先へ一括生成し、照合用 manifest を書く。
//
// 通常運用の生成器は generate-note-covers.mjs（記事・CI）/ generate-magazine-covers.mjs（マガジン）で、
// 描画・対象一覧・ポーズ割当はどれも同じ lib（note-character-cover / note-cover-inventory）。
// 本スクリプトは全量差し替えのときに、原稿ツリーへ書かず manifest（入力・旧画像・出力の hash、ポーズ、
// 実描画枠）を残すための入口。仕様: .claude/knowledge/design-system/note-cover-character-v5.md
//
//   npm run note-character-covers -- --source-root /path/to/source-checkout --output-root /path/to/isolated-output
//   npm run note-character-covers -- --filter 工程管理          # 記事相対パス / magazine:<ID> の部分一致
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { renderNoteCharacterCover } from './lib/note-character-cover.mjs';
import { loadNoteCoverInventory, hashBytes as hash } from './lib/note-cover-inventory.mjs';

const ownRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const sourceRoot = resolve(option('--source-root') || ownRoot);
const outputRoot = resolve(option('--output-root') || join(ownRoot, '.tmp/note-character-covers'));
const filter = option('--filter');
const sourceContent = join(sourceRoot, 'content');
if (sourceRoot === outputRoot || outputRoot === sourceContent || outputRoot.startsWith(sourceContent + '/')) {
  throw new Error('生成先を原稿ツリーに重ねられません。独立した出力ディレクトリを指定してください');
}
const inventory = await loadNoteCoverInventory(sourceRoot, { configRoot: ownRoot });
const { retired, errors, poseLabels } = inventory;
const selected = filter ? inventory.targets.filter(target => target.key.includes(filter)) : inventory.targets;
if (!selected.length) throw new Error('生成対象0件');
mkdirSync(outputRoot, { recursive: true });
const report = { version: 1, generatedAt: new Date().toISOString(), sourceRoot,
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim(),
  generatorHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ownRoot, encoding: 'utf8' }).trim(),
  rendererSha256: hash(readFileSync(join(ownRoot, 'scripts/lib/note-character-cover.mjs'))),
  targetCount: selected.length, generatedCount: 0, failedCount: 0, poseLabels, poseCounts: {}, retired, targets: [], errors };
const reportPath = join(outputRoot, 'manifest.json');
const save = () => { writeFileSync(reportPath + '.tmp', JSON.stringify(report, null, 2) + '\n'); renameSync(reportPath + '.tmp', reportPath); };
save();
for (const [index, target] of selected.entries()) {
  try {
    const result = await renderNoteCharacterCover(sourceRoot, target.input);
    const destination = join(outputRoot, target.imagePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination + '.tmp', result.buffer); renameSync(destination + '.tmp', destination);
    const { buffer, ...design } = result;
    report.targets.push({ ...target, design, outputSha256: hash(buffer), byteLength: buffer.length });
    report.generatedCount++;
    report.poseCounts[result.pose] = (report.poseCounts[result.pose] || 0) + 1;
  } catch (error) {
    report.errors.push({ key: target.key, error: error.message }); report.failedCount++;
    console.error(`[失敗] ${target.key}: ${error.message}`);
  }
  if ((index + 1) % 50 === 0) { save(); console.log(`対象${selected.length}件 / 処理${index + 1}件 / 生成${report.generatedCount}件 / 失敗${report.failedCount}件`); }
}
save();
console.log(JSON.stringify({ targetCount: report.targetCount, generatedCount: report.generatedCount, failedCount: report.failedCount,
  inventoryErrors: errors.length - report.failedCount, retired: retired.length, reportPath }));
if (report.failedCount || errors.length || report.generatedCount !== report.targetCount) process.exitCode = 1;
