#!/usr/bin/env node
/**
 * check-cta-density.mjs
 *
 * ビルド後の全静的 HTML（out 配下の .html）を走査し、1 ページあたりの収益要素
 * （note 有料 CTA / 転職アフィリ）の密度が design-system.md「収益要素の密度ルール」の
 * 上限を超えていないかを検査する。1 件でも超過すれば exit 1（CI を赤くする）。
 *
 * SSG（output: 'export'）なので静的 HTML から実 DOM 要素を抽出して検証できる。
 *
 * 1) note 押し出し密度（data-cta="note"）
 *    「ファーストビュー～本文中の能動的な note 押し出し」（footer 除く top/sidebar-sb/中間-mid）を
 *    ガードする。デザイン刷新で追加した サイドバー note 再掲・記事内中間 CTA の暴走回帰を検知。
 *
 * 2) アフィリ「1 ページ 1 ピクセル」（同一 a8mat の二重発火）
 *    A8 のインプレッション ピクセルは `<img src="…0.gif?a8mat=MAT" width="1" height="1">`。
 *    **同一ページで同じ MAT を 2 回以上 発火させない**のが規律（memory affiliate-slot-move-pixel /
 *    .claude/knowledge/reference/measurement-incidents.md）。異なる MAT（別プログラム）の併置は正当（カテゴリ
 *    hub の補完 2 案件など）なので、重複するのは「同一 MAT が 2+」のときだけ違反とする。
 *    注意: 素朴な substring カウント（`px.a8.net` や `0.gif` の出現数）は Next.js の RSC ペイロード
 *    （props の JSON 直列化）で ~2 倍に膨らむため使わない。**レンダリング済み `<img>` タグだけ**を
 *    パースして MAT を数える（RSC payload・href の px.a8.net/svt/ejp・banner の bgt は無視）。
 *
 * 閾値（design-system.md §8.5 と一致・変更時は両方更新）:
 *   - note スロット（footer 除く: top/sidebar -sb/中間 -mid） ≤ 3
 *   - note 要素の総数（footer 含む・暴走検知の緩い上限）        ≤ 30
 *   - 同一 a8mat のインプレッションピクセル                     ≤ 1 /ページ
 *
 * 対象外: 記事末尾 footer カード枚数（旗艦セールスハブは意図的に多数収録）。
 *
 * Usage: node scripts/check-cta-density.mjs [--json]
 */
import { writeSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const OUT_ROOT = path.join(root, 'out');
const asJson = process.argv.includes('--json');

const LIMITS = {
  noteNonFooter: 3,
  noteTotal: 30,
  sameMatPixel: 1,
};

// next export（output: 'export'）は正規 URL を `out/<route>.html` へ出力する。
// Pagefind の生成 HTML はサイトルートではないため除外する。
function walkHtml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'pagefind') out.push(...walkHtml(full));
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

/**
 * レンダリング済み `<img>` インプレッションピクセル（`…0.gif?a8mat=MAT`）から a8mat を抽出し、
 * 同一 MAT の出現回数を数える。RSC payload の JSON は `<img …>` タグでないため対象外＝二重計上しない。
 * 返り値: { MAT: 回数 } のマップ。
 */
function impressionMatCounts(html) {
  const counts = {};
  for (const m of html.matchAll(/<img[^>]*0\.gif\?a8mat=([^"&]+)[^>]*>/g)) {
    const mat = m[1];
    counts[mat] = (counts[mat] || 0) + 1;
  }
  return counts;
}

const files = walkHtml(OUT_ROOT);
if (files.length === 0) {
  const msg =
    'check-cta-density: out/ の HTML が空です。先に `npm run build` を実行してください（post-build gate）。';
  if (asJson) writeSync(1, JSON.stringify({ ok: false, reason: 'no-build', files: 0 }) + '\n');
  else console.error(msg);
  process.exit(1);
}

const violations = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const noteTotal = countCta(html, 'note');
  const noteNonFooter = countNonFooterNote(html);
  const rel = path.relative(OUT_ROOT, file).replace(/\.html$/, '');

  if (noteNonFooter > LIMITS.noteNonFooter)
    violations.push({ slug: rel, rule: 'note-non-footer', count: noteNonFooter, limit: LIMITS.noteNonFooter });
  if (noteTotal > LIMITS.noteTotal)
    violations.push({ slug: rel, rule: 'note-total', count: noteTotal, limit: LIMITS.noteTotal });

  // 同一 a8mat のインプレッションピクセルが 2 回以上発火していないか（1 ページ 1 ピクセル）。
  for (const [mat, n] of Object.entries(impressionMatCounts(html))) {
    if (n > LIMITS.sameMatPixel)
      violations.push({ slug: rel, rule: 'affiliate-pixel-dup', count: n, limit: LIMITS.sameMatPixel, mat });
  }
}

if (asJson) {
  writeSync(1, JSON.stringify({ ok: violations.length === 0, files: files.length, violations }, null, 2) + '\n');
} else if (violations.length === 0) {
  console.log(`[check-cta-density] ✓ ${files.length} ページの収益要素密度は全て閾値内`);
} else {
  console.error(`[check-cta-density] ✗ ${violations.length} 件の密度超過:`);
  for (const v of violations) {
    const suffix = v.mat ? `・a8mat=${v.mat}` : '';
    console.error(`  ${v.slug}: ${v.rule} = ${v.count}（上限 ${v.limit}${suffix}）`);
  }
}

process.exit(violations.length === 0 ? 0 : 1);
