/**
 * check-ogp-line-count.mjs — OGP タイトルが何行に折れるかを実測する surfacer。
 *
 * 背景: `check-ogp-title-fit` はフォントサイズ（56px 以上）しか見ておらず、
 *   **何行に折れるか**を誰も測っていなかった。そのため backlog の DN-0057 は
 *   「残り 5 件」のまま放置され、2026-08-18 に実測したら **121 件**あった（24 倍）。
 *   数字が実態からずれた台帳は、優先度の判断を丸ごと誤らせる。
 *
 * これは**判定しない surfacer**（常に exit 0）。何行までを許容するかはデザイン判断で、
 * 機械が決められない（3 行が悪いとは限らず、9 行は明らかに悪い）。
 * 対処は frontmatter へ `ogp.title` を入れて明示的に折る → `npm run ogp -- <slug> --force`。
 *
 * Usage:
 *   node scripts/check-ogp-line-count.mjs                全量（既定しきい値 3 行以上）
 *   node scripts/check-ogp-line-count.mjs --min 5        5 行以上だけ出す
 *   node scripts/check-ogp-line-count.mjs --json         機械可読
 *
 * exit: 0（常に）/ 2 検査不成立（wrap を 1 件も測れない）
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const toPosix = (v) => v.split(sep).join('/');
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const MIN = Number(argv[argv.indexOf('--min') + 1]) || 3;
// --max=N: 既定は surfacer（常に exit 0）だが、N を渡したときだけ「N 件を超えたら赤」の
// **完了判定**になる。backlog の [検証:] が surfacer を指していると、そのカードは永久に
// 完了と判定できない（DN-0020）。バーンダウンの終点を指せる口をここに用意する。
const MAX = argv.some((a2) => a2.startsWith('--max'))
  ? Number((argv.find((a2) => a2.startsWith('--max=')) || '').split('=')[1] ?? argv[argv.indexOf('--max') + 1])
  : null;

/** `ogp-create --debug-wrap` の出力から slug → 行数を採る（描画と同じ wrap 実装を使う）。 */
export function parseDebugWrap(text) {
  const out = new Map();
  let slug = null;
  for (const line of text.split('\n')) {
    if (/^\S/.test(line) && !line.startsWith('[ogp-create]')) { slug = line.trim(); continue; }
    const m = line.match(/^\s+lines: \[(.*)\]$/);
    if (m && slug) out.set(slug, (m[1].match(/"/g) ?? []).length / 2);
  }
  return out;
}

/** MDX の frontmatter に `ogp:` ブロックがあるか（＝明示的に折ってあるか）。 */
export function hasExplicitOgp(source) {
  const fm = source.split('---')[1] ?? '';
  return /^\s*ogp:/m.test(fm);
}

function main() {
  const raw = execFileSync(
    'node',
    ['.claude/skills/conversion/ogp-create/scripts/ogp-create.mjs', '--all', '--debug-wrap'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const wraps = parseDebugWrap(raw);
  if (wraps.size === 0) {
    console.error('✗ 検査不成立: wrap 結果を 1 件も取れなかった（--debug-wrap の出力形式が変わった疑い）');
    process.exit(2);
  }

  const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', 'content/site'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  }).split('\0').filter((f) => f.endsWith('.mdx'));

  const bySlug = new Map();
  for (const f of files) {
    const parts = toPosix(f).slice('content/site/'.length).replace(/\.mdx$/, '').split('/');
    bySlug.set((parts.at(-1) === 'article' ? parts.slice(0, -1) : parts).join('-'), f);
  }

  const rows = [];
  for (const [slug, lines] of wraps) {
    if (lines < MIN) continue;
    const file = bySlug.get(slug);
    if (!file) continue;
    if (hasExplicitOgp(readFileSync(join(ROOT, file), 'utf8'))) continue;
    rows.push({ slug, lines, file: toPosix(file) });
  }
  rows.sort((a, b) => b.lines - a.lines || a.slug.localeCompare(b.slug));

  if (JSON_OUT) { console.log(JSON.stringify({ measured: wraps.size, threshold: MIN, rows }, null, 2)); return; }

  const dist = {};
  for (const r of rows) dist[r.lines] = (dist[r.lines] ?? 0) + 1;
  console.log(
    `[check-ogp-line-count] OGP ${wraps.size} 件を実測 / ${MIN} 行以上かつ ogp.title 未設定: ${rows.length} 件`,
  );
  console.log(`  行数分布: ${Object.entries(dist).sort((a, b) => b[0] - a[0]).map(([k, v]) => `${k}行:${v}`).join(' / ')}`);
  for (const r of rows.slice(0, 15)) console.log(`  ${String(r.lines).padStart(2)}行  ${r.slug}`);
  if (rows.length > 15) console.log(`  … 他 ${rows.length - 15} 件`);
  console.log('\n対処: frontmatter に ogp.title を入れて明示的に折る → npm run ogp -- <slug> --force');
  if (MAX === null) {
    console.log('本スクリプトは判定しない（何行までを許容するかはデザイン判断）。--max=N で完了判定にできる');
    return;
  }
  if (!Number.isFinite(MAX)) {
    console.error('[check-ogp-line-count] FAIL — --max の値が数値でない');
    process.exitCode = 2;
    return;
  }
  if (rows.length > MAX) {
    console.error(`[check-ogp-line-count] FAIL — 許容 ${MAX} 件に対し ${rows.length} 件`);
    process.exitCode = 1;
  } else {
    console.log(`[check-ogp-line-count] OK — 許容 ${MAX} 件以内（${rows.length} 件）`);
  }
}

if (process.argv[1] && toPosix(process.argv[1]).endsWith('check-ogp-line-count.mjs')) main();
