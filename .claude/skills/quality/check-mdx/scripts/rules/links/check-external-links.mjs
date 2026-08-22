#!/usr/bin/env node

/**
 * 外部リンク切れチェッカー
 * 全MDXファイル内の外部URL（https://）をHTTP HEADで検証する。
 *
 * Usage:
 *   node scripts/check-external-links.mjs              # 全ファイル
 *   node scripts/check-external-links.mjs --concurrency 5  # 並列数指定
 */

import fs from 'fs';
import path from 'path';
import { SITE_CONTENT_ROOT } from '../../../../../../../scripts/lib/repository-paths.mjs';

const postsDir = SITE_CONTENT_ROOT;
const TIMEOUT_MS = 15000;
const CONCURRENCY = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--concurrency') || '10');
const SKIP_DOMAINS = new Set(['localhost', 'storage.doboku-note.com', 'doboku-note.com']);

// Step 1: 全MDXファイルから外部URLを抽出
function findMdxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'img' || entry.name === 'node_modules') continue;
      results.push(...findMdxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractExternalUrls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const urls = [];
  const urlPattern = /https?:\/\/[^\s)）\]"<>]+/g;

  for (let i = 0; i < lines.length; i++) {
    let match;
    while ((match = urlPattern.exec(lines[i])) !== null) {
      let url = match[0].replace(/[。、）)']+$/, '');
      try {
        new URL(url);
      } catch {
        continue;
      }
      const domain = new URL(url).hostname;
      if (SKIP_DOMAINS.has(domain)) continue;
      urls.push({ url, line: i + 1 });
    }
  }
  return urls;
}

// Step 2: HTTP HEAD でチェック（フォールバックでGET）
async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // HEAD first
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'doboku-note-link-checker/1.0' },
    });

    // Some servers reject HEAD, retry with GET
    if (res.status === 405 || res.status === 403) {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
      try {
        res = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'doboku-note-link-checker/1.0' },
        });
      } finally {
        clearTimeout(timer2);
      }
    }

    return { url, status: res.status, ok: res.ok, redirected: res.redirected, finalUrl: res.url };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { url, status: 0, ok: false, error: 'TIMEOUT' };
    }
    return { url, status: 0, ok: false, error: err.code || err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Step 3: 並列実行（セマフォ）
async function checkWithConcurrency(urls, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const current = idx++;
      const result = await checkUrl(urls[current]);
      results[current] = result;
      const icon = result.ok ? '.' : result.error === 'TIMEOUT' ? 'T' : 'X';
      process.stderr.write(icon);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  process.stderr.write('\n');
  return results;
}

// メイン処理
const files = findMdxFiles(postsDir);
const allEntries = []; // { file, relativePath, url, line }
const uniqueUrls = new Map(); // url -> [{ file, line }]

for (const filePath of files) {
  const relativePath = path.relative(postsDir, filePath);
  const urls = extractExternalUrls(filePath);
  for (const { url, line } of urls) {
    allEntries.push({ filePath, relativePath, url, line });
    if (!uniqueUrls.has(url)) uniqueUrls.set(url, []);
    uniqueUrls.get(url).push({ relativePath, line });
  }
}

console.log(`\n🔗 外部リンクチェック`);
console.log(`   対象ファイル: ${files.length}`);
console.log(`   外部URL（のべ）: ${allEntries.length} 件`);
console.log(`   外部URL（ユニーク）: ${uniqueUrls.size} 件`);
console.log(`   並列数: ${CONCURRENCY}`);
console.log(`   タイムアウト: ${TIMEOUT_MS / 1000}秒\n`);

console.log(`チェック中...`);
const urlList = [...uniqueUrls.keys()];
const results = await checkWithConcurrency(urlList, CONCURRENCY);

// 結果を分類
const broken = [];   // 404, 410, 5xx
const redirected = []; // 301, 302 (but ok)
const timeout = [];  // timeout
const errors = [];   // network errors
const ok = [];       // 200

for (let i = 0; i < urlList.length; i++) {
  const r = results[i];
  const locations = uniqueUrls.get(r.url);

  if (r.error === 'TIMEOUT') {
    timeout.push({ ...r, locations });
  } else if (r.error) {
    errors.push({ ...r, locations });
  } else if (r.status === 404 || r.status === 410) {
    broken.push({ ...r, locations });
  } else if (r.status >= 400) {
    errors.push({ ...r, locations });
  } else {
    ok.push({ ...r, locations });
  }
}

// レポート出力
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 結果サマリー`);
console.log(`${'='.repeat(60)}`);
console.log(`   ✅ OK:        ${ok.length} 件`);
console.log(`   ❌ リンク切れ:  ${broken.length} 件`);
console.log(`   ⏱️  タイムアウト: ${timeout.length} 件`);
console.log(`   ⚠️  エラー:     ${errors.length} 件`);

function printSection(title, items) {
  if (items.length === 0) return;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'─'.repeat(60)}`);
  for (const item of items) {
    const statusStr = item.error || `HTTP ${item.status}`;
    console.log(`\n  ${statusStr}: ${item.url}`);
    for (const loc of item.locations) {
      console.log(`    📄 ${loc.relativePath}:${loc.line}`);
    }
  }
}

printSection('❌ リンク切れ（404/410）— 要修正', broken);
printSection('⚠️  エラー（接続不可・拒否等）— 要確認', errors);
printSection('⏱️  タイムアウト — 要確認（政府サイトは遅いだけの場合あり）', timeout);

if (broken.length === 0 && errors.length === 0 && timeout.length === 0) {
  console.log(`\n✅ すべての外部リンクが有効です。\n`);
}

console.log('');
process.exit(broken.length > 0 ? 1 : 0);
