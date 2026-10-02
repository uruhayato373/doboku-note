#!/usr/bin/env tsx
/**
 * audit-sns-landing-cta.ts（DN-0364 / DN-0363 の機械検査）
 * ---------------------------------------------------------------------------
 * SNS 原稿と X 予約キューが指すサイト内リンク先に、note 導線が「早い位置で」あるかを検査する。
 * 転職（career）と practice は方針どおり note 導線を置かないので対象外。
 *
 * 判定（ソース静的判定。本番 HTML の data-cta 位置による監査は build 後に別途行う）:
 *   記事    : placement.top が描画可能（getMagazine 非 null）、または本文冒頭 50% 以内に <MagazineCard>
 *   tools   : page.tsx に data-cta="note" を持つ静的ブロックがある（クライアント描画のみは SSR に出ないので不可）
 *   資格トップ: resolveHubCta か sidebarProduct が非 null
 *   その他  : 対象外として件数だけ出す（/links・トップ等）
 *
 * 使い方:
 *   npx tsx scripts/audit-sns-landing-cta.ts        # レポート（exit 0）
 *   npx tsx scripts/audit-sns-landing-cta.ts --ci   # 未配線があれば exit 1、検査ゼロも exit 1
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getMagazine } from '../src/lib/note-magazines';
import { resolvePlacement } from '../src/lib/magazine-placement';
import { getAllPublicDocRoutes } from '../src/lib/content-routes';
import { resolveHubCta } from '../src/lib/hub-cta';
import { sidebarProduct } from '../src/lib/sidebar-discovery';
import { datasetDir } from './lib/datasets.mjs';

const ROOT = join(__dirname, '..');
const CI = process.argv.includes('--ci');
const SITE = join(ROOT, 'content/site');
const SOURCES = [join(ROOT, 'content/sns'), join(ROOT, datasetDir('config.x-campaigns'))];
const CARD_EARLY_RATIO = 0.5;

const GROUP_FIELD_MAP: Record<string, string> = {
  guide: 'guide', pillar: 'pillar', 'past-exam': 'pastExam', keyword: 'keyword',
  primary: 'primary', secondary: 'secondary', textbook: 'textbook',
};

type Doc = { slug: string; category: string; group: string; body: string; isCareer: boolean };

function collectDocs(): Map<string, Doc> {
  const out = new Map<string, Doc>();
  for (const category of readdirSync(SITE, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const cdir = join(SITE, category.name);
    for (const e of readdirSync(cdir, { withFileTypes: true })) {
      const file = e.isDirectory() ? join(cdir, e.name, 'article.mdx') : e.name.endsWith('.mdx') ? join(cdir, e.name) : '';
      if (!file || !existsSync(file)) continue;
      const raw = readFileSync(file, 'utf8');
      const name = e.isDirectory() ? e.name : e.name.replace(/\.mdx$/, '');
      const rawGroup = ((raw.match(/^group:\s*(.+)$/m) || [])[1] ?? '').trim().replace(/^["']|["']$/g, '');
      const fm = raw.match(/^---[\s\S]*?\n---/)?.[0] ?? '';
      const slug = `${category.name}-${name}`;
      out.set(slug, {
        slug,
        category: category.name,
        group: GROUP_FIELD_MAP[rawGroup] ?? rawGroup,
        body: raw.replace(/^---[\s\S]*?\n---\n/, ''),
        isCareer: /^\s*-\s*career\s*$/m.test(fm),
      });
    }
  }
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(md|json|txt|mdx)$/.test(e)) acc.push(p);
  }
  return acc;
}

// リンク先 URL（重複は 1 ページにまとめ、リンク件数も数える）
const linkCount = new Map<string, number>();
for (const src of SOURCES) {
  for (const f of walk(src)) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/https:\/\/doboku-note\.com(\/[A-Za-z0-9_\/%.-]*)/g)) {
      const path = m[1]!.replace(/\/+$/, '') || '/';
      linkCount.set(path, (linkCount.get(path) ?? 0) + 1);
    }
  }
}

const docs = collectDocs();
const routeToSlug = new Map<string, string>();
for (const r of getAllPublicDocRoutes()) routeToSlug.set(r.path, r.legacySlug);

type Verdict = { path: string; links: number; kind: string; ok: boolean; note: string };
const verdicts: Verdict[] = [];
const excluded = { career: 0, practice: 0, other: 0 };

function toolSource(path: string): string | null {
  const file = join(ROOT, 'src/app', path, 'page.tsx');
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

for (const [path, links] of [...linkCount].sort()) {
  if (path.startsWith('/practice')) { excluded.practice++; continue; }
  if (path.startsWith('/tools/')) {
    const src = toolSource(path);
    const ok = !!src && /data-cta=["']note["']/.test(src);
    verdicts.push({ path, links, kind: 'tool', ok, note: ok ? 'page.tsx に note 静的ブロック' : src ? 'note の静的ブロックなし（クライアント描画は SSR に出ない）' : 'page.tsx が見つからない' });
    continue;
  }
  const slug = path.startsWith('/docs/') ? path.slice(6) : routeToSlug.get(path);
  const doc = slug ? docs.get(slug) : undefined;
  if (doc) {
    if (doc.isCareer) { excluded.career++; continue; }
    const p = resolvePlacement(doc.slug, doc.group as never, doc.isCareer);
    if (p.top && getMagazine(p.top.magazineId)) {
      verdicts.push({ path, links, kind: 'doc', ok: true, note: `top:${p.top.magazineId}` });
      continue;
    }
    const cardIdx = doc.body.search(/<MagazineCard\b/);
    if (cardIdx >= 0 && cardIdx / Math.max(doc.body.length, 1) <= CARD_EARLY_RATIO) {
      verdicts.push({ path, links, kind: 'doc', ok: true, note: `MagazineCard ${Math.round((cardIdx / doc.body.length) * 100)}%` });
      continue;
    }
    verdicts.push({ path, links, kind: 'doc', ok: false, note: cardIdx >= 0 ? 'MagazineCard が本文後半のみ' : 'top 配線なし（末尾の枠だけ）' });
    continue;
  }
  const cat = /^\/exam\/([a-z0-9-]+)$/.exec(path)?.[1];
  if (cat) {
    const ok = !!resolveHubCta(cat, { utmSuffix: 'audit' }) || !!sidebarProduct(cat);
    verdicts.push({ path, links, kind: 'category', ok, note: ok ? 'カテゴリ hub の商品カード' : 'カテゴリ hub の商品導線なし' });
    continue;
  }
  excluded.other++;
}

const bad = verdicts.filter((v) => !v.ok);
console.log(`[audit-sns-landing-cta] リンク先 ${linkCount.size} ページ（SNS 原稿＋X 予約）のうち検査 ${verdicts.length} ページ / 対象外: 転職 ${excluded.career}・practice ${excluded.practice}・その他 ${excluded.other}`);
for (const kind of ['tool', 'category', 'doc']) {
  const vs = verdicts.filter((v) => v.kind === kind);
  console.log(`  ${kind}: ${vs.length} ページ中 未配線 ${vs.filter((v) => !v.ok).length}`);
}
for (const v of bad) console.log(`  ✗ ${v.path}（リンク ${v.links} 件）: ${v.note}`);

if (verdicts.length === 0) {
  console.error('✗ 検査不成立: 検査ページ 0 件（リンク抽出か経路解決が壊れている）');
  process.exit(1);
}
if (bad.length) {
  console.error(`\n✗ note 導線が早い位置にない SNS リンク先 ${bad.length} ページ`);
  if (CI) process.exit(1);
} else {
  console.log(`\n✓ 検査 ${verdicts.length} ページすべてに note 導線あり`);
}
