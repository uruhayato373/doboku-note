#!/usr/bin/env node
// audit-note-cards.mjs — 全 note 公開記事のライブ本文を取り、「単独URL段落=未カード」を検出し、
//   doboku-note URL は OGP(og:image)の実在/到達も突合する read-only 監査。
//
// 背景: note の「URL→リンクカード(OGP埋め込み)」は /new(新規作成)でしか発火せず、公開記事の
//   編集画面では type / 実クリップボード貼付のどれでもカード化できない（2026-06-30 実機3回検証で確定。
//   真実源: .claude/skills/social/publish-note/references/update-mode.md「カード化の限界」）。
//   そのため公開時にカード化漏れした URL は素テキストのまま残る。本監査はその残骸を洗い出す。
//   原因分類: A=公開時カード化漏れ（大半・OGPは健全） / B=OGP欠落（doboku-note ページに og:image 無/404）。
//
// 使い方:
//   node scripts/audit-note-cards.mjs                 # 人間向けサマリ + 記事別一覧
//   node scripts/audit-note-cards.mjs --json          # 機械可読 JSON を stdout
//   node scripts/audit-note-cards.mjs --out <path>    # JSON をファイルへ保存
//   npm run audit-note-cards
//
// 前提: ネットワーク到達（note 公開 API・doboku-note）。会社PCのプロキシ下では不可（Mac 推奨）。
// read-only（投稿も編集もしない）。

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === 'article.md') acc.push(p);
  }
  return acc;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_DIR = join(ROOT, 'docs/note');
const JSON_OUT = process.argv.includes('--json');
const outIdx = process.argv.indexOf('--out');
const OUT = outIdx >= 0 ? process.argv[outIdx + 1] : null;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function curl(url, timeout = 25) {
  try {
    return execFileSync('curl', ['-s', '--ssl-no-revoke', '-L', '--max-time', String(timeout), url],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: (timeout + 5) * 1000 });
  } catch { return ''; }
}
function httpStatus(url, timeout = 20) {
  try {
    return execFileSync('curl', ['-s', '--ssl-no-revoke', '-o', '/dev/null', '-w', '%{http_code}', '-L', '--max-time', String(timeout), url],
      { encoding: 'utf8', timeout: (timeout + 5) * 1000 }).trim();
  } catch { return 'ERR'; }
}

// 1. 公開済み + noteId(または noteUrl) を持つ記事を収集
const files = walk(NOTE_DIR);
const arts = [];
for (const p of files) {
  const head = readFileSync(p, 'utf8').slice(0, 2500);
  let nid = (head.match(/^noteId:\s*"?([^"\s]+)"?/m) || [])[1] || '';
  if (!nid) nid = (head.match(/^noteUrl:\s*"?[^"\s]*?(n[0-9a-f]{10,})/m) || [])[1] || '';
  const status = (head.match(/^noteStatus:\s*(\S+)/m) || [])[1] || '';
  if (!nid || status !== 'published') continue;
  arts.push({ path: relative(ROOT, p), noteId: nid });
}
log(`対象記事: ${arts.length} 本`);

const URL_RE = /https?:\/\/[^\s"<>)\]]+/g;
const ogpCache = new Map();
async function checkOgp(url) {
  if (ogpCache.has(url)) return ogpCache.get(url);
  const html = curl(url);
  const m = html.match(/<meta[^>]+property="og:image"[^>]*content="([^"]+)"/) ||
            html.match(/<meta[^>]+content="([^"]+)"[^>]*property="og:image"/);
  let res;
  if (!m) res = { og: null, imgStatus: null };
  else res = { og: m[1], imgStatus: httpStatus(m[1]) };
  ogpCache.set(url, res);
  await sleep(300);
  return res;
}
const classify = (u) => u.includes('doboku-note.com') ? 'doboku-note'
  : (u.includes('note.com') ? 'note-internal' : 'external-other');

const report = [];
let totUncarded = 0, totOgpGap = 0;
for (const a of arts) {
  let body = '';
  try { body = JSON.parse(curl(`https://note.com/api/v3/notes/${a.noteId}`)).data.body || ''; } catch { body = ''; }
  await sleep(700);
  if (!body) { report.push({ ...a, error: 'body取得失敗' }); continue; }
  const carded = new Set([...body.matchAll(/<figure[^>]*data-src="([^"]+)"/g)].map((m) => m[1].replace(/\/$/, '')));
  const uncarded = [];
  for (const pm of body.matchAll(/<p[^>]*>(.*?)<\/p>/gs)) {
    const text = pm[1].replace(/<[^>]+>/g, '').trim();
    const urls = text.match(URL_RE) || [];
    if (urls.length === 1) {
      const u = urls[0].replace(/\/$/, '');
      const residual = text.replace(urls[0], '').trim();
      if (residual.length <= 2 && !carded.has(u)) uncarded.push(u);
    }
  }
  if (!uncarded.length) continue;
  const items = [];
  for (const u of [...new Set(uncarded)]) {
    const kind = classify(u);
    const e = { url: u, kind };
    if (kind === 'doboku-note') {
      const o = await checkOgp(u);
      const ok = o.og && o.imgStatus === '200';
      e.ogpOk = !!ok;
      e.ogpDetail = o.og ? o.imgStatus : 'og:image無し';
      e.cause = ok ? 'A' : 'B';
    } else e.cause = 'A';
    items.push(e);
  }
  totUncarded += items.length;
  totOgpGap += items.filter((x) => x.cause === 'B').length;
  report.push({ ...a, uncarded: items });
}

const out = {
  summary: {
    articlesScanned: arts.length,
    articlesWithUncarded: report.filter((r) => r.uncarded).length,
    totalUncardedUrls: totUncarded,
    ogpGapUrls: totOgpGap,
  },
  report,
};
if (OUT) { writeFileSync(OUT, JSON.stringify(out, null, 2)); log(`OUT: ${OUT}`); }
if (JSON_OUT) { process.stdout.write(JSON.stringify(out, null, 2) + '\n'); process.exit(0); }

console.log(`\n=== サマリ ===`);
console.log(`スキャン ${out.summary.articlesScanned} / 未カードあり ${out.summary.articlesWithUncarded} / 未カードURL ${out.summary.totalUncardedUrls} / OGP欠落 ${out.summary.ogpGapUrls}`);
for (const r of report.filter((x) => x.uncarded)) {
  const short = r.path.split('/').slice(2).join('/').replace('/article.md', '');
  console.log(`\n■ ${short}  (${r.noteId})`);
  for (const u of r.uncarded) console.log(`   - [${u.kind}] ${u.url}  → 原因${u.cause}${u.ogpDetail ? ` (ogp ${u.ogpDetail})` : ''}`);
}
