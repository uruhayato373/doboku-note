#!/usr/bin/env node
/**
 * update-ogp-srchash.mjs — OGP 画像の鮮度検知（DN-0156 系の土台）。
 *
 * 背景: content/site/ 配下の ogp.png（1,166 件）は 2026-08-29 に git 追跡から外し R2（asset-storage の
 * group: site-ogp-png）へ退避した。台帳は .claude/state/assets/manifest.json。退避後は記事の
 * `title` / `frontmatter.ogp.title` / `frontmatter.ogp.subtitle` を変更しても、R2 上の古い OGP 画像を
 * 検知する仕組みが無い（manifest にタイトル系フィールドが無いため）。本スクリプトは記事の
 * frontmatter から「OGP の見た目を左右する入力」だけを抽出した短いハッシュ（srcHash）を
 * manifest.entries[<ogp.png のrepo相対パス>].srcHash として記録・照合する。
 *
 * srcHash の入力（v1）:
 *   - title            : frontmatter.title
 *   - ogpTitle         : frontmatter.ogp?.title ?? null
 *   - ogpSubtitle      : frontmatter.ogp?.subtitle ?? null
 *   - templateInputs   : { template, category, tags }（下記「テンプレ解決について」を参照）
 *
 * テンプレ解決について（フォールバック採用の理由）:
 *   本来は ogp-create.mjs の resolveTemplate()/matchesRule()
 *   （.claude/skills/conversion/ogp-create/scripts/ogp-create.mjs:219-226, 205-217）が導く
 *   「実際に使われるテンプレ ID」を srcHash に含めたい。しかしこのロジックは独立したモジュールに
 *   切り出されておらず、ogp-create.mjs 自体を import すると末尾の `main().catch(...)`
 *   （同ファイル:428-431）が無条件に実行され、全 MDX の走査や `process.exit(1)`（同ファイル:383,
 *   424）を伴う副作用が発生する。副作用なしに再利用できないため、フォールバックとして
 *   resolveTemplate の「入力側」フロントマター（ogp.template / category / tags）をそのまま
 *   hash に含める。
 *   注意（既知の誤検知）: tags を含めるため、テンプレ選定に一切影響しないタグ編集だけでも
 *   srcHash が変わり stale 判定が出ることがある。現状 .claude/config/ogp/rules.json の
 *   rules は空配列（default: "mono-tag" 固定）で category/tags はテンプレ選定に無関係なので、
 *   この誤検知が「テンプレは変わっていないのに stale と出る」形で今は必ず顕在化する。
 *   rules が追加されテンプレ選定が category/tags に依存するようになれば、この誤差は縮む
 *   （それでも真の resolvedTemplateId とは一致しない可能性が残る点は変わらない）。
 *
 * なぜ 16 桁に切り詰めるか:
 *   scripts/lib/asset-storage.mjs の findSecrets（同ファイル:426-436）は「40 桁以上の 16 進文字列」
 *   を秘密情報として検出し check-asset-storage を赤落ちさせる（SECRET_PATTERNS の
 *   long-hex-secret: /\b[0-9a-f]{40,}\b/、同ファイル:420）。除外されるのは `sha256` フィールドだけ
 *   （同ファイル:430 `JSON.stringify({ ...e, sha256: undefined })`）なので、64 桁の sha256 を
 *   そのまま srcHash に入れると誤検知する。16 桁（64bit）に切り詰めて回避する
 *   （用途は記事単位の freshness 検知であり、暗号学的な完全性は不要）。
 *
 * Usage:
 *   node scripts/update-ogp-srchash.mjs --check [--json]
 *   node scripts/update-ogp-srchash.mjs --write --backfill
 *   node scripts/update-ogp-srchash.mjs --write --slugs-file <path>
 *
 * --check: published:true の全記事について、現在の frontmatter から計算した srcHash と
 *   manifest（group: site-ogp-png）に記録済みの srcHash を比較する。
 *   検査対象 0 件は exit 2（検査不成立。CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 *   stale または noHash が 1 件でもあれば exit 1、無ければ exit 0。
 * --write: 対象記事の srcHash を manifest へ書き込む（R2 credential 不要。manifest ファイルのみ触る）。
 *   --backfill は published 全記事が対象（初回の基線設定用）。
 *   --slugs-file は改行区切りの slug リストファイルで、該当エントリだけ更新する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';

import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { loadManifest, writeManifestAtomic } from './lib/asset-storage.mjs';

const POSTS_DIR = SITE_CONTENT_ROOT;
const categories = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'src', 'config', 'categories.json'), 'utf8'),
);

// ------------------------------------------------------------------ CLI

function parseArgs(argv) {
  const args = { check: false, write: false, json: false, backfill: false, slugsFile: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') args.check = true;
    else if (a === '--write') args.write = true;
    else if (a === '--json') args.json = true;
    else if (a === '--backfill') args.backfill = true;
    else if (a === '--slugs-file') args.slugsFile = argv[++i];
    else {
      console.error(`[update-ogp-srchash] 未知の引数: ${a}`);
      process.exitCode = 2;
      return args;
    }
  }
  return args;
}

// ------------------------------------------------------------------ MDX 走査
// findMdx / buildFullSlug / resolveOgpPath / isPublished は
// scripts/check-ogp-coverage.mjs:39-71 と同一ロジック（そちらも main 相当のトップレベル文が
// 無条件実行される非モジュールなので import せず複製する。ロジックを変えたら両方直すこと）。

function findMdx(dir, parts = []) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'img' || e.name === '.DS_Store') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findMdx(full, [...parts, e.name]));
    else if (e.name.endsWith('.mdx')) out.push({ full, parts, file: e.name });
  }
  return out;
}

function buildFullSlug(parts, file) {
  const base = file.replace(/\.mdx$/, '');
  return base === 'article' ? parts.join('-') : [...parts, base].join('-');
}

function resolveOgpPath(fullSlug) {
  const cat = categories.find((c) => fullSlug === c.slug || fullSlug.startsWith(`${c.slug}-`));
  if (!cat) return null;
  const localSlug = fullSlug.slice(cat.slug.length + 1);
  return localSlug
    ? path.join(POSTS_DIR, cat.slug, localSlug, 'ogp.png')
    : path.join(POSTS_DIR, cat.slug, 'ogp.png');
}

function isPublished(file) {
  const head = fs.readFileSync(file, 'utf8').slice(0, 3000);
  const m = head.match(/^published:\s*(\S+)/m);
  return Boolean(m) && m[1].replace(/["']/g, '').toLowerCase() === 'true';
}

function toRepoRel(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}

// ------------------------------------------------------------------ srcHash

/** オブジェクトを key でソートして JSON 化する（挿入順ではなく値だけでハッシュを決めるため）。 */
function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** frontmatter（gray-matter の data）から srcHash（16 桁）を計算する。ファイル冒頭のコメント参照。 */
function computeSrcHash(data) {
  const payload = {
    v: 1,
    title: data.title ?? null,
    ogpTitle: data.ogp?.title ?? null,
    ogpSubtitle: data.ogp?.subtitle ?? null,
    templateInputs: {
      template: data.ogp?.template ?? null,
      category: data.category ?? null,
      tags: data.tags ?? [],
    },
  };
  const full = createHash('sha256').update(canonicalStringify(payload)).digest('hex');
  return full.slice(0, 16);
}

// ------------------------------------------------------------------ 対象記事の解決

/** published:true の全記事を { slug, full, ogpRel } の配列で返す。categories.json 未登録は unknownCat へ。 */
function resolvePublishedTargets(allFiles) {
  const targets = [];
  const unknownCat = [];
  for (const f of allFiles) {
    if (!isPublished(f.full)) continue;
    const slug = buildFullSlug(f.parts, f.file);
    const ogpAbs = resolveOgpPath(slug);
    if (!ogpAbs) {
      unknownCat.push(slug);
      continue;
    }
    targets.push({ slug, full: f.full, ogpRel: toRepoRel(ogpAbs) });
  }
  return { targets, unknownCat };
}

// ------------------------------------------------------------------ --check

function runCheck(args) {
  const allFiles = findMdx(POSTS_DIR);
  const { targets, unknownCat } = resolvePublishedTargets(allFiles);
  const manifest = loadManifest();
  const entries = manifest.entries || {};

  let checked = 0;
  let fresh = 0;
  const stale = [];
  const noHash = [];
  const untracked = []; // manifest に site-ogp-png エントリが無い（未オフロード）。stale/noHash とは別扱い。

  for (const t of targets) {
    checked++;
    const { data } = matter(fs.readFileSync(t.full, 'utf8'));
    const computed = computeSrcHash(data);
    const entry = entries[t.ogpRel];
    if (!entry || entry.group !== 'site-ogp-png') {
      untracked.push({ slug: t.slug, ogp: t.ogpRel });
      continue;
    }
    if (entry.srcHash === undefined) {
      noHash.push({ slug: t.slug, ogp: t.ogpRel });
    } else if (entry.srcHash !== computed) {
      stale.push({ slug: t.slug, ogp: t.ogpRel });
    } else {
      fresh++;
    }
  }

  const result = { checked, fresh, stale, noHash, untracked, unknownCat };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[update-ogp-srchash] published:true ${checked} 件を検査`);
    console.log(
      `  fresh ${fresh} 件 / stale ${stale.length} 件 / noHash(未backfill) ${noHash.length} 件 / untracked(manifest未登録) ${untracked.length} 件`,
    );
    if (stale.length) {
      console.log('  [stale] frontmatter が変わったのに srcHash が古いまま:');
      stale.forEach((s) => console.log(`    - ${s.slug}  ->  ${s.ogp}`));
    }
    if (noHash.length) {
      console.log(`  [noHash] srcHash 未記録（${noHash.length} 件・--write --backfill で基線設定）`);
    }
    if (untracked.length) {
      console.log(`  [untracked] manifest に site-ogp-png エントリ無し（${untracked.length} 件）`);
    }
    if (unknownCat.length) {
      console.log(`  警告: categories.json 未登録で OGP 解決不可 ${unknownCat.length} 件`);
    }
  }

  // process.exit() は console.log の出力がパイプへ書き切られる前にプロセスを終了させることがあり、
  // --json をパイプで消費する呼び出し元（`node ... | jq` 等）で JSON が途中で切れる事故になる
  // （このスクリプトの開発中に実際に `node ... --check --json | python3 -c '...'` で再現した）。
  // ここでは process.exitCode を設定して自然終了させ、標準出力が flush されるのを待つ。
  if (checked === 0) {
    if (!args.json) console.error('[NG] 検査対象 0 件（検査不成立）。POSTS_DIR や published 判定を確認すること。');
    process.exitCode = 2;
    return;
  }
  process.exitCode = (stale.length > 0 || noHash.length > 0) ? 1 : 0;
}

// ------------------------------------------------------------------ --write

function runWrite(args) {
  if (args.backfill === Boolean(args.slugsFile)) {
    console.error('[update-ogp-srchash] --write は --backfill か --slugs-file <path> のどちらか一方が必要');
    process.exitCode = 2;
    return;
  }

  const allFiles = findMdx(POSTS_DIR);
  let targets;
  if (args.backfill) {
    targets = resolvePublishedTargets(allFiles).targets;
  } else {
    if (!fs.existsSync(args.slugsFile)) {
      console.error(`[update-ogp-srchash] --slugs-file が見つからない: ${args.slugsFile}`);
      process.exitCode = 2;
      return;
    }
    const slugs = fs.readFileSync(args.slugsFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
    const bySlug = new Map(allFiles.map((f) => [buildFullSlug(f.parts, f.file), f]));
    targets = [];
    const notFound = [];
    for (const slug of slugs) {
      const f = bySlug.get(slug);
      if (!f) {
        notFound.push(slug);
        continue;
      }
      const ogpAbs = resolveOgpPath(slug);
      if (!ogpAbs) {
        notFound.push(slug);
        continue;
      }
      targets.push({ slug, full: f.full, ogpRel: toRepoRel(ogpAbs) });
    }
    if (notFound.length) {
      console.error(`[update-ogp-srchash] slug を解決できなかった（MDX 不在 or categories.json 未登録）: ${notFound.length} 件`);
      notFound.forEach((s) => console.error(`  - ${s}`));
    }
  }

  if (targets.length === 0) {
    console.error('[update-ogp-srchash] 更新対象 0 件（検査不成立）');
    process.exitCode = 2;
    return;
  }

  const manifest = loadManifest();
  const entries = manifest.entries || {};
  let updated = 0;
  const skippedNoEntry = [];

  for (const t of targets) {
    const entry = entries[t.ogpRel];
    if (!entry || entry.group !== 'site-ogp-png') {
      skippedNoEntry.push({ slug: t.slug, ogp: t.ogpRel });
      continue;
    }
    const { data } = matter(fs.readFileSync(t.full, 'utf8'));
    entry.srcHash = computeSrcHash(data);
    updated++;
  }

  if (updated > 0) writeManifestAtomic(manifest);

  console.log(`[update-ogp-srchash] 対象 ${targets.length} 件 / 更新 ${updated} 件 / manifest未登録でスキップ ${skippedNoEntry.length} 件`);
  if (skippedNoEntry.length) {
    skippedNoEntry.forEach((s) => console.log(`  - skip(no manifest entry): ${s.slug} -> ${s.ogp}`));
  }
  process.exitCode = updated === 0 ? 1 : 0;
}

// ------------------------------------------------------------------ main

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.check && !args.write) {
    console.error('Usage: node scripts/update-ogp-srchash.mjs --check [--json] | --write (--backfill | --slugs-file <path>)');
    process.exitCode = 2;
    return;
  }
  if (args.check && args.write) {
    console.error('[update-ogp-srchash] --check と --write は同時指定不可');
    process.exitCode = 2;
    return;
  }
  if (args.check) runCheck(args);
  else runWrite(args);
}

main();
