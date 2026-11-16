#!/usr/bin/env tsx
/**
 * check-cta-surfaces.ts — サイトの広い面の案内先の台帳（config/site-cta-surfaces.json・DN-1223）を検査し、今日の配線を表で出す。
 *
 * 広い面＝資格トップ・記事の横の欄・記事末のタイル・/links の先頭。どの資格をもくじ（note の L2）へ寄せ、試験の前後の
 * いつどのパック・単品へ切り替えるかを台帳 1 か所で決め、サイトのコード（hub-cta・sidebar-discovery・learning-catalog・
 * magazine-placement の categoryLeadMagazineId）は台帳を読むだけにした。以前は同じ判断が 4 か所に散り、もくじのある資格が
 * 単品へ案内したまま・口頭試験の切り替えが総監だけ漏れる、といった食い違いに誰も気づけなかった。
 *
 * 検査（1 つでも当たれば exit 1）:
 *   1. 資格試験の領域の資格（categories.json × content-taxonomy の area=exam）に台帳の行がある／台帳に余分な行が無い
 *   2. 案内する商品（lead の product・季節の product）がいまサイトに出る商品（公開・noteUrl あり・売り場から外していない）
 *   3. 季節の行事が試験日の正本（exam-calendar.json）にある／同じ資格の季節の窓が重ならない
 *   4. lead: mokuji の資格に note のもくじがある／もくじがあるのに product・none にした行は reason がある
 *   5. 広い面のコード（hub-cta.ts・sidebar-discovery.ts・learning-catalog.ts）が商品 id を直書きしていない
 * 検査対象数と実検査数を出す。台帳の行が 0 件なら検査不成立（exit 2）。
 *
 * Usage: npm run check-cta-surfaces            # 検査＋今日の配線の表
 *        npm run check-cta-surfaces -- --json  # 今日の配線を JSON で（週次レビューで計測と並べる）
 * 罠: 季節の判定はビルド時（ここでは実行時）の日付。表は「今日」の値で、検査の合否は日付によらない。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { getAllCategories } from '../src/lib/categories';
import { getCategoryArea } from '../src/lib/content-taxonomy';
import { getMagazine, NOTE_MAGAZINES, type MagazineId } from '../src/lib/note-magazines';
import { mokujiFor } from '../src/lib/note-mokuji';
import { QUALIFICATION_TO_EXAM_KEY } from '../src/lib/exam-brand';
import { activeSeason, seasonWindow, surfaceRow, type SurfaceRow } from '../src/lib/cta-surfaces';
import { resolveHubCta } from '../src/lib/hub-cta';
import { sidebarProduct } from '../src/lib/sidebar-discovery';

const asJson = process.argv.includes('--json');
const ledger = readDataset(ROOT, 'config.site-cta-surfaces') as { qualifications: Record<string, SurfaceRow> };
const rows = Object.entries(ledger.qualifications ?? {});
if (rows.length === 0) {
  console.error('[check-cta-surfaces] 検査不成立: 台帳の行が 0 件');
  process.exit(2);
}

const issues: string[] = [];
let checks = 0;
const check = (ok: boolean, message: string) => { checks += 1; if (!ok) issues.push(message); };

// 1. 資格試験の領域の資格と台帳の行
const examCategories = getAllCategories().map((c) => c.slug).filter((slug) => getCategoryArea(slug) === 'exam');
for (const slug of examCategories) check(Boolean(ledger.qualifications[slug]), `${slug}: 資格試験の資格なのに台帳の行が無い（lead を決めて足す）`);
for (const [slug] of rows) check(examCategories.includes(slug), `${slug}: 資格試験の資格（categories.json）に無い行`);

for (const [slug, row] of rows) {
  const examKey = QUALIFICATION_TO_EXAM_KEY[slug];
  const mokuji = examKey ? mokujiFor(examKey) : null;
  // 2. 案内する商品がいまサイトに出るか
  const products = [...(row.product ? [row.product] : []), ...(row.seasons ?? []).map((s) => s.product)];
  for (const id of products) {
    check(Boolean(NOTE_MAGAZINES[id as MagazineId]), `${slug}: ${id} は note の商品台帳に無い`);
    check(Boolean(getMagazine(id as MagazineId)), `${slug}: ${id} はいまサイトに出ない（未公開か売り場から外した）。案内先を替える`);
  }
  // 3. 季節の行事と窓の重なり
  const windows: { kind: string; start: number; end: number }[] = [];
  for (const season of row.seasons ?? []) {
    try {
      const w = seasonWindow(slug, season);
      checks += 1;
      for (const other of windows) check(!(w.start < other.end && other.start < w.end), `${slug}: 季節 ${season.kind}（${season.event}）と ${other.kind} の窓が重なる`);
      windows.push({ kind: season.kind, ...w });
    } catch (e) {
      issues.push(`${slug}: 季節の行事 ${season.event} が試験日の正本に無い（${(e as Error).message}）`);
    }
  }
  // 4. もくじの有無と lead
  if (row.lead === 'mokuji') check(Boolean(mokuji), `${slug}: lead が mokuji なのに note のもくじが無い（note-funnel.json の L2・note-mokuji.ts の対応）`);
  else if (mokuji) check(Boolean(row.reason), `${slug}: note に「${mokuji.title}」があるのに ${row.lead} にしている。もくじへ寄せるか reason を書く`);
}

// 5. 広い面のコードの直書き（商品 id を台帳以外で決めない）
const ids = new Set(Object.keys(NOTE_MAGAZINES));
for (const file of ['src/lib/hub-cta.ts', 'src/lib/sidebar-discovery.ts', 'src/lib/learning-catalog.ts']) {
  const literals = [...readFileSync(join(ROOT, file), 'utf8').matchAll(/'([a-z0-9][a-z0-9-]+)'/g)].map((m) => m[1]!).filter((s) => ids.has(s));
  check(literals.length === 0, `${file}: 商品 id を直書きしている（${[...new Set(literals)].join(', ')}）。台帳（site-cta-surfaces.json）へ移す`);
}

// 台帳に誤りがあると下の表の解決（試験日の引き当て）が投げるので、先に誤りを出して止める
if (issues.length) {
  console.error(`[check-cta-surfaces] 台帳 ${rows.length} 資格・資格試験の資格 ${examCategories.length} 件を検査（検査 ${checks} 件）`);
  console.error(`✗ ${issues.length} 件`);
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}

// 今日の配線（資格トップの PC の枠＝記事の横の欄とタイルも同じ判定）
const today = rows.map(([slug, row]) => {
  const hub = resolveHubCta(slug);
  const product = hub ? null : sidebarProduct(slug);
  const season = activeSeason(slug);
  return {
    category: slug,
    lead: row.lead,
    now: hub ? (hub.mode === 'mokuji' ? 'もくじ' : `季節の商品 ${hub.productId}`) : product ? `商品 ${product.id}` : '出さない',
    season: season ? `${season.kind}:${season.event}` : null,
    reason: surfaceRow(slug)?.reason ?? null,
  };
});

if (asJson) {
  console.log(JSON.stringify({ checks, issues, today }, null, 2));
} else {
  console.log(`[check-cta-surfaces] 台帳 ${rows.length} 資格・資格試験の資格 ${examCategories.length} 件を検査（検査 ${checks} 件）`);
  for (const t of today) console.log(`  ${t.category.padEnd(30)} ${t.lead.padEnd(8)} → ${t.now}${t.season ? `（${t.season}）` : ''}${t.reason ? `  ※${t.reason}` : ''}`);
}
if (!asJson) console.log('✓ 台帳・商品・行事・もくじ・コードの直書きはすべて整合');
