#!/usr/bin/env node
/**
 * render-kindle-preview.mjs
 * ---------------------------------------------------------------------------
 * Kindle 本の EPUB を「端末で見た 1 ページ = 1 枚の PNG」に描画し、管理画面
 * （/content/kindle/<id>）で目視確認できるようにする。EPUB リーダーを開かずに
 * 提出前の見た目（前付け・見出し・表・記入例の下線など）を確かめるためのもの。
 *
 * 描画: spine 順の各 XHTML を Chromium で開き、CSS 段組みで 600×800 のページに割って
 * 1 ページずつスクリーンショットする。Kindle の実描画とは完全には一致しない（近似）。
 *
 * 出力: .tmp/kindle-preview/<id>/p-NNN.png + manifest.json（epubSha256 で EPUB との鮮度を判定）
 *
 * 使い方:
 *   node scripts/render-kindle-preview.mjs --id j-03[,j-01,...]
 *   node scripts/render-kindle-preview.mjs --status ready      # catalog の status で一括
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { join, posix } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadKindleCatalog, artifactRelPaths } from './lib/kindle-catalog.mjs';

const OUT_ROOT = join(REPO_ROOT, '.tmp/kindle-preview');
const PAGE_W = 600;
const PAGE_H = 800;
const PAD_X = 36;
const PAD_Y = 40;

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const idsArg = getArg('--id');
const statusArg = getArg('--status');
if (!idsArg && !statusArg) { console.error('--id <id[,id...]> または --status <status> が必要'); process.exit(1); }

const books = loadKindleCatalog();
const targets = idsArg
  ? idsArg.split(',').map((id) => books.find((b) => b.id === id) || { id, missing: true })
  : books.filter((b) => b.status === statusArg);
if (!targets.length) { console.error(`対象 0 件（--status ${statusArg}）`); process.exit(1); }

/** container.xml → OPF → spine 順の XHTML（EPUB 内相対パス）。 */
function readSpine(dir) {
  const container = readFileSync(join(dir, 'META-INF/container.xml'), 'utf8');
  const opfRel = (container.match(/full-path="([^"]+)"/) || [])[1];
  if (!opfRel) throw new Error('container.xml に rootfile が無い');
  const opf = readFileSync(join(dir, opfRel), 'utf8');
  const hrefById = new Map([...opf.matchAll(/<item\s[^>]*>/g)].map((m) => [
    (m[0].match(/\bid="([^"]+)"/) || [])[1], (m[0].match(/\bhref="([^"]+)"/) || [])[1],
  ]));
  const opfDir = posix.dirname(opfRel);
  return [...opf.matchAll(/<itemref\s[^>]*idref="([^"]+)"/g)]
    .map((m) => hrefById.get(m[1]))
    .filter(Boolean)
    .map((href) => (opfDir === '.' ? href : posix.join(opfDir, href)));
}

// 段組みで 1 列 = 1 ページにする。列幅 + 列間 = PAGE_W なので translateX(-PAGE_W * n) で n ページ目が出る。
const PAGINATE_CSS = `
  html { width: ${PAGE_W}px; height: ${PAGE_H}px; overflow: hidden; background: #fff; }
  body { margin: 0; padding: ${PAD_Y}px ${PAD_X}px; box-sizing: border-box; height: ${PAGE_H}px;
         column-width: ${PAGE_W - PAD_X * 2}px; column-gap: ${PAD_X * 2}px; column-fill: auto; }
  img, svg, table { max-width: 100%; break-inside: avoid; }
  img { max-height: ${PAGE_H - PAD_Y * 2}px; object-fit: contain; }
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: PAGE_W, height: PAGE_H } });
let ok = 0;
const failed = [];

for (const book of targets) {
  const tmp = mkdtempSync(join(tmpdir(), 'kindle-preview-'));
  try {
    if (book.missing) throw new Error('catalog に無い');
    const epubRel = artifactRelPaths(book).epub;
    const epub = epubRel && join(REPO_ROOT, epubRel);
    if (!epub || !existsSync(epub)) throw new Error(`EPUB が無い: ${epubRel || '(catalog.epub 未設定)'}`);
    execFileSync('unzip', ['-qo', epub, '-d', tmp], { stdio: 'ignore' });
    const spine = readSpine(tmp);

    const outDir = join(OUT_ROOT, book.id);
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const pages = [];
    for (const item of spine) {
      await page.goto(`file://${join(tmp, item)}`, { waitUntil: 'load' });
      await page.addStyleTag({ content: PAGINATE_CSS });
      await page.evaluate(() => document.fonts.ready);
      const count = await page.evaluate((w) => Math.max(1, Math.ceil(document.body.scrollWidth / w)), PAGE_W);
      for (let n = 0; n < count; n++) {
        await page.evaluate((x) => { document.body.style.transform = `translateX(${-x}px)`; }, n * PAGE_W);
        const file = `p-${String(pages.length + 1).padStart(3, '0')}.png`;
        await page.screenshot({ path: join(outDir, file) });
        pages.push({ file, item, pageInItem: n + 1 });
      }
    }

    const manifest = {
      id: book.id,
      title: book.title,
      epub: epubRel,
      epubSha256: createHash('sha256').update(readFileSync(epub)).digest('hex'),
      generatedAt: new Date().toISOString(),
      viewport: { width: PAGE_W, height: PAGE_H },
      pages,
    };
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✓ ${book.id}: ${spine.length} ファイル → ${pages.length} ページ`);
    ok++;
  } catch (e) {
    console.error(`✗ ${book.id}: ${e.message}`);
    failed.push(book.id);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
await browser.close();

console.log(`[render-kindle-preview] 対象 ${targets.length} 冊 / 描画 ${ok} 冊 / 失敗 ${failed.length} 冊${failed.length ? `（${failed.join(', ')}）` : ''} → ${OUT_ROOT}`);
process.exitCode = failed.length ? 1 : 0;
