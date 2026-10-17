#!/usr/bin/env node
// アフィリエイト A8 mat の整合ゲート。
//
// 背景: GKS 等の転職 mat は本文インライン `<CareerAffiliate href>` で約 90 MDX に直書きされる。
// mat 変更時の取りこぼし・タイポ・未申告の新規 mat が
// 機械検知されないため（既存 check-* にアフィリ用は無かった）、SSOT 許可リスト
// config/affiliate-mats.json（台帳 config.affiliate-mats）と src/** ・ content/site/** の a8mat= を突合する。
//
// 判定:
//   - 許可リストに無い mat が出現 → ERROR（exit 1）。タイポ or 未申告の新規案件。
//   - expiresAt が過去日の mat が src/MDX に出現 → WARN（exit 0）。失効 creative の配置放置リマインド。
//   - プレースホルダ（XXXX 等、A8 mat 形式 "AAAA+BBBB+CCCC+DDDD" に合致しない）→ 無視。
//
// content/note の扱い（2026-09-22 追加）:
//   note は HTML/コンポーネント非対応で、A8 の「リンク先URLコピー」を **URL 単独行**で貼るのが
//   唯一の手段。したがって content/site の「生 mat 直書き禁止」をそのまま適用できない。
//   許可条件は **registry の surfaces に "note-article" を持つ mat だけ**（現状 NTJWY 1 種）。
//   それ以外の mat が note に出たら ERROR＝サイト用バナー mat の誤貼り・未申告案件を止める。
//   それまで content/note は走査対象外で、note の 6 本は registry ゲートの外にあった。
//
// 他サイトの提携の素材（2026-10-17 追加）:
//   A8 口座は stats47（サイト 001）と doboku-note（002）が同居し、同じ案件でも提携はサイトごとに別で、
//   mat の第2トークンが違う。DX の広告に stats47 側の mat を貼っていて、クリックが stats47 に帰属していた。
//   mat だけでは帰属が見えないので、A8 の画像 URL（svt/bgt）の wid が 002 以外なら ERROR にする。
//
// 使い方:
//   node scripts/check-affiliate-mats.mjs            # src/ + content/site + content/note 全体
//   node scripts/check-affiliate-mats.mjs --staged   # git staged の該当ファイルのみ（pre-commit 用）

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { todayJst } from './lib/jst-date.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { runBody, isCliEntry, runAsCli } from './lib/cli-run.mjs';

/** A8 口座の中での doboku-note のサイト番号（001 は stats47）。 */
export const DOBOKU_A8_WID = '002';
const WID_RE = /a8\.net\/svt\/bgt\?[^"'\s]*?wid=(\d+)/g;

/** A8 の画像 URL のうち、doboku-note 以外のサイトの提携のもの（wid）を返す。 */
export function foreignSiteWids(text) {
  return [...text.matchAll(WID_RE)].map((m) => m[1]).filter((wid) => wid !== DOBOKU_A8_WID);
}

// in-process でも呼べるよう run() に包んである（DN-0688・pre-commit-dispatch が import して呼ぶ）。
// process.argv / process.exit / process.exitCode は runBody が渡す __argv / __exit / __status への読み替え。
// 本文は字下げしていない（複数行の文字列を壊さないため）。CLI として起動したときの引数・出力・終了コードは従来と同じ。
export async function run({ argv = process.argv.slice(2) } = {}) {
  return runBody(argv, import.meta.url, async ({ argv: __argv, exit: __exit, status: __status }) => {

const STAGED = __argv.includes('--staged');
const REGISTRY = datasetPath('config.affiliate-mats');

if (!existsSync(REGISTRY)) {
  console.error(`[check-affiliate-mats] ${REGISTRY} が無いため検証をスキップ`);
  __exit(0);
}

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8')).mats;
const known = new Map(registry.map((m) => [m.mat, m]));
const today = todayJst(); // YYYY-MM-DD

// A8 mat 形式: 英数を + で 4 連結（例 4B3VR8+F0LMU2+4R40+TSBE9）。XXXX 等の単一トークンは除外。
const MAT_RE = /a8mat=([A-Z0-9]+(?:\+[A-Z0-9]+){3})/g;
const SCAN_DIRS = ['src', 'content/site', 'content/note'];
// note 本文で生 mat を許す唯一の条件（registry の surfaces）。
const NOTE_SURFACE = 'note-article';
const SCAN_EXT = /\.(ts|tsx|mjs|mts|js|jsx|md|mdx|json)$/;

const walk = (dir) => listFiles(dir, { match: (_path, name) => SCAN_EXT.test(name), allowMissing: true, followLinks: true }).map((p) => p.split('\\').join('/'));

let files;
if (STAGED) {
  const staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  files = staged.filter(
    (f) => existsSync(f) && SCAN_EXT.test(f) && SCAN_DIRS.some((d) => f.startsWith(d + '/')),
  );
} else {
  files = SCAN_DIRS.flatMap((d) => walk(d));
}

const unknown = []; // { file, mat }  src/ で許可リスト外
const mdxRaw = []; // { file, mat }  content/site に生 mat 直書き（禁止）
const noteDisallowed = []; // { file, mat }  content/note に note-article 以外の mat（禁止）
const foreignSite = []; // { file, wid }  A8 画像 URL の wid が doboku-note 以外
const expiredHits = new Set(); // mat
const seenKnown = new Set();

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const isMdx = file.startsWith('content/site');
  const isNote = file.startsWith('content/note');
  for (const wid of foreignSiteWids(text)) foreignSite.push({ file, wid });
  for (const m of text.matchAll(MAT_RE)) {
    const mat = m[1];
    // MDX 本文に生 mat 直書きは禁止（preset コンポーネント経由のみ）。既知/未知を問わず ERROR。
    if (isMdx) mdxRaw.push({ file, mat });
    if (known.has(mat)) {
      seenKnown.add(mat);
      const entry = known.get(mat);
      if (entry.expiresAt && entry.expiresAt < today) expiredHits.add(mat);
      // note は URL 単独行が唯一の手段なので生 mat を許すが、note 用に宣言された mat に限る。
      if (isNote && !(entry.surfaces ?? []).includes(NOTE_SURFACE)) noteDisallowed.push({ file, mat });
    } else if (isNote) {
      noteDisallowed.push({ file, mat });
    } else if (!isMdx) {
      unknown.push({ file, mat });
    }
  }
}

// レポート
if (expiredHits.size > 0) {
  console.warn('[check-affiliate-mats] ⚠ 期限切れ(expiresAt 経過)の mat が配置されています:');
  for (const mat of expiredHits) {
    const e = known.get(mat);
    console.warn(`  - ${mat} (${e.label}) expiresAt=${e.expiresAt}${e.note ? ' … ' + e.note : ''}`);
  }
}

if (mdxRaw.length > 0) {
  console.error(
    `[check-affiliate-mats] ✗ MDX 本文(content/site)に生 a8mat 直書きが ${mdxRaw.length} 件あります（禁止）:`,
  );
  for (const u of mdxRaw) console.error(`  - ${u.mat}  (${u.file})`);
  console.error(
    '  → MDX は preset コンポーネント経由にする（CareerAffiliate href / サイドバーは SidebarAdBanner）。',
  );
}

if (noteDisallowed.length > 0) {
  console.error(
    `[check-affiliate-mats] ✗ content/note に note 用でない a8mat が ${noteDisallowed.length} 件あります（禁止）:`,
  );
  for (const u of noteDisallowed) console.error(`  - ${u.mat}  (${u.file})`);
  console.error(
    `  → note に貼ってよいのは registry の surfaces に "${NOTE_SURFACE}" を持つ mat だけ（サイト用バナー mat の誤貼り・未申告案件を止める）。`,
  );
}

if (foreignSite.length > 0) {
  console.error(
    `[check-affiliate-mats] ✗ doboku-note（wid=${DOBOKU_A8_WID}）以外のサイトの提携の A8 素材が ${foreignSite.length} 件あります:`,
  );
  for (const u of foreignSite) console.error(`  - wid=${u.wid}  (${u.file})`);
  console.error(
    '  → クリックが他サイト（001=stats47）に帰属する。A8 の広告リンク作成で doboku-note を選んで取り直した mat と画像 URL に差し替える。',
  );
}

if (unknown.length > 0) {
  console.error(
    `[check-affiliate-mats] ✗ 許可リスト(${REGISTRY})に無い mat が ${unknown.length} 件見つかりました:`,
  );
  for (const u of unknown) console.error(`  - ${u.mat}  (${u.file})`);
  console.error(
    '  → 正規の新規案件なら affiliate-mats.json に追加、タイポなら mat を修正してください。',
  );
}

if (mdxRaw.length > 0 || unknown.length > 0 || noteDisallowed.length > 0 || foreignSite.length > 0) {
  __exit(1);
}

const scope = STAGED ? 'staged' : `${files.length} ファイル`;
console.log(
  `[check-affiliate-mats] ✓ ${scope} の a8mat は全て許可リストに存在（既知 ${seenKnown.size}/${known.size} 種が出現）`,
);
__exit(0);
  });
}

if (isCliEntry(import.meta.url)) runAsCli(run);
