// note メンバーシップ「土木セコカン合格ラボ」撤退（2026-09-30）の再混入検出テスト。
//
// 目的: 撤退した会員への導線が、SoT（note-magazines.ts）・note 記事本文・サイト配置
//       （magazine-placement.ts）へ戻ってくるのを機械検出する。会員向け記事（メンバーシップ/配下）は対象外。
//
// テストのために商品定義や本文を二重定義しない。すべて実ソースを読み、実 resolvePlacement を
// esbuild でトランスパイルして呼ぶ（magazine-placement.ts は import type のみ＝ランタイム依存ゼロ）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildSync } from 'esbuild';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const JOIN_URL = 'https://note.com/dobokunote/membership/join';
const MEMBERSHIP_ID = 'civil-membership-lab';
const CTA_MARKER = '<!-- cta:civil-membership-lab -->';
const INTRO_SELF_URL = 'https://note.com/dobokunote/n/n6b66793ca20c';

function walkArticles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'メンバーシップ') walkArticles(p, out); }
    else if (/^article(-[^/\\]+)?\.md$/.test(e)) out.push(p);
  }
  return out;
}

// ── SoT: 撤退した会員は published:false（getMagazine が null を返し全 CTA が消える）──
test('note-magazines.ts: civil-membership-lab は撤退済み（published:false）', () => {
  const src = read('src/lib/note-magazines.ts');
  const block = src.match(/'civil-membership-lab':\s*\{([\s\S]*?)\n {2}\},/);
  assert.ok(block, "civil-membership-lab エントリが見つからない");
  assert.match(block[1], /\bpublished:\s*false\b/, '撤退した会員が published:true に戻っている');
});

// ── note 記事: 会員向け記事以外に会員への導線が残っていない ───────────────
test('note 記事: 会員向け記事以外に合格ラボへの導線が無い', () => {
  const files = walkArticles(join(ROOT, 'content/note'));
  assert.ok(files.length > 100, `走査した note 記事が少なすぎる: ${files.length}`);
  const hits = files.filter((f) => {
    const c = readFileSync(f, 'utf8');
    return [CTA_MARKER, JOIN_URL, INTRO_SELF_URL].some((needle) => c.split(needle).length > 1);
  });
  assert.deepEqual(hits.map((f) => relative(ROOT, f).split('\\').join('/')), [], '撤退した会員への導線が残っている');
});

// ── サイト配置: 土木の代表面に会員 CTA が出ない ─────────────────────────────
test('resolvePlacement: 土木の配置にメンバーシップが出ない', async () => {
  const ts = read('src/lib/magazine-placement.ts');
  const js = buildSync({
    stdin: { contents: ts, loader: 'ts', resolveDir: join(ROOT, 'src/lib') },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  }).outputFiles[0].text;
  const mod = await import('data:text/javascript,' + encodeURIComponent(js));
  const { resolvePlacement } = mod;
  assert.equal(typeof resolvePlacement, 'function', 'resolvePlacement を import できない');

  const cases = [
    ['civil-construction-1-secondary-r07', 'secondary'],
    ['civil-construction-2-secondary-r07', 'secondary'],
    ['civil-construction-2-secondary-experience-writing-examples', 'secondary'],
    ['civil-construction-1-secondary-getting-started', 'secondary'],
    ['civil-construction-2-secondary-getting-started', 'secondary'],
    ['civil-construction-1-secondary-past-problems', 'secondary'], // 1級 catch-all
    ['civil-construction-1-guide-last-minute-2026', 'guide'], // 二次隣接（直前）
    ['civil-construction-2-primary-r07-a', 'primary'],
  ];
  for (const [slug, group] of cases) {
    const p = resolvePlacement(slug, group);
    const ids = [p.top, ...p.inline].filter(Boolean).map((x) => x.magazineId);
    assert.ok(!ids.includes(MEMBERSHIP_ID), `${slug}: 撤退した会員が配置されている`);
  }

  // 1級の書き方ガイドは、検索意図に直結する完成答案集を中間の主 CTA にする固有設計。
  const guide = resolvePlacement(
    'civil-construction-1-secondary-experience-writing-guide',
    'secondary',
  );
  assert.equal(guide.top?.magazineId, 'civil-1-keiken-complete-pack');
  assert.deepEqual(
    guide.inline.map((slot) => slot.magazineId),
    ['civil-1-experience-essay'],
    '書き方ガイドの中間 CTA は完成答案集 1 件だけであるべき',
  );
});

test('resolveCivil1PrimaryLead: 二次試験当日まで二次、翌日から一次へ戻す', async () => {
  const ts = read('src/lib/magazine-placement.ts');
  const js = buildSync({
    stdin: { contents: ts, loader: 'ts', resolveDir: join(ROOT, 'src/lib') },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  }).outputFiles[0].text;
  const { resolveCivil1PrimaryLead } = await import('data:text/javascript,' + encodeURIComponent(js));

  assert.equal(
    resolveCivil1PrimaryLead(Date.parse('2026-10-03T23:59:59+09:00')),
    'civil-1-experience-essay',
  );
  assert.equal(
    resolveCivil1PrimaryLead(Date.parse('2026-10-04T23:59:59+09:00')),
    'civil-1-experience-essay',
  );
  assert.equal(
    resolveCivil1PrimaryLead(Date.parse('2026-10-05T00:00:00+09:00')),
    'civil-1-ichiji-ronten',
  );
});
