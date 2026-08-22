#!/usr/bin/env node
// SSOT データモジュールを「共通コンポーネントを介さず」直接消費している箇所を surface する。
//
// なぜ必要か: 2026-07 に **同じ型の事故が 3 回**起きた。いずれも
// 「共通機構があるのに、新しい面がそれを使わず独自実装した」もの:
//   1. docs サイドバーが resolveCurriculum を使わず career 記事が混入（49件中26件）
//   2. 同サイドバーが shortTitle/subtitle を使わずフル title を出して冗長化
//   3. /links の末尾が AuthorProfile を使わず運営者カードを独自マークアップで再実装（54行の重複）
// ルール自体は design-system.md に「共通プリミティブを使う」と書かれているが、
// 守られているかを見る機械が無かった。
//
// 検査の考え方: 「ページ（app/**/page.tsx）が SSOT データを直接 import している」を
// **共通コンポーネントを迂回しているサイン**として WARN する。禁止ではない——
// 正当なケースは allowlist に理由付きで登録する（登録を強いることで判断を残す）。
//
// 実行: node scripts/check-ssot-consumers.mjs [--json]
// 常に exit 0（非ブロッキング surfacer）。判断は人がする。

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WANT_JSON = process.argv.includes('--json');

/**
 * 監視対象の SSOT モジュールと、「本来使うべき共通コンポーネント」。
 * ページが直接 import していたら、まずこちらで済まないかを検討する。
 */
const WATCHED = [
  { module: '@/config/author', preferred: 'AuthorProfile / AuthorCard' },
  { module: '@/lib/note-magazines', preferred: 'MagazineCard / MagazineHeroCta / hub-cta' },
  { module: '@/lib/coconala-services', preferred: 'exam-key-bridge（pickCoconalaFor）' },
  { module: '@/lib/brain-products', preferred: 'exam-key-bridge（pickBrainFor）' },
];

/**
 * 直接消費が正当な箇所。**理由を書くことを必須にする**（後から読む人が判断を再現できるように）。
 * ここに足すときは「共通コンポーネントで代替できない理由」を書く。
 */
const ALLOWLIST = [
  {
    file: 'src/app/about/page.tsx',
    module: '@/config/author',
    reason: 'AuthorProfile を主表示に使ったうえで、SNS リンク等を個別に組む運営者紹介ページ本体',
  },
  {
    file: 'src/app/links/page.tsx',
    module: '@/config/author',
    reason: 'ヒーローのアバター・名乗り（AuthorProfile は末尾で別途使用）',
  },
  {
    file: 'src/app/docs/[...slug]/page.tsx',
    module: '@/lib/note-magazines',
    reason: 'magazinePlacement / topSlot の解決に生データが要る（描画は MagazineTopBanner 等に委譲）',
  },
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === 'page.tsx' || e === 'layout.tsx') out.push(p);
  }
  return out;
}

const pages = walk(join(ROOT, 'src/app'));
const findings = [];

for (const abs of pages) {
  const rel = relative(ROOT, abs).replace(/\\/g, '/');
  const src = readFileSync(abs, 'utf8');
  for (const { module, preferred } of WATCHED) {
    // import 文の中にモジュール指定があるか（コメント内の言及は拾わない）
    const re = new RegExp(`^import[^;]*from\\s+['"]${module.replace(/[/@]/g, '\\$&')}['"]`, 'm');
    if (!re.test(src)) continue;
    const allowed = ALLOWLIST.find((a) => a.file === rel && a.module === module);
    findings.push({ file: rel, module, preferred, allowed: Boolean(allowed), reason: allowed?.reason ?? null });
  }
}

const unlisted = findings.filter((f) => !f.allowed);

// allowlist が現実と乖離していないか（消えたファイル・不要になった登録）も見る
const stale = ALLOWLIST.filter(
  (a) => !findings.some((f) => f.file === a.file && f.module === a.module),
);

if (WANT_JSON) {
  console.log(JSON.stringify({ check: 'ssot-consumers', findings, unlisted, stale }, null, 2));
} else {
  if (unlisted.length === 0 && stale.length === 0) {
    console.log(
      `[check-ssot-consumers] ✓ ページからの SSOT 直接消費は ${findings.length} 件すべて allowlist 済み`,
    );
  }
  for (const f of unlisted) {
    console.log(`[check-ssot-consumers] WARN ${f.file} が ${f.module} を直接 import`);
    console.log(`  → まず ${f.preferred} で済まないか確認する。正当なら ALLOWLIST に理由付きで登録`);
  }
  for (const s of stale) {
    console.log(`[check-ssot-consumers] WARN allowlist が古い: ${s.file} は ${s.module} を使っていない → 登録を削除`);
  }
}
process.exit(0);
