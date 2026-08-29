#!/usr/bin/env node
/**
 * check-orphan-ogp.mjs
 *
 * `content/site/**` にある OGP 画像（`ogp.png` / `ogp.webp`）のうち、対応する記事 MDX が
 * どこにも存在しない「孤児 OGP」を検知する。1 件でもあれば exit 1（CI を赤くする）。
 * `check-ogp-coverage.mjs`（記事はあるが OGP が無い）の逆方向チェック。
 *
 * 背景:
 *   記事本文をステージング（Obsidian）へ引き上げたり非公開化で MDX を撤去しても、既に生成済みの
 *   ogp.png/ogp.webp が git 追跡下に取り残されることがある（例: reference-materials 5 記事＝
 *   コンテンツ復活プロジェクト paused 時の孤児）。孤児 OGP は doc-meta-index に載らず配信されない
 *   死に資産で、背景差替え時の一括再生成でも中身が無いため無意味に残り続ける。これを機械検知する。
 *
 * 孤児判定（誤検知回避のため二重シグナル。どちらも満たさなければ孤児）:
 *   1. OGP と同一ディレクトリに `.mdx` がある（Convention B: article.mdx と ogp.png が同居）
 *   2. いずれかの記事 slug の resolveOgpPath がその OGP ディレクトリを指す
 *      （Convention A: MDX は親に平置き・OGP は slug 子ディレクトリ）
 *   published:true / false は不問（下書きでも記事があれば正当）。「記事が全く無い」ものだけ孤児。
 *
 * ワークツリー孤児（上記）に加え、asset-storage の manifest（group: site-ogp-png）に登録されて
 * いるが対応する記事 MDX が無くなったエントリ（＝記事が削除されたのに退避台帳に残っている OGP）も
 * 「manifest 孤児」として別集計で報告する。ogp.png は R2 退避対象になったため、ワークツリー走査
 * だけでは untrack 後の孤児を検知できない。
 *
 * Usage:
 *   node scripts/check-orphan-ogp.mjs            # 検査のみ（孤児あれば exit 1）
 *   node scripts/check-orphan-ogp.mjs --json     # 機械可読出力
 *   node scripts/check-orphan-ogp.mjs --fix      # ワークツリー孤児 OGP を削除し空ディレクトリも除去
 *                                                 # （manifest エントリの削除はしない・退避システムの管轄）
 */
import { writeSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { loadManifest } from './lib/asset-storage.mjs';

const root = process.cwd();
const POSTS_DIR = SITE_CONTENT_ROOT;
const categories = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'config', 'categories.json'), 'utf8'),
);
const asJson = process.argv.includes('--json');
const doFix = process.argv.includes('--fix');

const OGP_NAMES = new Set(['ogp.png', 'ogp.webp']);

// 全 mdx を列挙（published 状態は不問）。check-ogp-coverage.mjs と同一の走査。
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

// 全 ogp.png / ogp.webp を列挙（img 配下は除外）。
function findOgp(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'img') continue;
      out.push(...findOgp(full));
    } else if (OGP_NAMES.has(e.name)) {
      out.push(full);
    }
  }
  return out;
}

// ogp-create.mjs の buildFullSlug と同一（article.mdx は dir 名を slug 化）。
function buildFullSlug(parts, file) {
  const base = file.replace(/\.mdx$/, '');
  return base === 'article' ? parts.join('-') : [...parts, base].join('-');
}

// getOgpImageUrl / resolveOutputPath と同一の slug→ogp.png ローカルパス解決。
function resolveOgpDir(fullSlug) {
  const cat = categories.find((c) => fullSlug === c.slug || fullSlug.startsWith(`${c.slug}-`));
  if (!cat) return null; // categories.json 未登録
  const localSlug = fullSlug.slice(cat.slug.length + 1);
  return localSlug ? path.join(POSTS_DIR, cat.slug, localSlug) : path.join(POSTS_DIR, cat.slug);
}

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/');
}

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`[check-orphan-ogp] posts dir 不在: ${POSTS_DIR}`);
  process.exit(2);
}

const mdxFiles = findMdx(POSTS_DIR);

// シグナル1: MDX が同居するディレクトリ。
const dirsWithMdx = new Set(mdxFiles.map((f) => path.dirname(f.full)));
// シグナル2: 各 slug が指す正規 OGP ディレクトリ。
const resolvedOgpDirs = new Set(
  mdxFiles
    .map((f) => resolveOgpDir(buildFullSlug(f.parts, f.file)))
    .filter(Boolean),
);

const ogpFiles = findOgp(POSTS_DIR);
const orphans = ogpFiles.filter((f) => {
  const dir = path.dirname(f);
  return !dirsWithMdx.has(dir) && !resolvedOgpDirs.has(dir);
});

// manifest 孤児: asset-storage manifest（group: site-ogp-png）に登録されているが
// 記事 MDX が無くなったディレクトリを指すエントリ。ワークツリーに実体が無くても検知できる。
const SITE_KEY_PREFIX = 'content/site/';
function manifestKeyToDir(key) {
  if (!key.startsWith(SITE_KEY_PREFIX)) return null;
  const parts = key.slice(SITE_KEY_PREFIX.length).split('/');
  parts.pop(); // ファイル名を除く
  return parts.length ? path.join(POSTS_DIR, ...parts) : POSTS_DIR;
}
const manifestEntries = loadManifest().entries || {};
const manifestOgpKeys = Object.keys(manifestEntries).filter(
  (key) => manifestEntries[key].group === 'site-ogp-png',
);
const manifestOrphans = manifestOgpKeys.filter((key) => {
  const dir = manifestKeyToDir(key);
  return dir && !dirsWithMdx.has(dir) && !resolvedOgpDirs.has(dir);
});

if (doFix) {
  const removedDirs = new Set();
  if (orphans.length) {
    for (const f of orphans) fs.rmSync(f);
    // 孤児のみになって空になったディレクトリを掃除（上位へ辿る）。
    for (const f of orphans) {
      let dir = path.dirname(f);
      while (dir.startsWith(POSTS_DIR) && dir !== POSTS_DIR) {
        if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
          fs.rmdirSync(dir);
          removedDirs.add(dir);
          dir = path.dirname(dir);
        } else break;
      }
    }
  }
  if (!asJson) {
    console.log(`[check-orphan-ogp] --fix: ワークツリー孤児 OGP ${orphans.length} ファイルを削除`);
    orphans.forEach((f) => console.log(`  - ${rel(f)}`));
    if (removedDirs.size) {
      console.log(`  空ディレクトリ ${removedDirs.size} 件も除去`);
    }
    if (orphans.length) {
      console.log('  → git add で削除をステージし commit（main push で r2-sync が R2 反映）');
    }
    if (manifestOrphans.length) {
      console.log(
        `\n[check-orphan-ogp] manifest 孤児 ${manifestOrphans.length} 件は --fix の対象外（manifest 編集は退避システムの管轄）:`,
      );
      manifestOrphans.forEach((k) => console.log(`  - ${k}`));
      console.log(
        '  → 記事を復活させないなら .claude/state/assets/manifest.json から該当エントリを手動で削除すること',
      );
    }
  } else {
    writeSync(
      1,
      JSON.stringify(
        { fixed: orphans.map(rel), removedDirs: [...removedDirs].map(rel), manifestOrphansUnfixed: manifestOrphans },
        null,
        2,
      ) + '\n',
    );
  }
  process.exit(0);
}

if (asJson) {
  console.log(JSON.stringify({ scanned: ogpFiles.length, orphans: orphans.map(rel), manifestOrphans }, null, 2));
} else {
  console.log(`[check-orphan-ogp] OGP ${ogpFiles.length} ファイルを検査（記事 ${mdxFiles.length} 本）`);
  console.log(`  ワークツリー孤児 ${orphans.length} 件 / manifest孤児 ${manifestOrphans.length} 件`);
}

if (orphans.length || manifestOrphans.length) {
  if (!asJson) {
    if (orphans.length) {
      console.error(`\n[NG] 記事 MDX の無い孤児 OGP（ワークツリー）: ${orphans.length} ファイル`);
      orphans.forEach((f) => console.error(`  - ${rel(f)}`));
      console.error(
        '\n対応: 記事を書く予定が無ければ `npm run check-orphan-ogp -- --fix` で削除して commit。',
      );
      console.error('（記事を復活させる場合は MDX を配置し `npm run ogp -- <slug> --force` で再生成）');
    }
    if (manifestOrphans.length) {
      console.error(`\n[NG] 記事 MDX の無い孤児 OGP（manifest 登録のみ）: ${manifestOrphans.length} 件`);
      manifestOrphans.forEach((k) => console.error(`  - ${k}`));
      console.error(
        '\n対応: .claude/state/assets/manifest.json から該当エントリを手動で削除する'
        + '（本スクリプトの --fix はワークツリーのみが対象で manifest は自動修正しない）。',
      );
    }
  }
  process.exit(1);
}

if (!asJson) console.log('[OK] 孤児 OGP なし（ワークツリー・manifest とも）');
