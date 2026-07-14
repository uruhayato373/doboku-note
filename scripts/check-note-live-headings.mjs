#!/usr/bin/env node
/**
 * check-note-live-headings.mjs — note 公開記事の「URL 見出し化」横断検査
 *
 * 背景: note-publish / note-update-body のリンクカード化に、URL が h2 見出しに化けて
 * note ネイティブ目次に URL が露出するグリッチがあった（2026-07-14 に published 291本中
 * 7本で発覚・lib/note-cardify.mjs で根治済み）。本スクリプトはその横断検知網:
 * SoT（docs/note/⋆⋆/article.md frontmatter）の noteStatus=published 全記事の live 本文を
 * note public API で取得し、見出しタグ（h1-6）内に URL を含む記事を列挙する。
 *
 * 使い方:
 *   npm run check-note-live-headings           # 全 published を検査（並列8・約1分）
 *   node scripts/check-note-live-headings.mjs docs/note/共通   # パス部分一致で絞り込み
 *
 * 出力/終了コード:
 *   BAD（URL見出しあり）1件以上 → exit 1（一覧表示。修復: note-update-body --commit 再貼付）
 *   FETCH_ERR は WARN 扱い（ネットワーク由来の偽陰性と区別するため件数報告のみ・exit 0）。
 *   会社PCプロキシ下で全件 FETCH_ERR になる場合は Mac などプロキシ外で実行する。
 *
 * 真実源: docs/reference/note-api-verification.md「live 見出しURL検査」
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILTER = process.argv[2] || '';
const CONCURRENCY = 8;

function walk(dir, acc) {
  for (const c of readdirSync(dir)) {
    const p = join(dir, c);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (c === 'article.md') acc.push(p);
  }
  return acc;
}

const targets = [];
for (const f of walk(join(ROOT, 'docs/note'), [])) {
  if (FILTER && !f.includes(FILTER)) continue;
  const t = readFileSync(f, 'utf8');
  if (!t.startsWith('---')) continue;
  const fm = t.split('---')[1] || '';
  if (!/noteStatus:\s*"?published"?/.test(fm)) continue;
  const m = fm.match(/noteId:\s*"?(n[0-9a-f]{12})"?/);
  if (m) targets.push({ noteId: m[1], path: f.slice(ROOT.length + 1) });
}
console.log(`[check-note-live-headings] published ${targets.length} 件を検査`);

async function check({ noteId, path }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://note.com/api/v3/notes/${noteId}`, { signal: AbortSignal.timeout(20000) });
      const body = (await res.json())?.data?.body || '';
      const bad = [];
      for (const m of body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)) {
        const text = m[2].replace(/<[^>]+>/g, '').trim();
        if (/https?:\/\//.test(text)) bad.push(`h${m[1]}: ${text.slice(0, 70)}`);
      }
      return { noteId, path, status: bad.length ? 'BAD' : 'OK', bad };
    } catch (e) {
      if (attempt === 2) return { noteId, path, status: 'FETCH_ERR', bad: [], err: String(e?.message || e).slice(0, 60) };
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

const results = [];
for (let i = 0; i < targets.length; i += CONCURRENCY) {
  results.push(...(await Promise.all(targets.slice(i, i + CONCURRENCY).map(check))));
}

const bad = results.filter((r) => r.status === 'BAD');
const errs = results.filter((r) => r.status === 'FETCH_ERR');
for (const r of bad) console.error(`  BAD ${r.noteId} ${r.path}\n      ${r.bad.join('\n      ')}`);
if (errs.length) console.log(`  WARN: FETCH_ERR ${errs.length} 件（ネットワーク未達・再実行かプロキシ外で確認）: ${errs.slice(0, 3).map((r) => r.noteId).join(', ')}${errs.length > 3 ? '…' : ''}`);

if (bad.length) {
  console.error(`[check-note-live-headings] ✗ URL見出しを含む公開記事 ${bad.length} 件。修復: node scripts/note-update-body.mjs --article <path> --commit`);
  process.exit(1);
}
console.log(`[check-note-live-headings] ✓ ${results.length - errs.length} 件検査・URL見出しなし${errs.length ? `（未達 ${errs.length} 件は要再実行）` : ''}`);
