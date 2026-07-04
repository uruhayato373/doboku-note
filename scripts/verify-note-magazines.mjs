#!/usr/bin/env node
/**
 * verify-note-magazines.mjs
 * ---------------------------------------------------------------------------
 * note.com の公開マガジン一覧・各マガジンの収録記事を public API から取得し、
 * src/lib/note-magazines.ts（SoT）と突合してズレ（未配線・非公開化・価格ドリフト）
 * を検出する再利用ツール。
 *
 * 背景: ドキュメントと note 現実が乖離していた（例: 完全パックは「6本」と記載
 *       されていたが実際は 53 記事収録）。SoT と現実の定期照合を機械化する。
 *
 * 取得経路（会社 PC プロキシ対策）:
 *   - HTTP(S)_PROXY 環境変数を curl が自動利用（202.221.175.116:3128 等）
 *   - curl に --ssl-no-revoke を付与（schannel の失効確認エラー回避が必須）
 *   - note 公開 API（認証不要）:
 *       creators/{name}/contents?kind=magazine&page=N  … マガジン一覧
 *       /api/v1/magazines/{key}/notes?page=N            … マガジン収録記事
 *   - Playwright（@playwright/test 1.59.1 導入済）は API が壊れた場合の
 *     フォールバック。Nuxt SPA のため通常は API の方が堅牢。
 *
 * 使い方:
 *   npm run verify-note-magazines              # 一覧取得＋SoT突合（note↔note-magazines.ts）
 *   npm run verify-note-magazines -- --vs-txt  # note掲載文.txt(SoT)↔note も突合（タイトル/価格/説明/文字数）
 *   npm run verify-note-magazines -- --contents   # 各マガジンの収録記事も取得
 *   npm run verify-note-magazines -- --json       # スナップショットを JSON 保存
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseNoteText, checkLimits } from './lib/note-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CREATOR = 'dobokunote';
const SOT_PATH = join(ROOT, 'src/lib/note-magazines.ts');
const SNAPSHOT_DIR = join(ROOT, '.claude/state/note');

const args = process.argv.slice(2);
const WANT_CONTENTS = args.includes('--contents');
const WANT_JSON = args.includes('--json');
const WANT_VS_TXT = args.includes('--vs-txt');

/** curl で JSON を取得（プロキシ + 失効チェック無効化）。HTML が返ったら null。 */
function curlJson(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = spawnSync(
      'curl',
      ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json', url],
      { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 }
    );
    const body = (r.stdout || '').trim();
    if (body.startsWith('{') || body.startsWith('[')) {
      try {
        return JSON.parse(body);
      } catch {
        /* fallthrough to retry */
      }
    }
    // HTML（404）や空応答はリトライ
  }
  return null;
}

/** creator の全マガジンを取得（ページ送り）。 */
function fetchAllMagazines() {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const d = curlJson(
      `https://note.com/api/v2/creators/${CREATOR}/contents?kind=magazine&page=${page}`
    );
    const data = d?.data;
    const contents = data?.contents ?? [];
    if (contents.length === 0) break;
    for (const m of contents) {
      out.push({
        key: m.key,
        id: m.id,
        name: m.name,
        price: m.price ?? null,
        description: m.description ?? '',
        publishAt: m.publishAt ?? null,
      });
    }
    if (data?.isLastPage) break;
  }
  return out;
}

/** マガジンの収録記事を取得（ページ送り）。 */
function fetchMagazineNotes(key) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const d = curlJson(`https://note.com/api/v1/magazines/${key}/notes?page=${page}`);
    const notes = d?.data?.notes ?? [];
    if (notes.length === 0) break;
    for (const n of notes) {
      out.push({ key: n.key, name: n.name, price: n.price ?? 0 });
    }
    if (d?.data?.isLastPage) break;
  }
  return out;
}

/** note-magazines.ts（SoT）から id / published / noteUrl / price を抽出。 */
function parseSoT() {
  const ts = readFileSync(SOT_PATH, 'utf-8');
  const entries = [];
  // id / published / noteUrl はこの順で固定（ファイル規約）
  const re = /id:\s*'([^']+)',\s*published:\s*(true|false),\s*noteUrl:\s*'([^']*)'/g;
  let m;
  const indices = [];
  while ((m = re.exec(ts)) !== null) {
    indices.push({ id: m[1], published: m[2] === 'true', noteUrl: m[3], at: m.index });
  }
  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i];
    const next = indices[i + 1];
    const slice = ts.slice(cur.at, next ? next.at : ts.length);
    const pm = slice.match(/price:\s*'([^']*)'/);
    const keyMatch = cur.noteUrl.match(/\/m\/(m[0-9a-f]+)/);
    entries.push({
      id: cur.id,
      published: cur.published,
      noteUrl: cur.noteUrl,
      key: keyMatch ? keyMatch[1] : null,
      priceStr: pm ? pm[1] : null,
    });
  }
  return entries;
}

/** 価格文字列から先頭の ¥金額を数値で取り出す（"¥3,480（…）" → 3480）。 */
function priceNum(str) {
  if (!str) return null;
  const m = str.match(/¥?\s*([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}

/** note掲載文.txt（SoT）↔ note 公開状態 突合（--vs-txt）。 */
const normT = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '');
function commonPrefix(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
function findTxtFiles() {
  let entries = [];
  try { entries = readdirSync(join(ROOT, 'docs/note'), { recursive: true, encoding: 'utf-8' }); } catch { return []; }
  return entries.filter((f) => f.endsWith('note掲載文.txt')).map((f) => join(ROOT, 'docs/note', f));
}
function reconcileTxt(mags) {
  const out = [];
  let checked = 0, unpublished = 0;
  for (const p of findTxtFiles()) {
    let m;
    try { m = parseNoteText(readFileSync(p, 'utf-8')); } catch { continue; }
    // 説明文の先頭一致で最良マッチ（タイトルがドリフトしても同定できる）
    let best = null, bs = 0;
    for (const n of mags) { const s = commonPrefix(normT(m.description), normT(n.description)); if (s > bs) { bs = s; best = n; } }
    if (bs < 25 || !best) { unpublished++; continue; } // note に該当公開マガジン無し
    checked++;
    const label = p.split(/[/\\]/).slice(-2, -1)[0];
    const a = normT(m.description), b = normT(best.description);
    if (normT(m.title) !== normT(best.name)) out.push(`[タイトル差] ${label}: txt「${m.title}」≠ note「${best.name}」`);
    if (String(m.setPrice) !== String(best.price)) out.push(`[価格差] ${label}: txt¥${m.setPrice} ≠ note¥${best.price}`);
    if (!(a === b || a.startsWith(b.slice(0, 100)) || b.startsWith(a.slice(0, 100)))) out.push(`[説明差] ${label}`);
    const lint = checkLimits(m);
    if (lint.length) out.push(`[文字数超過] ${label}: ${lint.join(' / ')}`);
  }
  return { checked, unpublished, txtIssues: out };
}

function main() {
  console.log('=== note 公開マガジン照合 ===');
  console.log(`creator: ${CREATOR}`);

  const mags = fetchAllMagazines();
  if (mags.length === 0) {
    console.error(
      'ERROR: マガジンを取得できませんでした。プロキシ/疎通を確認してください。\n' +
        '  手動確認: curl -sS --ssl-no-revoke "https://note.com/api/v2/creators/dobokunote/contents?kind=magazine&page=1"'
    );
    process.exit(1);
  }
  console.log(`note 公開マガジン: ${mags.length} 件\n`);

  const sot = parseSoT();
  const sotByKey = new Map(sot.filter((e) => e.key).map((e) => [e.key, e]));
  const noteByKey = new Map(mags.map((m) => [m.key, m]));

  // --- 一覧表示 ---
  console.log('--- note 公開マガジン一覧（key / ¥price / SoT配線 / 価格整合）---');
  for (const m of mags) {
    const s = sotByKey.get(m.key);
    const wired = s ? `SoT:${s.id}` : 'SoT未配線';
    let pflag = '';
    if (s) {
      const sp = priceNum(s.priceStr);
      if (sp != null && sp !== m.price) pflag = `  ⚠価格 SoT¥${sp}≠note¥${m.price}`;
    }
    console.log(`  ${m.key}  ¥${m.price}  ${wired}${pflag}  ${m.name}`);
  }

  // --- 突合（ズレ検出）---
  const issues = [];
  for (const m of mags) {
    if (!sotByKey.has(m.key)) {
      issues.push(`[未配線] note公開「${m.name}」(${m.key}) が SoT に noteUrl 配線なし → エントリ追加 or noteUrl 反映`);
    }
  }
  for (const e of sot) {
    if (e.key && !noteByKey.has(e.key)) {
      issues.push(`[非公開化?] SoT ${e.id} の noteUrl(${e.key}) が note 一覧に無い（404/非公開化の疑い）`);
    }
    // noteUrl 空の真偽は noteUrl 文字列そのもので判定する。e.key は「マガジン(/m/…)キー」で、
    // 単品記事 SKU（noteUrl が /n/… の暗記ノート等）は key=null でも noteUrl は配線済み。
    // ここで !e.key を使うと単品記事を「noteUrl 空」と誤検知する（2026-07-04 是正）。
    if (e.published && !e.noteUrl) {
      issues.push(`[要修正] SoT ${e.id} は published:true だが noteUrl 空`);
    }
  }
  for (const m of mags) {
    const s = sotByKey.get(m.key);
    if (s) {
      const sp = priceNum(s.priceStr);
      if (sp != null && sp !== m.price) {
        issues.push(`[価格ドリフト] ${s.id}: SoT¥${sp} ≠ note¥${m.price}（${m.name}）`);
      }
    }
  }

  console.log('\n--- 突合結果（note↔note-magazines.ts）---');
  if (issues.length === 0) {
    console.log('  OK: ズレなし（note公開↔SoT配線↔価格すべて一致）');
  } else {
    for (const i of issues) console.log(`  ${i}`);
  }

  // --- note掲載文.txt（SoT）↔ note 突合（--vs-txt）---
  let txtIssues = [];
  if (WANT_VS_TXT) {
    const r = reconcileTxt(mags);
    txtIssues = r.txtIssues;
    console.log(`\n--- 突合結果（note掲載文.txt↔note・公開${r.checked}本/未公開${r.unpublished}本）---`);
    if (txtIssues.length === 0) console.log('  OK: txt(SoT) と note 公開状態は一致');
    else for (const i of txtIssues) console.log(`  ${i}`);
  }

  // --- 収録記事（任意）---
  const contentsByKey = {};
  if (WANT_CONTENTS) {
    console.log('\n--- 各マガジンの収録記事 ---');
    for (const m of mags) {
      const notes = fetchMagazineNotes(m.key);
      contentsByKey[m.key] = notes;
      console.log(`\n### ${m.name}  (${m.key}) ¥${m.price}  収録${notes.length}件`);
      for (const n of notes) {
        console.log(`   ¥${n.price}  ${n.key}  ${String(n.name).slice(0, 52)}`);
      }
    }
  }

  // --- JSON スナップショット（任意）---
  if (WANT_JSON) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const snapshot = {
      fetchedAt: new Date().toISOString(),
      creator: CREATOR,
      magazineCount: mags.length,
      magazines: mags.map((m) => ({
        ...m,
        sotId: sotByKey.get(m.key)?.id ?? null,
        notes: contentsByKey[m.key] ?? undefined,
      })),
      issues,
    };
    const outPath = join(SNAPSHOT_DIR, 'magazines-snapshot.json');
    writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`\nスナップショット保存: ${outPath}`);
  }

  const total = issues.length + txtIssues.length;
  console.log(`\n完了: マガジン ${mags.length} 件 / SoTズレ ${issues.length} 件${WANT_VS_TXT ? ` / txtズレ ${txtIssues.length} 件` : ''}`);
  process.exit(total === 0 ? 0 : 2);
}

main();
