#!/usr/bin/env node
// note 導線（ファネル）ドリフト監査。read-only。
//
// 検出するドリフト（資格別・L2 構築済みの資格のみ）:
//   D1 公開済み記事（noteUrl 有）に L3 CTA マーカーが欠落
//   D2 公開済みマガジン（その資格）が L2 もくじ記事に未収録
//   D3 L2 もくじが L1 サイトマップから未リンク
//   D4 L2 もくじ本文の bottomCta URL が config の L2 noteId と不一致
//
// 真実源: .claude/config/note-funnel.json / src/lib/note-magazines.ts / docs/reference/note-funnel-architecture.md
//
// 使い方:
//   node scripts/audit-note-funnel.mjs          # レポート（exit 0）
//   node scripts/audit-note-funnel.mjs --ci      # ドリフトで exit 1（CI ゲート）

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CI = process.argv.includes('--ci');
const CONFIG = JSON.parse(readFileSync(join(ROOT, '.claude/config/note-funnel.json'), 'utf8'));
const magSrc = readFileSync(join(ROOT, 'src/lib/note-magazines.ts'), 'utf8');

// note-magazines.ts から公開済みマガジン {id, noteId} を抽出
function publishedMagazines() {
  const out = [];
  const re = /\{[\s\S]*?id:\s*'([^']+)'[\s\S]*?published:\s*(true|false)[\s\S]*?noteUrl:\s*'([^']*)'[\s\S]*?\}/g;
  let m;
  while ((m = re.exec(magSrc))) {
    const [, id, published, noteUrl] = m;
    if (published === 'true' && noteUrl) {
      const noteId = (noteUrl.match(/\/m\/([a-z0-9]+)/) || [])[1] || '';
      out.push({ id, noteId, noteUrl });
    }
  }
  return out;
}
const MAGS = publishedMagazines();

const fm = (raw, k) => { const m = raw.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')); return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : ''; };

const drifts = [];
const info = [];

// L1 本文（D3 用）
const L1file = join(ROOT, CONFIG.L1.articleDir, 'article.md');
const L1body = existsSync(L1file) ? readFileSync(L1file, 'utf8') : '';

for (const [key, ex] of Object.entries(CONFIG.exams)) {
  if (!ex.L2.noteId) { info.push(`[${key}] L2 もくじ未構築（スキップ）`); continue; }

  // D3: L1 が L2 をリンクしているか
  if (L1body && !L1body.includes(ex.L2.noteId)) {
    drifts.push(`D3 [${key}] L2「${ex.L2.title}」(${ex.L2.noteId}) が L1 サイトマップから未リンク`);
  }

  // L2 もくじ本文
  const L2file = join(ROOT, ex.L2.articleDir, 'article.md');
  const L2body = existsSync(L2file) ? readFileSync(L2file, 'utf8') : '';

  // D4: L2 の bottomCta URL 整合（config 内）
  if (ex.bottomCta.text && !ex.bottomCta.text.includes(ex.L2.noteId)) {
    drifts.push(`D4 [${key}] config bottomCta が L2 noteId(${ex.L2.noteId}) を含まない`);
  }

  // D1: 公開済み記事の CTA 欠落
  const baseDir = join(ROOT, ex.articleGlob);
  const exclude = new Set(ex.excludeDirs || []);
  if (existsSync(baseDir)) {
    for (const d of readdirSync(baseDir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === 'magazines' || exclude.has(d.name)) continue;
      const f = join(baseDir, d.name, 'article.md');
      if (!existsSync(f)) continue;
      const raw = readFileSync(f, 'utf8');
      const url = fm(raw, 'noteUrl');
      if (!url) continue; // 未公開は対象外
      const miss = [];
      if (ex.topCta.text && !raw.includes(ex.topCta.marker)) miss.push('冒頭');
      if (ex.bottomCta.text && !raw.includes(ex.bottomCta.marker)) miss.push('末尾');
      if (miss.length) drifts.push(`D1 [${key}] 公開記事「${d.name}」に ${miss.join('・')} CTA 欠落`);
    }
  }

  // D2: 公開済みマガジンが L2 もくじに未収録
  const examMags = MAGS.filter(mg => (ex.magazineExamMatch || []).some(s => mg.id.includes(s)));
  for (const mg of examMags) {
    if (mg.noteId && L2body && !L2body.includes(mg.noteId)) {
      drifts.push(`D2 [${key}] 公開マガジン ${mg.id}(${mg.noteId}) が L2「${ex.L2.title}」に未収録`);
    }
  }
}

console.log('=== note 導線ドリフト監査 ===');
for (const i of info) console.log('  info: ' + i);
if (drifts.length === 0) {
  console.log(`[audit-note-funnel] ✓ ドリフトなし（公開記事 CTA / マガジン収録 / L1-L2 リンク 整合）`);
  process.exit(0);
}
console.log(`\n[audit-note-funnel] ✗ ドリフト ${drifts.length} 件:`);
for (const d of drifts) console.log('  - ' + d);
console.log('\n修復: npm run wire-note-funnel-cta -- --exam <key> --apply / L2 もくじへ追記 / L1 へ L2 リンク追記');
process.exit(CI ? 1 : 0);
