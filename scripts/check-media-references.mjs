#!/usr/bin/env node
/**
 * content/sns の文書が指す動画・画像の素材が Drive の台帳にあるかを確かめる（外部通信なし）。
 * 素材を消すときに、残す動画が別の作品の素材を参照しているのを見落とさないため（2026-11-07）。
 * 取り戻せないと確かめた素材は .claude/state/assets/media-lost.json（state.media-lost）に理由つきで記録し、それ以外の欠けを止める
 * （2026-11-13・DN-1038。以前は件数の上限 80 で止めていた）。記録にあるのに台帳へ戻ったものは「記録から外せる」と出す。
 * exit: 0 欠けなし / 1 記録に無い欠けがある / 2 検査不成立（参照 0 件）
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDriveManifest } from './lib/drive-vault.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { readDatasetIf } from './lib/dataset-io.mjs';
const TEXT = /\.(json|md|txt)$/;
const MEDIA = /\.tmp\/media\/[a-z0-9_-]+\/[^"'\s`)<>]+\.[0-9a-f]{8}\.[a-z0-9]+/g;

/** 文書の中の素材の参照を、台帳に無いものだけ返す */
export function missingMedia(files, entries) {
  const missing = [];
  let checked = 0;
  for (const { file, text } of files) {
    for (const path of new Set(text.match(MEDIA) ?? [])) {
      checked += 1;
      if (!entries[path]) missing.push({ file, path });
    }
  }
  return { checked, missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const listed = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'content/sns'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter((f) => TEXT.test(f));
  const files = listed.map((file) => ({ file, text: readFileSync(join(REPO_ROOT, file), 'utf8') }));
  const { checked, missing } = missingMedia(files, loadDriveManifest().entries);
  const lost = readDatasetIf(REPO_ROOT, 'state.media-lost')?.lost ?? [];
  const recorded = new Set(lost.map((row) => `${row.path}|${row.referencedBy}`));
  const unrecorded = missing.filter((m) => !recorded.has(`${m.path}|${m.file}`));
  const missingKeys = new Set(missing.map((m) => `${m.path}|${m.file}`));
  const recovered = lost.filter((row) => !missingKeys.has(`${row.path}|${row.referencedBy}`));
  console.log(`check-media-references: 文書 ${files.length} / 参照 ${checked} / 欠け ${missing.length}（失われたと記録済み ${missing.length - unrecorded.length}・記録に無い ${unrecorded.length}）`);
  for (const m of unrecorded.slice(0, 20)) console.error(`  欠け: ${m.file} → ${m.path}（Drive へ登録するか、取り戻せないなら state.media-lost に理由を書く）`);
  if (recovered.length) console.log(`  記録から外せる（台帳に戻った・参照が消えた）: ${recovered.length} 件 — 例 ${recovered[0].path}`);
  if (checked === 0) process.exitCode = 2;
  else if (unrecorded.length) process.exitCode = 1;
}
