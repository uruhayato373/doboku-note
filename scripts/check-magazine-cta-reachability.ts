#!/usr/bin/env tsx
/**
 * check-magazine-cta-reachability.ts
 * ---------------------------------------------------------------------------
 * 「公開した note マガジンが、サイトのどこかで CTA として実際に出るか」を機械検査する。
 *
 * 背景（2026-07-31）: コンクリート診断士のマガジンを `published: true` にしても CTA が
 * 1 面も出なかった。配線（magazine-placement.ts）は生きていたのに、
 *   - `placement.sidebar` は 2026-07 の CTA 統一以降どこからも参照されない（死に配線）
 *   - `placement.inline` は中間 CTA 経由で **h2>=5 かつ本文 8,000 字** が条件
 *   - もくじタイル（resolveHubCta）は **HUB 資格のみ**（concrete 系・一次・reference は null）
 * が重なり、published にした瞬間に発火するという handoff の前提が崩れていた。
 * 収益商品を公開したのに導線ゼロという事故は静かに起きるので、機械で止める。
 *
 * 到達手段（いずれか 1 つでも成立すれば OK）:
 *   1. placement.top … 配線があれば無条件で出る
 *   2. placement.inline … 対象記事が中間 CTA の発火条件（group / h2>=5 / 本文>=8,000字）を満たす
 *   3. MDX 内 <MagazineCard id="..."> … 置けば出る
 *   4. 記事サイドバーの商品カード … 非 HUB の discovery 資格で `placement.top || inline[0]`
 *      が出る（ArticleSidebar.tsx:84 + sidebar-discovery.ts:15-22）。**中間 CTA の
 *      h2/字数ゲートを通らない**ので、経路 2 が不成立でもここで出る
 *   5. カテゴリページの商品カード … 同 discovery 資格の固定商品（CategoryPage.tsx:107,202）
 *
 * もくじタイル（hub-cta.ts の HUB 資格）は**到達手段として数えない**。資格単位の導線で
 * あってマガジン単位ではなく、どのマガジンに着地するかは季節切替（hub-cta.ts:115-119）で
 * 変わるため。HUB 資格数はログにだけ出す（下の hubCategories）。
 *
 * 既存の 0 面マガジン（note 単品 PDF 併売など、サイト CTA を持たない設計のもの）は
 * `.claude/config/magazine-cta-baseline.json` に id と理由を記録し、**baseline に無い新規の 0 面**
 * だけを落とす（content-quality-ratchet と同じラチェット方式）。もくじタイル経由かどうかの
 * 推測判定は置かない——曖昧な warn は「検査したのに素通り」を作るため、0 面は 0 面と数える。
 *
 * 使い方:
 *   npx tsx scripts/check-magazine-cta-reachability.ts        # レポート（exit 0）
 *   npx tsx scripts/check-magazine-cta-reachability.ts --ci   # 到達 0 面があれば exit 1
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NOTE_MAGAZINES, getMagazine, type MagazineId } from '../src/lib/note-magazines';
import { resolvePlacement } from '../src/lib/magazine-placement';
import { sidebarProduct, DISCOVERY_CATEGORIES } from '../src/lib/sidebar-discovery';

// このリポジトリは package.json に "type" が無く、tsx は .ts を CJS として扱う。
// src/lib/*.ts も CJS になるため、ESM(.mts) から named import すると
// cjs-module-lexer が名前付きエクスポートを拾えず
// 「does not provide an export named 'NOTE_MAGAZINES'」で落ちていた（2026-08-04）。
// 拡張子を .ts に揃えて同じモジュール系にすることで解消している。
// そのため import.meta.url は使えず __dirname を使う。
const ROOT = join(__dirname, '..');
const CI = process.argv.includes('--ci');
const POSTS = join(ROOT, 'content/site');
const EXEMPT_PATH = join(ROOT, '.claude/config/magazine-cta-baseline.json');

// 中間 CTA（MidArticleCta）の発火条件。src/components/docs/DocPage.tsx と同じ値を持つ。
// ここがズレると検査が意味を失うので、DocPage.tsx を変えたらこの値も合わせる。
// （2026-09-22: 参照先を page.tsx から DocPage.tsx へ修正。描画ロジックは
//  src/app/docs/[...slug]/page.tsx から src/components/docs/DocPage.tsx へ移っており、
//  旧ファイルはもう存在しない）
//
// 2026-08-17 に 4 点のズレを是正した（それまで検査は実描画より甘く、
// 「配線したのに出ない」CTA を 4 度続けて見逃していた）:
//   1. inline を全スロット credit していたが、実際に描画されるのは先頭 1 誌のみ
//      かつ top と別マガジンのときだけ（DocPage.tsx:356-366）＝過大カウント
//   2. MID_GROUPS に civil-secondary（civil-1/2 の secondary）が無かった
//      （DocPage.tsx:336-338 の isCivilSecondary）＝過小カウント
//   3. group を生 frontmatter から読んでいて classifyDoc の GROUP_FIELD_MAP を
//      通していなかった（past-exam → pastExam が効かない）
//   4. midSlotCapacity（h2>=3 かつ 2,500 字・枠数上限 3）を無視していた
const MID_GROUPS = new Set(['guide', 'pillar', 'textbook']);
const MID_MIN_H2 = 5;
const MID_MIN_CHARS = 8000;
// 中間枠の下限ゲート（DocPage.tsx:75 MID_MIN_H2・:349-351 midSlotCapacity）。
// これを満たさない記事は 0 枠＝note 中間 CTA も出ない。
// 2026-08-24 に実装側が 4→3 へ下がったのに追随していなかった（2026-09-22 同期）。
// 判定への影響は無い: 経路 2 は midFires（h2>=5）が前提で、これは h2>=3 を必ず含意する。
const MID_SLOT_MIN_H2 = 3;
const MID_SLOT_MIN_CHARS = 2500;

type Doc = { slug: string; category: string; group: string; body: string };

// src/lib/doc-classifier.ts:31-39 と同じ対応表。frontmatter の生値 → DocGroupKey。
const GROUP_FIELD_MAP: Record<string, string> = {
  'guide': 'guide',
  'pillar': 'pillar',
  'past-exam': 'pastExam',
  'keyword': 'keyword',
  'primary': 'primary',
  'secondary': 'secondary',
  'textbook': 'textbook',
};

// content/site/{category}/{slug}/article.mdx と {category}/{slug}.mdx の両 Convention を拾う
function collectDocs(): Doc[] {
  const out: Doc[] = [];
  if (!existsSync(POSTS)) return out;
  for (const category of readdirSync(POSTS, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const cdir = join(POSTS, category.name);
    for (const e of readdirSync(cdir, { withFileTypes: true })) {
      const file = e.isDirectory() ? join(cdir, e.name, 'article.mdx') : e.name.endsWith('.mdx') ? join(cdir, e.name) : '';
      if (!file || !existsSync(file)) continue;
      const raw = readFileSync(file, 'utf8');
      const name = e.isDirectory() ? e.name : e.name.replace(/\.mdx$/, '');
      // 生 frontmatter の group 値は classifyDoc の GROUP_FIELD_MAP を通す
      // （src/lib/doc-classifier.ts:31-39）。past-exam → pastExam の変換を
      // 落とすと、その記事の配線が丸ごと検査対象外になる。
      const rawGroup = (raw.match(/^group:\s*(.+)$/m) || [])[1]?.trim() ?? '';
      out.push({
        slug: `${category.name}-${name}`,
        category: category.name,
        group: GROUP_FIELD_MAP[rawGroup] ?? rawGroup,
        body: raw.replace(/^---[\s\S]*?\n---\n/, ''),
      });
    }
  }
  return out;
}

const docs = collectDocs();

// 1級・2級土木の secondary も中間 CTA の対象（DocPage.tsx:336-338 の isCivilSecondary）。
// 全資格の secondary を一律対象にはしない（土木のみ）。
const isCivilSecondary = (d: Doc): boolean =>
  (d.category === 'civil-construction-1' || d.category === 'civil-construction-2') &&
  d.group === 'secondary';

// 中間 CTA が発火する記事だけを対象に inline 配線を評価する（DocPage.tsx:320-325 midEnabled）
const midFires = (d: Doc): boolean => {
  if (!MID_GROUPS.has(d.group) && !isCivilSecondary(d)) return false;
  const stripped = d.body.replace(/^##\s*参考資料[\s\S]*$/m, '');
  return (stripped.match(/^##\s+/gm) || []).length >= MID_MIN_H2 && stripped.length >= MID_MIN_CHARS;
};

// 中間枠が 1 つでも確保できるか（DocPage.tsx:349-351 midSlotCapacity）。0 枠なら midEnabled でも描画されない。
const hasMidSlot = (d: Doc): boolean => {
  const stripped = d.body.replace(/^##\s*参考資料[\s\S]*$/m, '');
  return (stripped.match(/^##\s+/gm) || []).length >= MID_SLOT_MIN_H2 && stripped.length >= MID_SLOT_MIN_CHARS;
};

// もくじタイル（hub-cta.ts の HUB）に載っている資格 = 資格単位でマガジン導線がある
const hubSrc = readFileSync(join(ROOT, 'src/lib/hub-cta.ts'), 'utf8');
const hubCategories = new Set([...hubSrc.matchAll(/^\s{2}'([a-z0-9-]+)':\s*\{/gm)].map((m) => m[1]!));

const baseline: Record<string, string> = existsSync(EXEMPT_PATH)
  ? (JSON.parse(readFileSync(EXEMPT_PATH, 'utf8')).zeroSurface ?? {})
  : {};

type Reach = { id: string; routes: string[]; categories: Set<string> };
const reach = new Map<string, Reach>();
const ensure = (id: string): Reach => {
  let r = reach.get(id);
  if (!r) { r = { id, routes: [], categories: new Set() }; reach.set(id, r); }
  return r;
};

for (const d of docs) {
  const p = resolvePlacement(d.slug, d.group as never);
  if (p.top && getMagazine(p.top.magazineId)) {
    const r = ensure(p.top.magazineId); r.routes.push(`top:${d.slug}`); r.categories.add(d.category);
  }
  // note 中間 CTA の供給源は placement.inline の「先頭 1 誌のみ」で、しかも
  // 冒頭 CTA と別マガジンのときだけ描画される（DocPage.tsx:356-366）。
  // 2 誌目以降を面として数えると、実際には出ないマガジンが「導線あり」になる。
  if (midFires(d) && hasMidSlot(d)) {
    const midNote = p.inline.find((s) => getMagazine(s.magazineId));
    if (midNote && (!p.top || p.top.magazineId !== midNote.magazineId)) {
      const r = ensure(midNote.magazineId); r.routes.push(`mid:${d.slug}`); r.categories.add(d.category);
    }
  }
  // 記事サイドバーの商品カード（ArticleSidebar.tsx:84）。
  //   条件: sidebarMokuji が null（＝非 HUB 資格）かつ sidebar-discovery の products に
  //   その資格がある（sidebarProduct(category) が非 null）。出るマガジンは
  //   `placement.top || placement.inline[0]`（sidebar-discovery.ts:20）。
  // **中間 CTA の h2>=5 / 8,000 字ゲートを通らない**ので、経路 2 が不成立の記事でも
  // inline[0] がここで実際に出る。これを数えないと非 HUB 資格の到達を過小評価する。
  if (!hubCategories.has(d.category) && sidebarProduct(d.category)) {
    const slot = p.top ?? p.inline[0];
    if (slot && getMagazine(slot.magazineId)) {
      const r = ensure(slot.magazineId); r.routes.push(`sidebar:${d.slug}`); r.categories.add(d.category);
    }
  }
  for (const m of d.body.matchAll(/<MagazineCard[^>]*\sid=["']([^"']+)["']/g)) {
    const id = m[1]!;
    if (!getMagazine(id as MagazineId)) continue;
    const r = ensure(id); r.routes.push(`card:${d.slug}`); r.categories.add(d.category);
  }
}

// カテゴリページの商品カード（CategoryPage.tsx:107 PC / :202 モバイル）。
// 記事単位ではなく資格単位で、`products[category]` の固定商品が出る。
// 条件は `slug !== 'concrete-engineer'`（技士は専用ブロックを持つ）かつ hubCta 不在（非 HUB）。
for (const cat of DISCOVERY_CATEGORIES) {
  if (cat === 'concrete-engineer' || hubCategories.has(cat)) continue;
  const mag = sidebarProduct(cat);
  if (!mag) continue;
  const r = ensure(mag.id); r.routes.push(`category-page:${cat}`); r.categories.add(cat);
}

const published = Object.values(NOTE_MAGAZINES).filter((m) => m.published && m.noteUrl);
const zero = published.filter((m) => !(reach.get(m.id)?.routes.length));
const newZero = zero.filter((m) => !baseline[m.id]);
const fixed = Object.keys(baseline).filter((id) => reach.get(id)?.routes.length);

console.log(`[check-magazine-cta-reachability] 公開マガジン ${published.length} 件を検査（記事 ${docs.length} 本 / HUB 資格 ${hubCategories.size} 件はタイル扱いで到達に数えない / discovery 資格 ${DISCOVERY_CATEGORIES.length} 件）`);
for (const mag of published) {
  const r = reach.get(mag.id);
  const n = r?.routes.length ?? 0;
  if (n) console.log(`  ✓ ${mag.id}: ${n} 面（${r!.routes.slice(0, 3).join(' / ')}${n > 3 ? ` ほか${n - 3}` : ''}）`);
  else console.log(`  ${baseline[mag.id] ? '-' : '✗'} ${mag.id}: 0 面${baseline[mag.id] ? `（baseline: ${baseline[mag.id]}）` : ''}`);
}
if (fixed.length) console.log(`\n  info: baseline 掲載だが CTA が付いた ${fixed.length} 件（baseline から削除してよい）: ${fixed.join(', ')}`);

// 検査ゼロを PASS と呼ばない（走査対象が取れていないなら故障として落とす）
if (!docs.length || !published.length) {
  console.error(`\n✗ 検査不成立: 記事 ${docs.length} 本 / 公開マガジン ${published.length} 件（走査経路が壊れている）`);
  process.exit(1);
}
if (newZero.length) {
  console.error(`\n✗ サイトから到達できない公開マガジン（baseline 外）${newZero.length} 件: ${newZero.map((m) => m.id).join(', ')}`);
  console.error('  対処: magazine-placement.ts に top を配線する / 対象記事に <MagazineCard> を置く /');
  console.error('        サイト CTA を持たない設計なら .claude/config/magazine-cta-baseline.json に理由付きで登録する');
  console.error('  注意: sidebar 配線は現行コードでは参照されない（2026-07 の CTA 統一で廃止）');
  if (CI) process.exit(1);
} else {
  console.log(`\n✓ 新規の 0 面マガジンなし（0 面 ${zero.length} 件はすべて baseline 記載）`);
}
