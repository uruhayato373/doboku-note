#!/usr/bin/env node
/**
 * check-coconala-live.mjs — ココナラの公開ページがカタログ／listings SoT と一致しているかを実査する
 * ---------------------------------------------------------------------------
 * 出品・価格・本文の編集は Playwright で live に書くため、SoT を直したのに live へ反映し忘れる、
 * 逆に UI で直接直して SoT が古いまま、というずれが起きうる（価格 select 失敗でも ok:true を返す偽成功の前例あり）。
 * 公開ページの構造化データ（ログイン不要）で、listed の全サービスについて次を突合する:
 *   価格 = priceYen／タイトル＋キャッチコピー／本文（空白・改行を除いて一致）／出品者名／販売可能状態
 *
 * 使い方:
 *   node scripts/check-coconala-live.mjs            # 全 listed を実査
 *   node scripts/check-coconala-live.mjs --json     # 結果を JSON で出力
 *
 * 終了コード: 0 = 全件一致 / 1 = 食い違いあり（live か SoT のどちらかを直す）/ 2 = 取得失敗が過半で検査不成立
 * 取得は公開ページの GET だけ（書き込み・ログインなし）。1件ごとに 1 秒あける。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readCatalog, readListings } from './lib/coconala-catalog.mjs';
import { parseServiceProduct, diffLiveService } from './lib/coconala-live.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchHtml(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = execFileSync('curl', ['-sS', '-L', '--max-time', '25', '-A', UA, '-w', '\n%{http_code}', url], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      const cut = out.lastIndexOf('\n');
      const status = Number(out.slice(cut + 1));
      if (status === 200) return { ok: true, html: out.slice(0, cut) };
      if (attempt === 2) return { ok: false, reason: `HTTP ${status}` };
    } catch (e) {
      if (attempt === 2) return { ok: false, reason: String(e.message).split('\n')[0] };
    }
  }
  return { ok: false, reason: 'unknown' };
}

const catalog = readCatalog();
const listings = readListings();
let sellerName = '';
try {
  sellerName = JSON.parse(readFileSync(join(ROOT, '.claude/config/coconala-account.json'), 'utf8')).sellerName || '';
} catch { /* 出品者名の照合だけ省く */ }

const all = Object.values(catalog);
const targets = all.filter((s) => s.status === 'listed');
const skipped = all.filter((s) => s.status !== 'listed').map((s) => `${s.id}(${s.status})`);
const results = [];
for (const [i, s] of targets.entries()) {
  if (i) await sleep(1000);
  if (!s.serviceUrl) {
    results.push({ id: s.id, ok: false, fetched: false, issues: ['listed なのに serviceUrl が空'] });
    continue;
  }
  const res = fetchHtml(s.serviceUrl);
  if (!res.ok) {
    results.push({ id: s.id, url: s.serviceUrl, ok: false, fetched: false, issues: [`取得失敗: ${res.reason}`] });
    continue;
  }
  const issues = diffLiveService(s, listings[s.id], parseServiceProduct(res.html), { sellerName });
  results.push({ id: s.id, url: s.serviceUrl, ok: issues.length === 0, fetched: true, issues });
}

const fetched = results.filter((r) => r.fetched).length;
const mismatched = results.filter((r) => r.fetched && !r.ok);
const failed = results.filter((r) => !r.fetched);
const summary = {
  checkedAt: new Date().toISOString(),
  targets: targets.length,
  fetched,
  matched: fetched - mismatched.length,
  mismatched: mismatched.length,
  fetchFailed: failed.length,
  skipped,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify({ summary, results }, null, 2)}\n`);
} else {
  console.log(`[check-coconala-live] 対象 listed ${targets.length} 件 / 実検査 ${fetched} 件 / 一致 ${summary.matched} / 食い違い ${mismatched.length} / 取得失敗 ${failed.length}（対象外 ${skipped.length} 件: draft・paused など）`);
  for (const r of [...mismatched, ...failed]) {
    console.log(`  ✗ ${r.id} ${r.url ?? ''}`);
    for (const issue of r.issues) console.log(`      - ${issue}`);
  }
  if (!mismatched.length && !failed.length) console.log('[check-coconala-live] ✓ 公開ページは全件カタログ／listings と一致');
}

// 食い違いは live か SoT の修正が要る（exit 1）。取得失敗が過半なら一致を言えないので検査不成立（exit 2）。
const code = mismatched.length ? 1 : failed.length && failed.length * 2 >= targets.length ? 2 : failed.length ? 1 : 0;
process.exitCode = code;
