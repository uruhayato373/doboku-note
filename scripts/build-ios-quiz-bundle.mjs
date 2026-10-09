#!/usr/bin/env node
/**
 * build-ios-quiz-bundle — iOS 択一アプリに同梱する問題データを書き出す（docs/products/07_iOS択一アプリ試作方針.md §4.2）。
 *
 *   node scripts/build-ios-quiz-bundle.mjs --app pe [--out <dir>] [--allow-removed <ID,...>]
 *
 * 1. scripts/build-quiz-data.mjs と同じ正規化で、アプリに入れる試験のデータセットを作る（Web の public/quiz は書かない）
 * 2. 本文・選択肢・解説の HTML が参照する記事画像（/posts/...）を R2 の公開ホストから取り、images/ に置いて参照を書き換える
 * 3. KaTeX の CSS と woff2 フォントを katex/ に置く（描画済みの数式 HTML を JavaScript なしで表示するため）
 * 4. 問題 ID を検査する。試験の中で重複していれば止める。前回の manifest.json から消えた ID があれば止める
 *    （アプリの学習履歴は「試験 + 問題 ID」に紐づくので、ID が消えると履歴が消える。意図して消すときだけ --allow-removed に並べる）
 *
 * 出力（既定 .tmp/ios-bundle/<app>/。iOS リポジトリの Resources を --out に渡す）:
 *   manifest.json・<試験>.json・images/・katex/
 * exit 0 = 書き出し成功 / exit 1 = ID 検査・画像取得の失敗、または対象 0 件
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { R2_PUBLIC_ORIGIN } from './lib/site-identity.mjs';
import { renderQuizMarkdown } from './lib/quiz-markdown.mjs';
import { SOURCES, buildDataset } from './build-quiz-data.mjs';

const NAME = 'build-ios-quiz-bundle';

/** アプリ（系統）ごとに収める試験。土木施工管理技士アプリ（civil-1・civil-2）は DN-0628 で足す */
export const APPS = {
  pe: { label: '技術士 過去問', exams: ['pe-first-stage', 'cem'] },
};

const IMG_SRC = /(<img\b[^>]*?\ssrc=")(\/posts\/[^"]+)(")/g;

/** HTML 中の記事画像の参照（/posts/...）を集める */
export function collectImageSrcs(html) {
  return [...String(html || '').matchAll(IMG_SRC)].map((m) => m[2]);
}

/** 記事画像の参照をアプリ内の相対パス（images/...）へ書き換える */
export function rewriteImageSrcs(html) {
  return String(html || '').replace(IMG_SRC, (_, a, src, b) => `${a}images/${src.slice('/posts/'.length)}${b}`);
}

/** 画像の参照のうち、同梱できない形（外部 URL など）を返す */
export function unsupportedImageSrcs(html) {
  return [...String(html || '').matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((src) => !src.startsWith('/posts/'));
}

/**
 * 問題 ID の検査（純関数）。datasets は [{ exam, questions: [{ id }] }]、previous は前回の manifest（無ければ null）。
 * 返り値: { duplicates: [{exam,id}], removed: [{exam,id}] }。allowRemoved に入っている「試験/ID」は removed から外す
 */
export function checkIds(datasets, previous, allowRemoved = []) {
  const duplicates = [];
  const removed = [];
  const allow = new Set(allowRemoved);
  for (const ds of datasets) {
    const seen = new Set();
    for (const q of ds.questions) {
      if (seen.has(q.id)) duplicates.push({ exam: ds.exam, id: q.id });
      seen.add(q.id);
    }
    const prev = previous?.exams?.find((e) => e.exam === ds.exam);
    for (const id of prev?.ids || []) {
      if (!seen.has(id) && !allow.has(`${ds.exam}/${id}`)) removed.push({ exam: ds.exam, id });
    }
  }
  for (const prev of previous?.exams || []) {
    if (datasets.some((ds) => ds.exam === prev.exam)) continue;
    for (const id of prev.ids || []) if (!allow.has(`${prev.exam}/${id}`)) removed.push({ exam: prev.exam, id });
  }
  return { duplicates, removed };
}

/** 1 問の表示用 HTML をそろえる（無ければ Markdown から作る）。画像の参照はアプリ内へ書き換える */
export function toBundleQuestion(q) {
  const html = (h, text) => rewriteImageSrcs(h ?? (text ? renderQuizMarkdown(text) : ''));
  return {
    ...q,
    bodyHtml: html(q.bodyHtml, q.body),
    options: q.options.map((o) => ({ ...o, html: html(o.html, o.text) })),
    explanations: q.explanations.map((e) => ({ ...e, html: html(e.html, e.text) })),
  };
}

function rawHtmlOf(q) {
  return [q.bodyHtml, ...q.options.map((o) => o.html), ...q.explanations.map((e) => e.html)].join('\n');
}

function fetchImage(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  const r = spawnSync('curl', ['-sSL', '--ssl-no-revoke', '--max-time', '60', '-o', tmp, '-w', '%{http_code}', `${R2_PUBLIC_ORIGIN}${src}`], { encoding: 'utf8' });
  const code = (r.stdout || '').trim();
  const ok = r.status === 0 && code === '200' && existsSync(tmp) && readFileSync(tmp).length > 0;
  if (ok) copyFileSync(tmp, dest);
  rmSync(tmp, { force: true });
  return ok ? null : `http=${code} rc=${r.status}`;
}

function gitHead() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function main() {
  const appId = argValue('--app');
  const app = APPS[appId];
  if (!app) {
    console.error(`[${NAME}] --app に ${Object.keys(APPS).join(' / ')} のどれかを渡す`);
    process.exit(1);
  }
  const out = resolve(argValue('--out') || join(REPO_ROOT, '.tmp', 'ios-bundle', appId));
  const allowRemoved = (argValue('--allow-removed') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const cacheDir = join(REPO_ROOT, '.tmp', 'ios-bundle-cache');

  const datasets = app.exams.map((exam) => {
    const source = SOURCES.find((s) => s.exam === exam);
    if (!source) throw new Error(`build-quiz-data の SOURCES に ${exam} が無い`);
    return buildDataset(source);
  });
  const total = datasets.reduce((n, ds) => n + ds.questions.length, 0);
  if (total === 0) {
    console.error(`[${NAME}] 対象 0 問（書き出し不成立）`);
    process.exit(1);
  }

  const manifestPath = join(out, 'manifest.json');
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
  const { duplicates, removed } = checkIds(datasets, previous, allowRemoved);
  const unsupported = datasets.flatMap((ds) => ds.questions.flatMap((q) => unsupportedImageSrcs(rawHtmlOf(q)).map((src) => `${ds.exam}/${q.id}: ${src}`)));
  if (duplicates.length || removed.length || unsupported.length) {
    for (const d of duplicates.slice(0, 10)) console.error(`  重複 ${d.exam}/${d.id}`);
    for (const d of removed.slice(0, 10)) console.error(`  前回から消えた ${d.exam}/${d.id}`);
    for (const u of unsupported.slice(0, 10)) console.error(`  同梱できない画像 ${u}`);
    console.error(`[${NAME}] 重複 ${duplicates.length} / 消えた ID ${removed.length} / 同梱できない画像 ${unsupported.length}。書き出さない`);
    process.exit(1);
  }

  // 画像（キャッシュに無いものだけ R2 から取る）
  const srcs = [...new Set(datasets.flatMap((ds) => ds.questions.flatMap((q) => collectImageSrcs(rawHtmlOf(q)))))].sort();
  const failures = [];
  let fetched = 0;
  for (const src of srcs) {
    const cached = join(cacheDir, src.slice('/posts/'.length));
    if (existsSync(cached)) continue;
    const err = fetchImage(src, cached);
    if (err) failures.push(`${src}: ${err}`);
    else fetched += 1;
  }
  if (failures.length) {
    for (const f of failures.slice(0, 10)) console.error(`  画像を取れない ${f}`);
    console.error(`[${NAME}] 画像 ${srcs.length} 件中 ${failures.length} 件を取れない。書き出さない`);
    process.exit(1);
  }

  // 書き出し（images/ と katex/ は作り直す）
  rmSync(join(out, 'images'), { recursive: true, force: true });
  rmSync(join(out, 'katex'), { recursive: true, force: true });
  for (const src of srcs) {
    const rel = src.slice('/posts/'.length);
    mkdirSync(dirname(join(out, 'images', rel)), { recursive: true });
    copyFileSync(join(cacheDir, rel), join(out, 'images', rel));
  }
  const require = createRequire(import.meta.url);
  const katexDist = join(dirname(require.resolve('katex/package.json')), 'dist');
  mkdirSync(join(out, 'katex', 'fonts'), { recursive: true });
  copyFileSync(join(katexDist, 'katex.min.css'), join(out, 'katex', 'katex.min.css'));
  const fonts = readdirSync(join(katexDist, 'fonts')).filter((f) => f.endsWith('.woff2'));
  for (const f of fonts) copyFileSync(join(katexDist, 'fonts', f), join(out, 'katex', 'fonts', f));

  const exams = [];
  for (const ds of datasets) {
    const file = `${ds.exam}.json`;
    writeFileSync(join(out, file), JSON.stringify({ ...ds, questions: ds.questions.map(toBundleQuestion) }) + '\n', 'utf8');
    exams.push({ exam: ds.exam, examLabel: ds.examLabel, file, questions: ds.questions.length, years: ds.years.length, ids: ds.questions.map((q) => q.id) });
  }
  const manifest = {
    schemaVersion: 1,
    app: appId,
    appLabel: app.label,
    generatedAt: new Date().toISOString(),
    sourceCommit: gitHead(),
    katexVersion: require('katex/package.json').version,
    images: srcs.length,
    exams,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  for (const e of exams) console.log(`[${NAME}] ${e.exam}: ${e.questions} 問 / ${e.years} 年度`);
  console.log(`[${NAME}] 画像 ${srcs.length} 件（新規取得 ${fetched}）・KaTeX フォント ${fonts.length} 件・ID 検査 ${total} 問（前回 manifest ${previous ? 'あり' : 'なし'}）-> ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
