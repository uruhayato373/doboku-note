#!/usr/bin/env node
/**
 * check-note-price-consistency.mjs — note 単品価格のドリフト 再発防止ゲート
 * ---------------------------------------------------------------------------
 * 背景: 単品価格は「設計 doc の散文 / 記事 frontmatter / note ライブ」の3層に分散し、
 *   一括の値上げが一部の層・一部のマガジンにしか当たらない事故が繰り返し起きている。
 *
 *   - 2026-07-24: 完全攻略パック 104 本のうち 18 本だけ ¥500 のまま published
 *     （前日 ¥1,280→¥1,980 に値上げした直後、price 欄欠落の是正が古い doc の
 *      「¥500」を既定値として一律付与した）。
 *   - 2026-07-28: 建設部門 BK の frontmatter 116 本が live と不一致
 *     （b022a5872 が note-magazines.ts の表記だけを ¥500→¥780 に更新し、
 *      frontmatter の追随が BK-08〜11 で止まっていた）。
 *
 *   既存の check-note-structure は frontmatter↔live を突合するが、
 *   **両方とも同じ誤価格**なら原理的に検出できない（前者がまさにそれ）。
 *   本ガードは live を見ず、ソース内部の「揃っているべきものが揃っているか」だけを
 *   決定的に検査する（network 不要 → pre-commit / CI の両方で回せる）。
 *
 * 検査する2軸:
 *   L1 マガジン内一貫性   — 同一 noteMagazine の単品価格が複数種類に割れていないか
 *   L2 シリーズ内一貫性   — 同一シリーズ（magazines/ の親ディレクトリ）配下の
 *                          マガジン群で単品価格が割れていないか
 *
 *   意図的な価格差（序章 ¥100、エントリー版、級による差など）は allowlist で明示的に
 *   免除する。免除に理由を書かせることで「なぜこの価格差があるか」が記録として残る。
 *   allowlist: .claude/config/note-price-consistency.json
 *
 * 使い方:
 *   node scripts/check-note-price-consistency.mjs            # 全 note 記事を検査
 *   node scripts/check-note-price-consistency.mjs --staged   # 関連 staged がある時だけ（pre-commit 用）
 *   node scripts/check-note-price-consistency.mjs --json      # 機械可読
 * ---------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, statSync, existsSync, writeSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const BASE = 'content/note';
const CONFIG = '.claude/config/note-price-consistency.json';

const argv = process.argv.slice(2);
const staged = argv.includes('--staged');
const asJson = argv.includes('--json');

if (staged) {
  let changed = '';
  try {
    changed = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 });
  } catch { changed = ''; }
  const relevant = changed.split('\n').some((p) =>
    /^content\/note\/.*\/article(-[^/]+)?\.md$/.test(p.trim())
    || p.includes('src/lib/note-magazines.ts')
    || p.includes(CONFIG));
  if (!relevant) process.exit(0); // note 記事・価格 SoT に無関係な commit → スキップ
}

const cfg = existsSync(join(ROOT, CONFIG))
  ? JSON.parse(readFileSync(join(ROOT, CONFIG), 'utf-8'))
  : { allowMagazines: {}, allowSeries: {} };

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/^article(-[^/]+)?\.md$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const absBase = join(ROOT, BASE);
if (!existsSync(absBase)) {
  console.log('[check-note-price-consistency] content/note が無いためスキップ');
  process.exit(0);
}

// 記事を収集して (シリーズ, マガジン) ごとに価格を集計する。
const byMagazine = new Map(); // magazine -> Map(price -> [relPath])
const magazineSeries = new Map(); // magazine -> series
for (const file of walk(absBase)) {
  const src = readFileSync(file, 'utf-8');
  if (!/notePricing:\s*paid/.test(src)) continue;
  const priceRaw = (src.match(/^price:[ \t]*(\d+)/m) || [])[1];
  if (!priceRaw) continue; // price 欄欠落は check-note-structure / note-publish 側の担当
  const magazine = ((src.match(/^noteMagazine:[ \t]*(.+)$/m) || [])[1] || '')
    .trim().replace(/^["']|["']$/g, '');
  if (!magazine) continue; // マガジン非所属の単独 note は一貫性の対象外

  const rel = relative(ROOT, file).replace(/\\/g, '/');
  // シリーズ = magazines/ の1つ上（例: content/note/技術士建設部門）。無ければ記事の親。
  const m = rel.match(/^(content\/note\/[^/]+(?:\/[^/]+)?)\/magazines\//);
  const series = m ? m[1] : rel.split('/').slice(0, 3).join('/');

  magazineSeries.set(magazine, series);
  if (!byMagazine.has(magazine)) byMagazine.set(magazine, new Map());
  const pm = byMagazine.get(magazine);
  const price = Number(priceRaw);
  if (!pm.has(price)) pm.set(price, []);
  pm.get(price).push(rel);
}

const violations = [];

// --- L1: マガジン内一貫性 ---
for (const [magazine, pm] of byMagazine) {
  if (pm.size <= 1) continue;
  if (cfg.allowMagazines?.[magazine]) continue; // 意図的な差（理由つきで免除）
  const dist = [...pm.entries()].sort((a, b) => b[1].length - a[1].length);
  const [majorPrice] = dist[0];
  const minority = dist.slice(1);
  violations.push({
    level: 'L1',
    scope: magazine,
    detail: dist.map(([p, fs]) => `¥${p}×${fs.length}`).join(' / '),
    majority: majorPrice,
    samples: minority.flatMap(([, fs]) => fs).slice(0, 5),
  });
}

// --- L2: シリーズ内一貫性（opt-in）---
// シリーズ内の価格が揃っているべきかは商品設計次第（1級土木は学科¥580・経験記述¥1,980・
// 暗記¥980 とラインごとに違うのが正）。よって「全マガジン同一単品価格」と決めた
// シリーズだけを uniformSeries に宣言させ、その期待価格との一致を検査する。
for (const [series, spec] of Object.entries(cfg.uniformSeries || {})) {
  const expected = Number(spec.price);
  if (!expected) continue;
  const offenders = [];
  for (const [magazine, pm] of byMagazine) {
    if (magazineSeries.get(magazine) !== series) continue;
    for (const [price, files] of pm) {
      if (price !== expected) offenders.push({ magazine, price, files });
    }
  }
  if (!offenders.length) continue;
  const total = offenders.reduce((n, o) => n + o.files.length, 0);
  violations.push({
    level: 'L2',
    scope: `${series}（期待 ¥${expected} 統一）`,
    detail: `${total} 本が期待価格と不一致`,
    majority: expected,
    samples: offenders.map((o) => `${o.magazine}: ¥${o.price} × ${o.files.length}本`).slice(0, 12),
  });
}

const magCount = byMagazine.size;
if (asJson) {
  writeSync(1, JSON.stringify({ magazines: magCount, violations }, null, 2) + '\n');
  process.exit(violations.length ? 1 : 0);
}

if (violations.length) {
  console.error('[check-note-price-consistency] ✗ 単品価格が揃っていません:');
  for (const v of violations) {
    console.error(`\n  [${v.level}] ${v.scope}`);
    console.error(`     分布: ${v.detail}（多数派 ¥${v.majority}）`);
    for (const s of v.samples) console.error(`     - ${s}`);
  }
  console.error('\n対処: いずれかを行う。');
  console.error('  (a) 値上げ/値下げの当て漏れ → node scripts/note-price-sweep.mjs --dir <マガジンdir> --from <旧> --to <新> --commit');
  console.error('      ライブ側も別途 note-article-price-sweep.mjs で揃え、frontmatter と一致させる。');
  console.error(`  (b) 意図的な価格差 → ${CONFIG} の allowMagazines / allowSeries に理由つきで追記する。`);
  console.error('\n背景: 2026-07-24 完全攻略パック18本の値崩れ / 2026-07-28 建設部門116本の frontmatter 不一致。');
  console.error('  frontmatter↔live 突合（check-note-structure）は両方同じ誤価格だと検出できないため本ガードが要る。');
  process.exit(1);
}
console.log(`[check-note-price-consistency] ✓ 有料マガジン ${magCount} 件の単品価格はマガジン内・シリーズ内で一貫`);
