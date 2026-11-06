#!/usr/bin/env node
/**
 * content/sns の文書が指す動画・画像の素材が Drive の台帳にあるかを確かめる（外部通信なし）。
 * 素材を消すときに、残す動画が別の作品の素材を参照しているのを見落とさないため（2026-11-07）。
 * exit: 0 欠けなし / 1 欠けあり / 2 検査不成立（参照 0 件）
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDriveManifest } from './lib/drive-vault.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

/** 導入時に残っていた欠け。増えたら止める。0 まで減らす（DN-1038） */
const KNOWN_MISSING = 80;
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
  console.log(`check-media-references: 文書 ${files.length} / 参照 ${checked} / 欠け ${missing.length}`);
  if (missing.length > KNOWN_MISSING) for (const m of missing.slice(0, 20)) console.error(`  欠け: ${m.file} → ${m.path}`);
  if (checked === 0) process.exitCode = 2;
  else if (missing.length > KNOWN_MISSING) process.exitCode = 1;
}
