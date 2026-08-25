#!/usr/bin/env node
// asset-inbox-ingest.mjs — inbox tarball の中身を検証してワークツリーへ配置する（CI 側）。
//
// asset-inbox-push.mjs が作った release を .github/workflows/asset-inbox.yml が落とし、
// このスクリプトが「置いてよいか」を 1 件ずつ判定してから配置する。R2 へは触らない
// （upload は既存 asset-offload.mjs の担当）。
//
// なぜ tar へ直接展開しないか:
//   tarball は**リポジトリ外で作られた入力**なので、中身を信用して展開すると
//   `.github/workflows/*.yml` や `scripts/*.mjs` を差し替えられる。CI には R2 credential が
//   あるので、そこを踏まれると鍵ごと持っていかれる。展開先を限定する検証を必ず通す。
//
// 検証（1 つでも落ちたら exit 1・**部分適用しない**）:
//   1. パスが絶対でない・`..` を含まない
//   2. asset-storage.json の group に該当する（＝退避対象のパスだけ通す）
//   3. inbox.json に載っている（勝手に増えたファイルを通さない）
//   4. sha256 が inbox.json と一致する
//   5. 展開物と inbox.json の件数が一致する（過不足を黙って呑まない）
//
// 使い方:
//   node scripts/asset-inbox-ingest.mjs --unpacked <dir> --meta <inbox.json>
//
// 出力: GITHUB_OUTPUT へ groups（空白区切り）と count。
// exit 0 = 全件配置 / exit 1 = 検証失敗・対象ゼロ

import { createReadStream, existsSync, readFileSync, mkdirSync, copyFileSync, statSync, appendFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, isAbsolute, relative } from 'node:path';
import { loadConfig, groupFor, toPosix } from './lib/asset-storage.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const val = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const UNPACKED = val('--unpacked');
const META = val('--meta');
const NAME = 'asset-inbox-ingest';

function sha256(abs) {
  return new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(abs).on('data', (c) => h.update(c)).on('end', () => res(h.digest('hex'))).on('error', rej);
  });
}

/** 展開ディレクトリ配下の全ファイルを repo 相対っぽいパスで列挙する。 */
function walk(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else if (e.isFile()) out.push(toPosix(relative(base, p)));
  }
  return out;
}

async function main() {
  if (!UNPACKED || !META) {
    console.error(`[${NAME}] --unpacked <dir> --meta <inbox.json> が要る`);
    process.exit(1);
  }
  if (!existsSync(UNPACKED) || !existsSync(META)) {
    console.error(`[${NAME}] FAIL: 展開ディレクトリか inbox.json が無い`);
    process.exit(1);
  }

  const cfg = loadConfig();
  const meta = JSON.parse(readFileSync(META, 'utf8'));
  const declared = new Map((meta.files || []).map((f) => [toPosix(f.path), f]));
  const found = walk(UNPACKED);

  console.log(`[${NAME}] inbox.json 宣言 ${declared.size} 件 / 展開物 ${found.length} 件`);

  const problems = [];
  const ok = [];

  for (const rel of found) {
    const d = declared.get(rel);
    if (isAbsolute(rel) || rel.split('/').includes('..')) {
      problems.push(`パスが不正（絶対 or ..）: ${rel}`); continue;
    }
    if (!d) {
      problems.push(`inbox.json に無いファイルが含まれている: ${rel}`); continue;
    }
    const g = groupFor(rel, cfg);
    if (!g) {
      problems.push(`退避 group に該当しないパス（配置を拒否）: ${rel}`); continue;
    }
    if (g.id !== d.group) {
      problems.push(`group が宣言と違う: ${rel}（宣言 ${d.group} / 実判定 ${g.id}）`); continue;
    }
    const abs = join(UNPACKED, rel);
    const sha = await sha256(abs);
    if (sha !== d.sha256) {
      problems.push(`sha256 不一致: ${rel}（宣言 ${d.sha256.slice(0, 12)}… / 実体 ${sha.slice(0, 12)}…）`); continue;
    }
    ok.push({ rel, abs, group: g.id, bytes: statSync(abs).size });
  }

  // 宣言されているのに展開物に無いもの（欠落）も検出する。
  for (const rel of declared.keys()) {
    if (!found.includes(rel)) problems.push(`inbox.json にあるのに展開物に無い: ${rel}`);
  }

  if (problems.length) {
    console.error(`[${NAME}] FAIL: 検証に落ちた ${problems.length} 件（**1 件でも落ちたら配置しない**）`);
    for (const p of problems.slice(0, 30)) console.error('  - ' + p);
    if (problems.length > 30) console.error(`  …ほか ${problems.length - 30} 件`);
    process.exit(1);
  }
  if (ok.length === 0) {
    console.error(`[${NAME}] FAIL: 配置対象が 0 件。空の inbox を「取り込んだ」と読ませない。`);
    process.exit(1);
  }

  for (const f of ok) {
    const dest = join(REPO_ROOT, f.rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(f.abs, dest);
  }

  const groups = [...new Set(ok.map((f) => f.group))];
  console.log(`[${NAME}] ✓ ${ok.length} 件を配置（group: ${groups.join(', ')}）`);
  for (const f of ok.slice(0, 20)) console.log(`    ${f.rel}`);
  if (ok.length > 20) console.log(`    …ほか ${ok.length - 20} 件`);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `groups=${groups.join(' ')}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `count=${ok.length}\n`);
  }
}

main().catch((e) => {
  console.error(`[${NAME}] FAIL: ${e.message}`);
  process.exit(1);
});
