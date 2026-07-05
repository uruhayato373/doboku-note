#!/usr/bin/env node
/**
 * check-cta-density.mjs
 *
 * ビルド後の静的 HTML（out/docs/**​/index.html）を走査し、1 ページあたりの収益要素
 * （note 有料 CTA / 転職アフィリ）の密度が design-system.md「収益要素の密度ルール」の
 * 上限を超えていないかを検査する。1 件でも超過すれば exit 1（CI を赤くする）。
 *
 * SSG（output: 'export'）なので静的 HTML の属性カウントで完全に検証できる。
 *   - data-cta="note" … note 有料マガジン CTA（冒頭 top / サイドバー -sb / 中間 -mid / 記事末尾）
 *
 * このゲートが守るのは「ファーストビュー～本文中の能動的な note 押し出し密度」
 * （footer 除く top/sidebar/mid スロット）。デザイン刷新で追加した サイドバー note 再掲・
 * 記事内中間 CTA が将来暴走しないための回帰ガード。
 *
 * 対象外（別системで担保）:
 *   - 転職アフィリのピクセル発火数 … PC サイドバー枠と モバイル記事末カードは同一 creative の
 *     レスポンシブ複製で、DOM 要素数は 1 ページ 2〜（見えるのは片方）になり静的カウントでは
 *     真のピクセル数を測れない。「1 ページ 1 ピクセル」は既存のアフィリ配線規律で担保する。
 *   - 記事末尾 footer カード枚数 … 旗艦セールスハブ（essay-exam-strategy 等）は意図的に多数収録する。
 *
 * 閾値（design-system.md §8.5 と一致・変更時は両方更新）:
 *   - note スロット（footer 除く: top/sidebar -sb/中間 -mid） ≤ 3
 *   - note 要素の総数（footer 含む・暴走検知の緩い上限）        ≤ 30
 *
 * Usage: node scripts/check-cta-density.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const OUT_DOCS = path.join(root, 'out', 'docs');
const asJson = process.argv.includes('--json');

const LIMITS = {
  noteNonFooter: 3,
  noteTotal: 30,
};

// next export（output: 'export'）は docs を `out/docs/<slug>.html` のフラット HTML で出力する
// （`<slug>/` ディレクトリは RSC ペイロードのため .html のみ拾う）。
function walkHtml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkHtml(full));
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** data-cta 属性値の出現回数を数える（単純属性カウント・SSG 静的 HTML 前提）。 */
function countCta(html, value) {
  const re = new RegExp(`data-cta="${value}"`, 'g');
  return (html.match(re) || []).length;
}

/** footer 集約でない note スロット（top/sidebar -sb/mid -mid）を data-cta-label で数える。 */
function countNonFooterNote(html) {
  const labels = [...html.matchAll(/data-cta="note"[^>]*data-cta-label="([^"]*)"/g)].map((m) => m[1]);
  return labels.filter((l) => /-sb$|-mid$|-top$/.test(l)).length;
}

const files = walkHtml(OUT_DOCS);
if (files.length === 0) {
  const msg =
    'check-cta-density: out/docs が空です。先に `npm run build` を実行してください（post-build gate）。';
  if (asJson) console.log(JSON.stringify({ ok: false, reason: 'no-build', files: 0 }));
  else console.error(msg);
  process.exit(1);
}

const violations = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const noteTotal = countCta(html, 'note');
  const noteNonFooter = countNonFooterNote(html);
  const rel = path.relative(OUT_DOCS, file).replace(/\.html$/, '');

  if (noteNonFooter > LIMITS.noteNonFooter)
    violations.push({ slug: rel, rule: 'note-non-footer', count: noteNonFooter, limit: LIMITS.noteNonFooter });
  if (noteTotal > LIMITS.noteTotal)
    violations.push({ slug: rel, rule: 'note-total', count: noteTotal, limit: LIMITS.noteTotal });
}

if (asJson) {
  console.log(JSON.stringify({ ok: violations.length === 0, files: files.length, violations }, null, 2));
} else if (violations.length === 0) {
  console.log(`[check-cta-density] ✓ ${files.length} ページの収益要素密度は全て閾値内`);
} else {
  console.error(`[check-cta-density] ✗ ${violations.length} 件の密度超過:`);
  for (const v of violations) {
    console.error(`  ${v.slug}: ${v.rule} = ${v.count}（上限 ${v.limit}）`);
  }
}

process.exit(violations.length === 0 ? 0 : 1);
