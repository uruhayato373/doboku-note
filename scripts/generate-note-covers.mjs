#!/usr/bin/env node
// content/note 配下の各ディレクトリに img/cover*.png を生成する。
//
// note.com のカバー画像（推奨 1280×670）を、キャラクター（doboku-note 先生）＋太い日本語見出しの
// V5 デザインで出力する（2026-09-17〜。仕様 SSOT: .claude/knowledge/design-system/note-cover-character-v5.md）。
// 描画は scripts/lib/note-character-cover.mjs、対象一覧とポーズ割当は scripts/lib/note-cover-inventory.mjs に
// 集約してあり、generate-magazine-covers / generate-note-character-covers（独立出力先）と同じ入力・同じ
// ポーズ選択になる。1 dir だけ再生成しても全件生成と同じ画像が出る（旧 G2/V4 テンプレへは戻らない）。
//
// content/note 直下の記事（slug/article.md）と、マガジン配下の記事
// （magazines/{magazine}/{RXX}/article.md）の両方を対象とする。
// note-cover-supply.yml（CI）は check-note-cover-coverage --json の欠落 dir を本スクリプトへ 1 dir ずつ渡す。
//
// 使い方:
//   node scripts/generate-note-covers.mjs                   # 全件生成
//   node scripts/generate-note-covers.mjs 一般部門との違い      # 1件だけ生成（slug 部分一致）
//   node scripts/generate-note-covers.mjs 自治体道路担当         # マガジン配下も部分一致で対象化
//
// 成果物は PNG のみ（DN-0111 Phase 2・2026-08-21。cover*.svg は追跡に戻さない）。
// 終了コード: 0 = 全件生成 / 1 = 1 件以上失敗（失敗を exit 0 で握り潰さない・2026-08-18）

import { writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { renderNoteCharacterCover, resolveCoverExam } from './lib/note-character-cover.mjs';
import { loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
// note カバーの試験パレット（試験=色）の真実源
const COVER_TOKENS = require(join(ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'));

/**
 * dirName（content/note からの相対パス）のセグメントから試験 exam キーを解決する。
 * 例: "1級・2級土木/1級土木/magazines/.../安全管理" → "civil-1"（級サブdirで色を維持）。
 * 判定は resolveCoverExam（描画側と同一）。**未知 dir は throw する（2026-08-18）**——以前は
 * "pe-comprehensive" へ無言でフォールバックし、技術士一次が総監紺のまま出荷されていた。
 * check-note-cover-tokens.mjs がこの関数で tokens の網羅を検査する。
 */
export function resolveExam(dirName) {
  return resolveCoverExam(String(dirName), COVER_TOKENS);
}

async function main() {
  const target = process.argv.slice(2).find((a) => !a.startsWith('--')) || null;

  const inventory = await loadNoteCoverInventory(ROOT);
  const articles = inventory.targets.filter((t) => t.kind === 'article');
  // 記事 dir（content/note 相対）。check-note-cover-coverage の missing[].dir と完全一致する。
  const dirOf = (t) => dirname(t.source).slice('content/note/'.length);
  const allDirs = [...new Set(articles.map(dirOf))];

  let dirs;
  if (!target) {
    dirs = allDirs;
  } else if (allDirs.includes(target)) {
    dirs = [target];
  } else {
    // slug 部分一致での解決（例: "総監" → "総監択一式17年分分析"、
    // "自治体道路担当" → "magazines/総監模範論文-自治体道路担当/R03" 等）
    dirs = allDirs.filter((d) => d.includes(target));
    if (dirs.length === 0) {
      console.error(`no note article directory matches "${target}"`);
      process.exit(1);
    }
  }

  console.log(`Generating covers for ${dirs.length} draft(s)...`);
  const wanted = new Set(dirs);
  const failed = [];
  for (const t of articles) {
    if (!wanted.has(dirOf(t))) continue;
    try {
      const { buffer } = await renderNoteCharacterCover(ROOT, t.input);
      const destination = join(ROOT, t.imagePath);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination + '.tmp', buffer);
      renameSync(destination + '.tmp', destination);
      console.log(`  ok: ${t.imagePath.slice('content/note/'.length)}`);
    } catch (err) {
      console.error(`  error: ${t.source} → ${err.message}`);
      failed.push(t.source);
    }
  }
  console.log(`[generate-note-covers] ${dirs.length} 件を実処理 / 失敗 ${failed.length} 件`);
  if (failed.length) {
    console.error(`失敗した記事:${failed.map((x) => `\n  - ${x}`).join('')}`);
    process.exitCode = 1;
  }
}

// import 時に CLI を走らせない（check-note-cover-tokens が resolveExam だけを使うため）。
const isMain = process.argv[1] && process.argv[1].endsWith('generate-note-covers.mjs');
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
