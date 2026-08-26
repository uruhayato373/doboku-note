#!/usr/bin/env node
// note 記事 frontmatter `noteStatus` ↔ ライブ公開状態の照合 reconciler。
//
// 背景（再発防止の対象）: note-publish.mjs の writeback は noteUrl/noteId/notePublishedAt を
//   frontmatter へ書き戻すが、`noteStatus` は対象外だった（2026-06-21 に行追加済）。さらに
//   予約投稿は go-live が note サーバ側で後刻に起きるためローカルで書き戻す機会が無い。結果
//   「ライブは published なのに frontmatter は draft」というドリフトが発生する（2026-06-21、
//   建設部門 無料入口 16 本で実害化）。実シグナルは「noteUrl 非空 OR noteStatus に publish」の
//   OR（note-lint / check-note-3set）ゆえ機能は壊れず、検知されないまま放置されるのが厄介。
//   本スクリプトはライブ真実と突合して SoT を自己修復する。
//
// 対象は「noteStatus 行を持つ記事」のみ（=この値を運用している記事）。noteStatus 行が無い記事
//   （マガジン収録記事の一部など noteUrl で管理する別規約）には field を注入しない。
//
// 同系統: verify-note-magazines(マガジン SoT↔live)・audit-note-funnel --live(CTA 反映 D5)。
//   いずれも note-live-audit.yml が週次実行する。note 公開 API は creds 不要
//   （会社 PC プロキシ対策の --ssl-no-revoke を踏襲）。連続取得はレート制限されるため
//   throttle + retry を入れている。
//
// 使い方:
//   node scripts/verify-note-status.mjs          # 照合レポート（read-only・exit 0）
//   node scripts/verify-note-status.mjs --fix     # ライブ published に合わせ既存 noteStatus 行を是正
//   node scripts/verify-note-status.mjs --json     # 結果を JSON で stdout 出力
//   node scripts/verify-note-status.mjs --ci       # ドリフト/検査不成立で exit 1（GitHub Actions 用）

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_DIR = join(ROOT, 'content/note');
const FIX = process.argv.includes('--fix');
const JSON_OUT = process.argv.includes('--json');
const CI = process.argv.includes('--ci');
// --snapshot: 結果を .claude/state/note/status-snapshot.json へ永続化する。
// これが無かったため、記事別のライブ公開状態は CI artifact にしか残らず、
// 管理画面からも週次レビューからも見えなかった（2026-08-24）。stdout の出力は変えない。
const SNAPSHOT = process.argv.includes('--snapshot');
const MAX_FETCH_FAIL_RATE = 0.2;

if (CI && FIX) {
  console.error('[verify-note-status] --ci と --fix は併用できません（CI は read-only）。');
  process.exit(2);
}

const sleepSync = (sec) => { try { execFileSync('sleep', [String(sec)]); } catch {} };

// content/note 配下の article.md を再帰収集
function findArticles(dir) {
  const out = [];
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...findArticles(p));
    // 型別ファイル（article-<型>.md）を落とさない。固定名にすると建設部門の大半が
    // 最初から対象外になり「検査したつもり」になる（2026-07-28 に他4本で直した欠陥クラス）。
    else if (/^article(-[^/\\]+)?\.md$/.test(e.name)) out.push(p);
  }
  return out;
}

// frontmatter ブロック（先頭 --- … ---）
function fmBlock(raw) {
  // CRLF 対応（content/note は 720 本中 710 本が CRLF）。`\r?` が無いと frontmatter を
  // 一切読めず、全件 untracked で continue → 「ドリフトなし」の緑を毎週 CI が出していた
  // （2026-08-13 実測: 525 件読んで 525 件スキップ）。BOM も剥がす。
  const m = raw.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}
const hasField = (block, k) => new RegExp('^' + k + ':', 'm').test(block);
const fm = (block, k) => {
  const m = block.match(new RegExp('^' + k + ':[ \\t]*(?:"(.*?)"|\'(.*?)\'|(.+?))[ \\t]*$', 'm'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : '';
};

// note 公開 API のライブ status を返す。'published' / 'draft' 等 / '404'(確定不在) / null(取得不能)
function fetchLiveStatus(noteId, attempt = 0) {
  let out = '';
  try {
    out = execFileSync(
      'curl',
      ['-s', '--ssl-no-revoke', '--max-time', '20', '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json', `https://note.com/api/v3/notes/${noteId}`],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    );
  } catch { out = ''; }
  try {
    const d = JSON.parse(out);
    const data = d.data || d;
    if (data && data.status) return data.status;
    // JSON は取れたが status 無し＝error オブジェクト（不在/非公開）→ 確定 404 扱い（retry しない）
    return '404';
  } catch {
    // 空/非JSON＝throttle or network。最大2回 retry（待ち時間を伸ばす）
    if (attempt < 2) { sleepSync(1.5 + attempt); return fetchLiveStatus(noteId, attempt + 1); }
    return null;
  }
}

// frontmatter ブロック内の既存 noteStatus 行のみを置換（行末コード保持・注入はしない）
function setNoteStatus(raw, value) {
  const m = raw.match(/^(---\n[\s\S]*?\n---)/);
  if (!m) return raw;
  const head = m[1];
  if (!/^noteStatus:.*$/m.test(head)) return raw; // 行が無ければ何もしない
  return raw.replace(head, head.replace(/^noteStatus:.*$/m, `noteStatus: ${value}`));
}

const articles = findArticles(NOTE_DIR);
const drift = [];     // ライブ=published / 既存 noteStatus≠publish（自己修復対象）
const warn = [];      // noteStatus=publish 主張だがライブ≠published（手動確認）
const noLive = [];    // noteId 有だが取得不能（throttle/network・予約未live）
let tracked = 0, untracked = 0, noId = 0, fixedCount = 0;

for (const file of articles) {
  const raw = readFileSync(file, 'utf8');
  const block = fmBlock(raw);
  const rel = file.slice(ROOT.length + 1);
  if (!hasField(block, 'noteStatus')) { untracked++; continue; } // この値を運用しない記事は対象外
  tracked++;
  const noteId = fm(block, 'noteId');
  const status = fm(block, 'noteStatus');
  const fmPublished = /publish/i.test(status);
  if (!noteId) {
    noId++;
    // URL 未付与。noteStatus が publish 主張なら不整合（公開済みなのに ID 欠落）
    if (fmPublished) warn.push({ rel, noteId: '(空)', status, live: 'no-id' });
    continue;
  }
  sleepSync(0.4); // throttle（レート制限回避）
  const live = fetchLiveStatus(noteId);
  if (live === 'published') {
    if (!fmPublished) {
      drift.push({ rel, noteId, status, live });
      if (FIX) { writeFileSync(file, setNoteStatus(raw, 'published')); fixedCount++; }
    }
  } else if (live === null) {
    noLive.push({ rel, noteId, status });
  } else { // '404' や 'draft' 等
    if (fmPublished) warn.push({ rel, noteId, status, live });
  }
}

const fetchTargets = tracked - noId;
const fetchFailRate = fetchTargets ? noLive.length / fetchTargets : 1;
const notConclusive = fetchTargets === 0 || fetchFailRate > MAX_FETCH_FAIL_RATE;
const failed = drift.length > 0 || warn.length > 0 || notConclusive;
const result = {
  tracked,
  untracked,
  noId,
  fetchTargets,
  inspected: fetchTargets - noLive.length,
  fetchFail: noLive.length,
  fetchFailRate,
  notConclusive,
  drift,
  warn,
  noLive,
  fixed: fixedCount,
};

if (SNAPSHOT) {
  const out = join(ROOT, '.claude/state/note/status-snapshot.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify({ fetchedAt: new Date().toISOString(), ...result }, null, 2)}
`);
  console.error(`[verify-note-status] snapshot を書きました: ${out}`);
}

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[verify-note-status] article*.md ${tracked + untracked} 本を走査 → noteStatus 運用 ${tracked} 本を照合（非運用 ${untracked} 本スキップ）`);
  // 検査ゼロを PASS と呼ばない。走査はしたのに 1 本も照合できていない状態は
  // 「ドリフトなし」ではなく「検査不成立」（2026-08-13 まで CRLF で毎週これが起きていた）。
  if (tracked + untracked > 0 && tracked === 0) {
    console.error('[verify-note-status] NG: 走査 ' + (tracked + untracked) + ' 本すべてで frontmatter を読めていない（検査不成立）');
    console.error('  frontmatter パーサ（CRLF/BOM）か走査対象の指定を疑うこと。');
    process.exitCode = 1;
  }
  if (drift.length) {
    console.log(`\n■ ドリフト（ライブ=published / noteStatus≠publish）: ${drift.length} 本${FIX ? ' → 是正済み' : ''}`);
    for (const d of drift) console.log(`  ${FIX ? 'FIX ' : 'DRIFT '}[${d.status || '空'}→published] ${d.rel}`);
    if (!FIX) console.log(`  → 是正するには: npm run verify-note-status -- --fix`);
  }
  if (warn.length) {
    console.log(`\n■ 要確認（noteStatus=publish 主張 / ライブ≠published）: ${warn.length} 本（自動修正しない）`);
    for (const w of warn) console.log(`  WARN [fm=${w.status} live=${w.live}] ${w.rel}`);
  }
  if (noLive.length) {
    console.log(`\n■ ライブ取得不能 ${noLive.length} 本（throttle/network・予約未live の可能性・再実行で確認）`);
    for (const n of noLive) console.log(`  - [${n.status}] ${n.rel} (${n.noteId})`);
  }
  if (notConclusive) {
    console.error(
      `\n■ 検査不成立: API 照合対象 ${fetchTargets} 本中 ${noLive.length} 本が取得不能` +
      `（${Math.round(fetchFailRate * 100)}%・上限 ${Math.round(MAX_FETCH_FAIL_RATE * 100)}%）`,
    );
  } else if (!drift.length && !warn.length) {
    console.log(`  ✓ ドリフトなし（実検査 ${result.inspected} 本・noteStatus とライブが整合）`);
  }
}

process.exit(CI && failed ? 1 : 0);
