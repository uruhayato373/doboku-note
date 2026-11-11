#!/usr/bin/env node
// SNS 投稿（content/sns/**）内の doboku-note.com/docs/{slug} リンクが
// 本番の正規 slug（src/config/doc-meta-index.json）に実在するかを検証する。
// 2026-08-22 の URL 移行後の新 URL（https://doboku-note.com/exam/... 等）は、public/_redirects の
// 転送先（＝記事の正規パス）と資格ハブに実在するかを見る（判定は scripts/lib/site-links.mjs）。
// /standards・/topics の独自ページは _redirects に載らないので件数だけ出して判定しない。
//
// 背景: SNS 投稿の URL を「ページのディレクトリ名」（例 primary-r03-kouki）だけで
// 組むと、本番ルートは「カテゴリ-ディレクトリ」のフラット slug
// （例 civil-construction-2-primary-r03-kouki）のため 404 になる。
// 2026-06 に X 投稿 149 件のリンク切れが発生（560+ impressions のロス）。
//
// 使い方:
//   node scripts/check-sns-urls.mjs            # content/sns 全体を検証
//   node scripts/check-sns-urls.mjs --staged   # git staged の content/sns + content/site mdx + content/note md（pre-commit 用）
//   node scripts/check-sns-urls.mjs --mdx      # MDX本文（content/site/**/*.mdx）の bare /docs/{slug} markdownリンクを検証
//   node scripts/check-sns-urls.mjs --note     # noteマガジン本文（content/note/**/*.md）の /docs/{slug} リンクを検証
// broken が 1 件でもあれば exit 1。各 broken に対し、一意に決まる正しい slug を提案する。
//
// 注（2026-06-09）: SNS は `doboku-note.com/docs/{slug}`、MDX本文は bare `/docs/{slug}` 形式で
// 内部リンクするため URL 正規表現をファイル別に分けている。MDX本文の slug 誤りは従来 pre-commit で
// 未検知だった（essay ガイドで実際に発生、旧slug 40件をクリーンアップ済み 2026-06-09）。
// 現在は `--staged`（pre-commit）が content/sns に加えて staged の content/site/*.mdx も検査する。
// `--mdx` は content/site 全体を手動/CI で一括検査する用途。
//
// 注（2026-06-10）: content/note/** の noteマガジン本文(.md)も未検証だった（BK-01道路の関連リンクが
// /docs/r0X-road=404 でpre-commitをすり抜けた）。content/note は bare URL（doboku-note.com/docs/{slug}）と
// markdownリンク（](/docs/{slug})）の両形式を使うため両正規表現を適用する。note.com プレースホルダーは
// どちらにも非マッチで自動スキップされる。`--staged` が staged の content/note/*.md も検査するよう拡張、
// 全件は `--note`。
//
// 注（2026-11-11）: note の原稿と、これから commit する SNS の原稿（--staged）に旧 `/docs/` の URL を書くことを禁止した
// （実在していても 1 件ずつ止める）。301 で転送はされるが、Google が旧 URL を正規ページに選び続ける原因になる
// （総監の 9 ページで実測・gsc-management.md 2026-11-11）。直すのは `npm run fix-legacy-site-links -- --write`（note の原稿を張り替える既存の道具・DN-0289）。
// SNS の既存の下書きは対象外: 予約済みの投稿は承認時の本文の hash を持ち、本文を変えると予約が止まる（DN-0288）。
// 投稿済みの記録（/published/）と `_` 接頭辞の保管庫も対象外。MDX 本文の相対 /docs は描画時に張り替えるので従来どおり許す。

import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readDocMetaIndex } from './lib/doc-meta-index.mjs';
import { classifySitePath, loadSiteRoutes, rewriteLegacySiteLinks, siteLinkRegex } from './lib/site-links.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { isLegacyPath } from './lib/legacy-routes.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { runBody, isCliEntry, runAsCli } from './lib/cli-run.mjs';

// in-process でも呼べるよう run() に包んである（DN-0688・pre-commit-dispatch が import して呼ぶ）。
// process.argv / process.exit / process.exitCode は runBody が渡す __argv / __exit / __status への読み替え。
// 本文は字下げしていない（複数行の文字列を壊さないため）。CLI として起動したときの引数・出力・終了コードは従来と同じ。
export async function run({ argv = process.argv.slice(2) } = {}) {
  return runBody(argv, import.meta.url, async ({ argv: __argv, exit: __exit, status: __status }) => {

const STAGED = __argv.includes('--staged');
const MDX = __argv.includes('--mdx');
const NOTE = __argv.includes('--note');
// 索引が無ければ生成してから検証する（以前は無いと黙って検証をスキップしていた＝検査ゼロの緑）
const valid = new Set(Object.keys(readDocMetaIndex().docs));

// dir はリポジトリからの相対。結果もリポジトリからの相対パス（/ 区切り）で返す
function walk(dir, re = /\.(md|txt|json)$/) {
  return listFiles(join(REPO_ROOT, dir), { match: (_p, name) => re.test(name), allowMissing: true, followLinks: true })
    .map((p) => relative(REPO_ROOT, p).split('\\').join('/'));
}

let files;
if (MDX) {
  // MDX本文の内部リンク（content/site/**/*.mdx）
  files = walk('content/site', /\.mdx$/);
} else if (NOTE) {
  // noteマガジン本文（content/note/**/*.md）
  files = walk('content/note', /\.md$/);
} else if (STAGED) {
  const staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  // SNS（content/sns の md/txt/json）＋ MDX本文（content/site の mdx）＋ noteマガジン本文（content/note の md）を staged から検査
  files = staged.filter((f) => existsSync(join(REPO_ROOT, f)) && (
    (f.startsWith('content/sns/') && /\.(md|txt|json)$/.test(f)) ||
    (f.startsWith('content/site/') && /\.mdx$/.test(f)) ||
    (f.startsWith('content/note/') && /\.md$/.test(f))
  ));
} else {
  files = walk('content/sns');
}

// ファイル別に URL 形式を切替:
//   SNS（content/sns）           = doboku-note.com/docs/{slug}（bare URL）
//   MDX本文（content/site）= bare /docs/{slug}（markdownリンク）
//   noteマガジン本文（content/note）= 両形式（bare URL + markdownリンク）
const RE_SNS = /doboku-note\.com\/docs\/([a-z0-9-]+)(?![a-z0-9-])/g;
const RE_MDX = /\]\(\/docs\/([a-z0-9-]+)\)/g;
const reListFor = (f) => {
  if (f.startsWith('content/note/')) return [RE_SNS, RE_MDX];
  if (MDX || f.startsWith('content/site/')) return [RE_MDX];
  return [RE_SNS];
};
const problems = [];
const routes = loadSiteRoutes();
const modern = { checked: 0, unverified: 0 };
// 新 URL（絶対 URL）を見るのは note・SNS だけ。MDX 本文は相対 /docs を描画時に張り替える。
const checksModern = (f) => !(MDX || f.startsWith('content/site/'));
// 旧 /docs の URL を禁止する原稿: note は全件、SNS はこれから commit する原稿（--staged）だけ。
// SNS の既存の下書きは予約済みの投稿が承認時の本文の hash を持ち、本文を変えると予約が止まる（check-x-utm の注・DN-0288）。
// 投稿済みの記録（/published/）と `_` 接頭辞の保管庫（凍結アカウントの隔離）は触らない
const isFrozen = (f) => /\/published\//.test(f) || f.split(/[\\/]/).some((seg) => seg.startsWith('_'));
const forbidsLegacy = (f) => checksModern(f) && !isFrozen(f) && (f.startsWith('content/note/') || STAGED);

for (const f of files) {
  const raw = readFileSync(join(REPO_ROOT, f), 'utf8');
  const lines = raw.split(/\r?\n/);
  const slugRes = reListFor(f);
  lines.forEach((line, i) => {
    if (forbidsLegacy(f)) {
      // 張り替え表は fix-legacy-site-links・note の同期（canonBodyHash）と同じ rewriteLegacySiteLinks。転送先が無いものは下の実在検査に任せる
      const { text, replaced } = rewriteLegacySiteLinks(line, routes);
      if (replaced) problems.push(`${f}:${i + 1}  旧 /docs の URL ${replaced} 件  → ${[...text.matchAll(siteLinkRegex())].map((m) => m[1]).filter((p) => !isLegacyPath(p)).join(' ')}`);
    }
    // テンプレ行（プレースホルダ変数）はスキップ: <year> / {年度} / ｛...｝
    if (/[<>{}｛｝]/.test(line)) return;
    for (const slugRe of slugRes) {
      let m;
      slugRe.lastIndex = 0;
      while ((m = slugRe.exec(line)) !== null) {
        const slug = m[1];
        if (valid.has(slug)) continue;
        const cand = [...valid].filter((k) => k === slug || k.endsWith('-' + slug));
        const hint = cand.length === 1 ? `→ ${cand[0]}` : cand.length > 1 ? `→ 曖昧: ${cand.join(' / ')}` : '→ 該当slugなし（名称要確認）';
        problems.push(`${f}:${i + 1}  /docs/${slug}  ${hint}`);
      }
    }
    if (!checksModern(f)) return;
    const siteRe = siteLinkRegex();
    let s;
    while ((s = siteRe.exec(line)) !== null) {
      const c = classifySitePath(s[1], routes);
      if (c.kind === 'legacy') continue; // 旧 /docs の実在は上の slug 検査が見る
      if (c.kind === 'unverified') { modern.unverified++; continue; }
      modern.checked++;
      if (c.kind === 'unknown') {
        const hint = c.suggestion ? `→ ${c.suggestion}` : '→ 該当 URL なし（打ち間違い・リンク切れの疑い）';
        problems.push(`${f}:${i + 1}  ${c.path}  ${hint}`);
      }
    }
  });
}
if (!routes.loaded && modern.checked > 0) {
  console.error('[check-sns-urls] ✗ 検査不成立: public/_redirects を読めず新 URL の実在を判定できない');
  __exit(2);
}

if (problems.length) {
  console.error(`[check-sns-urls] ✗ 本番に存在しない・旧 URL のサイトリンク ${problems.length} 件:`);
  for (const p of problems) console.error('  ' + p);
  console.error('\n対処: note・SNS のリンクは新 URL（https://doboku-note.com/exam/{資格}/{種別}/{slug}）で書く。note の原稿の旧 URL は npm run fix-legacy-site-links -- --write で張り替える。');
  console.error('旧 /docs/ は「カテゴリ-ディレクトリ」のフラット slug（例: pe-construction-r07-required）。MDX 本文は /docs/{slug} のまま');
  __exit(1);
}
console.log(`[check-sns-urls] ✓ ${files.length} ファイルの /docs/ リンクと新 URL ${modern.checked} 件は全て本番に実在（/standards・/topics の独自ページ ${modern.unverified} 件は未判定）`);
  });
}

if (isCliEntry(import.meta.url)) runAsCli(run);
