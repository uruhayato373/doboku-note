#!/usr/bin/env node
/**
 * standards-table-gallery.mjs — 公的基準の章・節ページの表を撮影し、1 枚の HTML に並べる（目視用・ゲートではない）。
 *
 * 表を原本と照合して組み直したとき・原本が改訂されたときに、表の崩れ（見出しの欠け・押しつぶされたセル・
 * 段落に化けた行）を人がまとめて目で確かめるための道具。機械で決まる崩れは
 * check-standard-articles（17〜19）と e2e/standards-render.spec.ts が止める。
 *
 * 対象は描画の検査と同じ「中身が異なるページすべて」（scripts/lib/standards-render-targets.mjs）。
 *
 * 使い方（事前に npm run build && npm run serve、または dev サーバー）:
 *   node scripts/standards-table-gallery.mjs                          # http://localhost:3025 を撮る
 *   node scripts/standards-table-gallery.mjs --base http://localhost:3020 --only /standards/kinki
 *   node scripts/standards-table-gallery.mjs --channel msedge          # Playwright のブラウザが無い PC
 *   node scripts/standards-table-gallery.mjs --all --only /standards/hokkaido/local   # 比較の外の文書（必携・特記など）も対象にする
 * 出力: .tmp/standards-table-gallery/index.html（画像は同じフォルダ）
 *
 * 終了コード: 0 = 撮影した / 1 = 一部のページを開けなかった / 2 = 表を 1 枚も撮れなかった（検査不成立と同じ扱い）
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { standardsRenderTargets } from './lib/standards-render-targets.mjs';

const args = parseCliArgs({
  base: { type: 'string', default: 'http://localhost:3025' },
  only: { type: 'string' },
  channel: { type: 'string' },
  all: { type: 'boolean' },
  out: { type: 'string', default: join(REPO_ROOT, '.tmp', 'standards-table-gallery') },
});

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function main() {
  const targets = standardsRenderTargets(join(SITE_CONTENT_ROOT, 'standards-articles'), { scope: args.all ? 'all' : 'distinct' }).filter(
    (url) => !args.only || url.startsWith(args.only),
  );
  if (targets.length === 0) {
    console.error('[standards-table-gallery] 対象ページが 0 件（--only を確認する）');
    process.exitCode = 2;
    return;
  }
  rmSync(args.out, { recursive: true, force: true });
  mkdirSync(args.out, { recursive: true });

  const browser = await chromium.launch(args.channel ? { channel: args.channel } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const shots = [];
  const failed = [];
  for (const url of targets) {
    try {
      await page.goto(`${args.base}${url}`, { waitUntil: 'networkidle', timeout: 120_000 });
    } catch (error) {
      failed.push(`${url}: ${error.message.split('\n')[0]}`);
      continue;
    }
    // 中身を確かめる道具なので、表全体が写るよう撮影のときだけ横スクロールを外し、右のナビを隠す
    await page.addStyleTag({
      content: '[data-standards-chapter] .table-scroll{overflow:visible!important;width:max-content!important;max-width:none!important}[data-standards-sidebar],aside{display:none!important}article,main,main *{overflow:visible!important}',
    });
    const tables = page.locator('[data-standards-chapter] table');
    const count = await tables.count();
    for (let i = 0; i < count; i += 1) {
      const table = tables.nth(i);
      // 表の直前の太字の段落（キャプション）を見出しにする
      const caption = await table.evaluate((el) => {
        let node = el.closest('.table-scroll')?.previousElementSibling ?? null;
        for (let hops = 0; node && hops < 4; hops += 1, node = node.previousElementSibling) {
          const strong = node.querySelector?.('strong');
          if (strong && /表\s*\d/.test(strong.textContent ?? '')) return strong.textContent.trim();
        }
        return '';
      });
      const file = `${shots.length + 1}`.padStart(4, '0') + '.png';
      await table.screenshot({ path: join(args.out, file) });
      shots.push({ url, caption, file });
    }
    console.log(`[standards-table-gallery] ${url}: 表 ${count}`);
  }
  await browser.close();

  const items = shots
    .map(
      (shot) => `<figure><figcaption><a href="${escapeHtml(args.base + shot.url)}">${escapeHtml(shot.url)}</a> ${escapeHtml(shot.caption)}</figcaption><img src="${shot.file}" loading="lazy" alt="${escapeHtml(shot.caption || shot.url)}"></figure>`,
    )
    .join('\n');
  writeFileSync(
    join(args.out, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>公的基準の表の一覧</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;background:#f6f7f9}figure{background:#fff;margin:0 0 24px;padding:12px;border:1px solid #ddd}figcaption{font-size:13px;margin-bottom:8px}img{max-width:100%;border:1px solid #eee}</style>
<h1>公的基準の表の一覧（${shots.length} 表・${targets.length} ページ）</h1>
<p>表全体を写すため、撮影のときだけ横スクロールを外しています（読者の画面では表の中で横にスクロールします）。</p>
${failed.length ? `<p>開けなかったページ: ${failed.map(escapeHtml).join(' / ')}</p>` : ''}
${items}
`,
  );
  console.log(`[standards-table-gallery] 対象 ${targets.length} ページ / 撮影 ${shots.length} 表 / 開けなかった ${failed.length} ページ → ${join(args.out, 'index.html')}`);
  if (shots.length === 0) process.exitCode = 2;
  else if (failed.length > 0) process.exitCode = 1;
}

main();
