/**
 * note カバーの参照契約（DN-0111 Phase 2 / 4-B）。
 *
 * 守りたい事故:
 *   generate-note-covers は同じ描画結果を SVG と PNG の両方へ書いていた。V4 の SVG は背景写真を
 *   data:image base64 で丸ごと内包するため 1 枚 1.5〜2.6 MiB あり、827 件 1,288.6 MiB（HEAD の 31%）を
 *   追跡していた。読むコードは 1 行も無く（note-publish / note-update-cover / note-cover-gallery /
 *   note-lint / check-note-cover-fit / check-note-3set は全て cover*.png のみ）、R2 にも無い。
 *   2026-08-21 に生成停止＋追跡解除した。
 *
 * ここで固定するのは 2 点:
 *   1. cover*.svg が二度と追跡に戻らないこと（生成器の revert・手置き・別スクリプトの追加、どれでも落ちる）
 *   2. note-publish が解決するカバー PNG が全記事で解決でき 1280×670 であること
 *
 * Phase 4-B で cover PNG は R2 へ退避して追跡から外した。以後 CI のツリーには実体が無い。
 * そこで解決先を「ローカル実体 **または** manifest エントリ」に広げる。ただし
 * **寸法検査を「ローカルに在る分だけ」にはしない** —— 全件退避した瞬間に 0 件検査の緑になるからだ
 * （CLAUDE.md §9）。退避時に実バイトのヘッダから測った width/height が manifest に載っているので、
 * 実体が無い分はその記録を検査する。sha256 が同じである限り記録は実体の性質を指し続ける。
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadManifest, toPosix } from '../scripts/lib/asset-storage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = loadManifest();

// core.quotepath=false は必須。content/note は大半が日本語ディレクトリで、
// 既定の 8 進エスケープのままだと existsSync が全件 false になり「検査ゼロの緑」になる。
const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024,
  });

const trackedNoteFiles = () => git(['ls-files', 'content/note']).split('\n').filter(Boolean);

/** PNG の IHDR から寸法を読む（先頭 24 バイトのみ。sharp 非依存で速い）。 */
function pngSize(absPath) {
  const fd = openSync(absPath, 'r');
  const buf = Buffer.alloc(24);
  const n = readSync(fd, buf, 0, 24, 0);
  closeSync(fd);
  if (n < 24) return null;
  if (buf.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null; // PNG signature
  if (buf.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * note-publish.mjs:90-91 のカバー解決契約。
 *   article-II1.md → img/cover-II1.png、無ければ img/cover.png
 *   article.md     → img/cover.png
 * 実装を import できない（note-publish は import 時に Playwright を起動する CLI）ため、
 * ここでは契約の**結果**を検証する。
 *
 * 返り値の source は 'local'（実体あり）か 'manifest'（退避済み）。どちらでもなければ null。
 */
function resolveCover(articleRelPath) {
  const dir = dirname(articleRelPath);
  const base = articleRelPath.slice(dir.length + 1);
  const m = base.match(/^article-([A-Za-z0-9][A-Za-z0-9-]*)\.md$/);
  const candidates = [];
  if (m) candidates.push(join(dir, 'img', `cover-${m[1]}.png`));
  candidates.push(join(dir, 'img', 'cover.png'));
  // path は **posix で返す**。join() は Windows で `\` を返すため、そのまま返すと
  // 呼び出し側の `/cover-XXX.png$/` が当たらず「型別が 1 件も解決しない」という
  // Windows 限定の偽赤になる（manifest のキーも posix なので、ここで揃えるのが筋）。
  for (const c of candidates) {
    if (existsSync(join(ROOT, c))) return { path: toPosix(c), source: 'local' };
  }
  for (const c of candidates) {
    const e = MANIFEST.entries?.[toPosix(c)];
    if (e) return { path: toPosix(c), source: 'manifest', entry: e };
  }
  return null;
}

test('cover*.svg は 1 件も追跡されていない（生成停止の回帰ゲート）', () => {
  const files = trackedNoteFiles();
  assert.ok(files.length > 100, '追跡 note ファイルが取れていない＝検査不成立（' + files.length + ' 件）');
  const svgs = files.filter((p) => /\/img\/cover[A-Za-z0-9_-]*\.svg$/.test(p));
  assert.deepEqual(
    svgs.slice(0, 5), [],
    'cover*.svg が追跡に戻っている（' + svgs.length + ' 件）。generate-note-covers は PNG のみを出力し、'
    + '中間 SVG は --emit-svg で .tmp/note-covers/ へ出す。.gitignore の content/note/**/img/cover*.svg も確認すること。',
  );
});

test('図版 SVG（figure-*）は巻き込まれず追跡されたままである', () => {
  // .gitignore のパターンが広すぎて figure-*.svg まで外していないかを見る。
  // note の図版は本文が参照する原本で、消えると記事が壊れる。
  const figures = trackedNoteFiles().filter((p) => /\/img\/figure-[^/]*\.svg$/.test(p));
  assert.ok(figures.length > 0, 'note の figure-*.svg が 1 件も追跡されていない＝ignore が広すぎる疑い');
});

test('全 note 記事でカバー PNG が解決でき、1280×670 である', () => {
  const articles = trackedNoteFiles().filter((p) => /\/article(-[A-Za-z0-9][A-Za-z0-9-]*)?\.md$/.test(p));
  assert.ok(articles.length > 500, '記事が取れていない＝検査不成立（' + articles.length + ' 件）');

  const missing = [];   // ローカルにも manifest にも無い＝publish が壊れる
  const notPng = [];    // 拡張子は .png なのに PNG ではない
  const noProof = [];   // 退避済みなのに sha256/bytes/寸法の記録が欠けている＝復元も検証もできない
  const wrongSize = [];
  let fromLocal = 0;
  let fromManifest = 0;

  for (const a of articles) {
    const r = resolveCover(a);
    if (!r) { missing.push(a); continue; }
    if (r.source === 'local') {
      fromLocal++;
      const size = pngSize(join(ROOT, r.path));
      if (!size) { notPng.push(r.path); continue; }
      if (size.width !== 1280 || size.height !== 670) wrongSize.push(r.path + ' = ' + size.width + '×' + size.height);
    } else {
      fromManifest++;
      const e = r.entry;
      if (!e.sha256 || !e.bytes || !e.width || !e.height) { noProof.push(r.path); continue; }
      if (e.width !== 1280 || e.height !== 670) wrongSize.push(r.path + ' = ' + e.width + '×' + e.height + '（manifest 記録）');
    }
  }

  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）。
  // ローカル実体が 0 件でも manifest 経由で全件検査していれば成立する。両方 0 なら不成立。
  assert.ok(
    fromLocal + fromManifest > 500,
    '解決できたカバーが ' + (fromLocal + fromManifest) + ' 件しかない＝検査不成立'
    + '（ローカル ' + fromLocal + ' / manifest ' + fromManifest + '）',
  );
  assert.deepEqual(missing.slice(0, 5), [], 'カバーがローカルにも manifest にも無い記事がある（' + missing.length + ' 件）');
  assert.deepEqual(notPng.slice(0, 5), [], '拡張子が .png なのに PNG ではないカバーがある（' + notPng.length + ' 件）');
  assert.deepEqual(noProof.slice(0, 5), [], '退避済みだが sha256/bytes/寸法の記録が欠けたカバーがある（' + noProof.length + ' 件）');
  assert.deepEqual(wrongSize.slice(0, 5), [], 'note 推奨の 1280×670 でないカバーがある（' + wrongSize.length + ' 件）');
});

test('型別カバー（article-XXX.md → cover-XXX.png）の解決が働いている', () => {
  // 選択科目型（article-II1.md 等）は 195 件ある。フォールバックだけで通ってしまうと
  // 「全部 cover.png に落ちている」状態を緑と誤認するので、型別が実際に解決していることを見る。
  const articles = trackedNoteFiles().filter((p) => /\/article-[A-Za-z0-9][A-Za-z0-9-]*\.md$/.test(p));
  assert.ok(articles.length > 0, '型別 article が 1 件も無い＝検査不成立');
  const typed = articles.filter((a) => {
    const c = resolveCover(a);
    return c && /\/cover-[A-Za-z0-9-]+\.png$/.test(c.path);
  });
  assert.ok(
    typed.length > articles.length * 0.8,
    '型別 article ' + articles.length + ' 件のうち型別カバーへ解決したのは ' + typed.length + ' 件だけ',
  );
});
