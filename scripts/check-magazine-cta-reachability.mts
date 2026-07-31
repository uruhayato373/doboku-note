#!/usr/bin/env tsx
/**
 * check-magazine-cta-reachability.mts
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
 *   4. もくじタイル … HUB 資格の hub-cta.ts に載っている（資格単位の導線）
 *
 * 既存の 0 面マガジン（note 単品 PDF 併売など、サイト CTA を持たない設計のもの）は
 * `.claude/config/magazine-cta-baseline.json` に id と理由を記録し、**baseline に無い新規の 0 面**
 * だけを落とす（content-quality-ratchet と同じラチェット方式）。もくじタイル経由かどうかの
 * 推測判定は置かない——曖昧な warn は「検査したのに素通り」を作るため、0 面は 0 面と数える。
 *
 * 使い方:
 *   npx tsx scripts/check-magazine-cta-reachability.mts        # レポート（exit 0）
 *   npx tsx scripts/check-magazine-cta-reachability.mts --ci   # 到達 0 面があれば exit 1
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTE_MAGAZINES, getMagazine, type MagazineId } from '../src/lib/note-magazines';
import { resolvePlacement } from '../src/lib/magazine-placement';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CI = process.argv.includes('--ci');
const POSTS = join(ROOT, '.local/r2/posts');
const EXEMPT_PATH = join(ROOT, '.claude/config/magazine-cta-baseline.json');

// 中間 CTA（MidArticleCta）の発火条件。src/app/docs/[...slug]/page.tsx と同じ値を持つ。
// ここがズレると検査が意味を失うので、page.tsx を変えたらこの 3 つも合わせる。
const MID_GROUPS = new Set(['guide', 'pillar', 'textbook']);
const MID_MIN_H2 = 5;
const MID_MIN_CHARS = 8000;

type Doc = { slug: string; category: string; group: string; body: string };

// .local/r2/posts/{category}/{slug}/article.mdx と {category}/{slug}.mdx の両 Convention を拾う
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
      out.push({
        slug: `${category.name}-${name}`,
        category: category.name,
        group: (raw.match(/^group:\s*(.+)$/m) || [])[1]?.trim() ?? '',
        body: raw.replace(/^---[\s\S]*?\n---\n/, ''),
      });
    }
  }
  return out;
}

const docs = collectDocs();
// 中間 CTA が発火する記事だけを対象に inline 配線を評価する
const midFires = (d: Doc): boolean => {
  if (!MID_GROUPS.has(d.group)) return false;
  const stripped = d.body.replace(/^##\s*参考資料[\s\S]*$/m, '');
  return (stripped.match(/^##\s+/gm) || []).length >= MID_MIN_H2 && stripped.length >= MID_MIN_CHARS;
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
  if (midFires(d)) {
    for (const s of p.inline) {
      if (!getMagazine(s.magazineId)) continue;
      const r = ensure(s.magazineId); r.routes.push(`mid:${d.slug}`); r.categories.add(d.category);
    }
  }
  for (const m of d.body.matchAll(/<MagazineCard[^>]*\sid=["']([^"']+)["']/g)) {
    const id = m[1]!;
    if (!getMagazine(id as MagazineId)) continue;
    const r = ensure(id); r.routes.push(`card:${d.slug}`); r.categories.add(d.category);
  }
}

const published = Object.values(NOTE_MAGAZINES).filter((m) => m.published && m.noteUrl);
const zero = published.filter((m) => !(reach.get(m.id)?.routes.length));
const newZero = zero.filter((m) => !baseline[m.id]);
const fixed = Object.keys(baseline).filter((id) => reach.get(id)?.routes.length);

console.log(`[check-magazine-cta-reachability] 公開マガジン ${published.length} 件を検査（記事 ${docs.length} 本 / HUB 資格 ${hubCategories.size} 件を走査）`);
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
