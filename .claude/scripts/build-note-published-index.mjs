#!/usr/bin/env node
// content/note/**/article*.md の frontmatter から note 記事カタログを生成し、
// .claude/state/note-published.json に書く。**読み取り専用の生成物**で、正本は各記事の
// frontmatter（記事の値）と src/lib/note-magazines.ts（マガジンの値）。手で編集しない。
//
// - items       = noteUrl を持つ記事（＝note に出たことがある記事）。消費側は「items にある＝公開済み」と読む
// - unpublished = noteUrl の無い記事（下書き・未公開在庫）
// - magazines   = note-magazines.ts のマガジン一覧（id・題名・価格・公開状態・m キー）
// 記事の magazines は frontmatter の noteMagazine ラベルを note-magazine-membership.json の
// labels / packs で解いたマガジン id（dir 外収録の extras は記事に紐づかないので含めない）。
//
// 使い方:
//   node .claude/scripts/build-note-published-index.mjs          # 生成（中身が同じなら書かない）
//   node .claude/scripts/build-note-published-index.mjs --check  # 検査のみ（書き込みなし。生成物が古ければ exit 1）
//   node .claude/scripts/build-note-published-index.mjs --check --staged  # 加えて、作り直した生成物の stage 漏れも exit 1
// npm run refresh-indexes に含まれ、コミット漏れは check-generated-indexes（CI）が止める。
// --check --staged は pre-commit（scripts/pre-commit-ci-gates.mjs）も note の原稿を stage したときに回す。
// exit 0 = 成功 / 1 = contentType の無い公開記事あり・--check で生成物が古い / 2 = 検査不成立（記事 0 件）
//
// 他 note 記事を本文中で参照する時は、対象記事 frontmatter の noteUrl を
// 直書きする運用とする（slug → noteUrl の逆引きは本 JSON で行える）。

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname, relative, basename, sep } from 'node:path';
import matter from 'gray-matter';
import { listNoteArticleFiles, normalizeRepoPath } from '../../scripts/lib/note-content-type.mjs';
import { parseSoT } from '../../scripts/check-magazine-membership.mjs';
import { jsonMatches, writeJsonIfChanged } from '../../scripts/lib/write-generated.mjs';
import { readDataset } from '../../scripts/lib/dataset-io.mjs';
import { REPO_ROOT as ROOT } from '../../scripts/lib/repository-paths.mjs';

const OUT_PATH = join(ROOT, '.claude/state/note-published.json');

function extractH1(body) {
  const line = body.split('\n').find((l) => l.startsWith('# '));
  if (!line) return null;
  return line.replace(/^#\s+/, '').trim();
}

// notePublishedAt は未設定や "TBD" 等の不正値があり得るため、
// 無効な日付は null にフォールバックして集計をクラッシュさせない。
function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toPrice(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/[¥,円\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** noteMagazine ラベル → 収録されるマガジン id（1 ラベル→1 マガジン ＋ そのラベルを束ねるパック） */
export function magazineResolver(membership) {
  const labels = membership?.labels ?? {};
  const packs = membership?.packs ?? {};
  return (label) => {
    if (!label) return [];
    const ids = [];
    if (labels[label]) ids.push(labels[label]);
    for (const [id, pack] of Object.entries(packs)) if ((pack.labels ?? []).includes(label) && !ids.includes(id)) ids.push(id);
    return ids;
  };
}

/** 1 記事分の行（純関数・テストから使う） */
export function toItem({ slug, path, data, content, resolveMagazines }) {
  const parts = slug.split('/');
  const magazineIndex = parts.indexOf('magazines');
  const label = data.noteMagazine ? String(data.noteMagazine).trim() : null;
  return {
    slug,
    path,
    exam: parts[0] || null,
    ...(magazineIndex >= 0 ? { magazine: parts[magazineIndex + 1] || null } : {}),
    noteUrl: data.noteUrl || null,
    noteId: data.noteId || null,
    status: data.noteStatus || null,
    publishedAt: toDate(data.notePublishedAt),
    pricing: data.notePricing || null,
    price: toPrice(data.price),
    contentType: data.noteContentType || null,
    series: data.noteSeries || null,
    noteMagazine: label,
    magazines: resolveMagazines(label),
    utmCampaign: data.utmCampaign || null,
    title: extractH1(content) ?? (data.title ? String(data.title) : null),
  };
}

export function buildCatalog({ root = ROOT, files } = {}) {
  const noteDir = join(root, 'content/note');
  const membership = readDataset(root, 'config.note-magazine-membership');
  const resolveMagazines = magazineResolver(membership);
  const items = [];
  const unpublished = [];
  for (const file of files ?? listNoteArticleFiles(noteDir)) {
    const { data, content } = matter(readFileSync(file, 'utf-8'));
    const slug = normalizeRepoPath(relative(noteDir, dirname(file)));
    const path = normalizeRepoPath(relative(root, file));
    const item = toItem({ slug, path, data: data ?? {}, content, resolveMagazines });
    (item.noteUrl ? items : unpublished).push(item);
  }
  const byPath = (a, b) => a.path.localeCompare(b.path, 'ja');
  const magazines = Object.values(parseSoT(readFileSync(join(root, 'src/lib/note-magazines.ts'), 'utf8')))
    .map(({ id, key, title, price, published }) => ({ id, key, title, price, published }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { items: items.sort(byPath), unpublished: unpublished.sort(byPath), magazines };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const { items, unpublished, magazines } = buildCatalog();
  const scanned = items.length + unpublished.length;
  console.log(`[build-note-published-index] 記事 ${scanned} 件を走査 / 公開済み ${items.length} / 未公開 ${unpublished.length} / マガジン ${magazines.length}`);
  if (scanned === 0) {
    console.error('  ✗ 検査不成立: content/note に記事が 1 件も見つからない');
    process.exit(2);
  }
  const out = { version: 3, updatedAt: new Date().toISOString(), items, unpublished, magazines };
  const outRel = normalizeRepoPath(relative(ROOT, OUT_PATH));
  if (checkOnly) {
    // 原稿の題名・公開状態を変えて作り直しを忘れると develop の CI（generated-indexes）が赤くなる（2026-10-06 に 2 回）
    if (!jsonMatches(OUT_PATH, out, { volatileKeys: ['updatedAt'] })) {
      console.error(`  FAIL: ${outRel} が記事（frontmatter・H1）と食い違う（npm run build-note-catalog で作り直してコミットする）`);
      process.exitCode = 1;
    } else if (process.argv.includes('--staged') && spawnSync('git', ['diff', '--quiet', '--', outRel], { cwd: ROOT }).status !== 0) {
      // 作業ツリーのカタログは新しいが stage していない（pre-commit 用。commit される中身は index 側）
      console.error(`  FAIL: 作り直した ${outRel} が stage されていない（git add ${outRel}）`);
      process.exitCode = 1;
    } else {
      console.log(`  一致: ${outRel}`);
    }
  } else {
    const wrote = writeJsonIfChanged(OUT_PATH, out, { volatileKeys: ['updatedAt'] });
    console.log(`  ${wrote ? '出力' : '変更なし'}: ${outRel}`);
  }
  const noType = items.filter((item) => !item.contentType);
  if (noType.length) {
    console.error(`  FAIL: contentType のない公開記事が ${noType.length} 件あります`);
    for (const item of noType.slice(0, 10)) console.error(`    ${item.path}`);
    process.exit(1);
  }
}

if (process.argv[1] && basename(process.argv[1].split(sep).join('/')) === 'build-note-published-index.mjs') main();
