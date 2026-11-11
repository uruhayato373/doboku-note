#!/usr/bin/env node
// 制作担当が再利用前に実行するローカル検査。CIはDrive原本を持たないためquality-audit対象外。
//
// npm run youtube-shorts:restore -- --pack-dir <動画パック> — 全場面差し替え版の現在の動画SHAに対応するレシピ・全PNG・元動画・ASS・完成MP4を照合（--key で限定）。欠落素材は --restore でDriveから復元。既存SHA不一致・対象0件は停止。制作担当が再利用前に読むローカル検査、Drive依存のためquality-auditには登録しない。旧テンプレート再生成は差し替え版を停止する
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readJson } from './lib/json-io.mjs';
import { ensureLocalFromVault } from './lib/drive-vault.mjs';
import { currentImageReplacement, verifyImageReproduction } from './lib/video-image-reproduction.mjs';

const args = parseCliArgs({ 'pack-dir': { type: 'string' }, key: { type: 'string' }, restore: { type: 'boolean' } });
try {
  if (!args.packDir) throw new Error('--pack-dir が必要です。既定は検査のみ。欠落ファイルをDriveから戻す場合は --restore');
  const pack = resolve(REPO_ROOT, args.packDir);
  const pop = readJson(pack, 'pop-image.json');
  const targets = readJson(pack, 'youtube.json').shorts.filter(item => !args.key || item.key === args.key);
  if (!targets.length) throw new Error('対象0件: 検査不成立');
  let checked = 0;
  for (const item of targets) {
    const result = await verifyImageReproduction(REPO_ROOT, currentImageReplacement(pop, item), {
      restoreMissing: args.restore ? ensureLocalFromVault : undefined,
    });
    checked++;
    console.log(JSON.stringify(result));
  }
  console.log(`対象 ${targets.length}本 / 実検査 ${checked}本。全素材・完成動画のSHA一致。構図QA・外部反映はこの検査の対象外です`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
