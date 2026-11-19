#!/usr/bin/env node
/**
 * check-option-dup.mjs — 過去問 MDX の「重複選択肢」検出
 *
 * ○×組合せ・語句組合せ問題で 2 つ以上の選択肢が完全一致したら転記ミス確定
 * （実試験では同一選択肢は出ない）。視覚突合だけでは見落とすため、生成直後と
 * 公開前に必ず実行する機械ガード。2026-06-04 の技術士第一次試験 R元〜R7 整備で
 * 視覚突合済みの R5〜R7 でも 4 件、R元〜R4 で約 12 件の誤転記を検出した実績がある。
 *
 * 使い方:
 *   node .../scripts/check-option-dup.mjs <article.mdx> [<article.mdx> ...]
 *   出力なし＝重複なし。1 行でも出たら原典 PDF と照合して該当選択肢を訂正する。
 *
 * 判定: 各 H2 設問（## Ⅰ/Ⅱ/Ⅲ...）の <details> より前にある番号付き選択肢
 *       （`1. 〜`〜`5. 〜`）を空白除去で正規化し、同一文字列が複数番号に現れたら警告。
 */
import { readFileSync } from 'node:fs';

let hits = 0;
for (const f of process.argv.slice(2)) {
  const raw = readFileSync(f, 'utf-8');
  const tag = f.split('/').slice(-2)[0];
  for (const p of raw.split(/\n(?=## )/)) {
    const h = p.match(/^## ([ⅠⅡⅢ][^\n]*)/);
    if (!h) continue;
    const body = p.split('<details>')[0];
    const opts = [...body.matchAll(/^([1-5])\.\s+(.+?)\s*$/gm)].map(m => [m[1], m[2].trim()]);
    if (opts.length < 2) continue;
    const seen = {};
    for (const [n, t] of opts) {
      const key = t.replace(/\s+/g, '');
      (seen[key] = seen[key] || []).push(n);
    }
    for (const [k, ns] of Object.entries(seen)) {
      if (ns.length > 1) {
        hits++;
        console.log(`${tag} ${h[1].trim()}: 選択肢 ${ns.join(',')} が同一 → 誤転記疑い  「${k.slice(0, 40)}」`);
      }
    }
  }
}
if (!hits) console.log('OK: 重複選択肢なし');
process.exit(hits ? 1 : 0);
