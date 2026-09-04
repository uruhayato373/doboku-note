#!/usr/bin/env node
/**
 * check-note-cover-coverage.mjs
 * ---------------------------------------------------------------------------
 * note 記事のカバー PNG が「ローカル実体 または R2 退避台帳（manifest）」で全件解決でき、
 * 1280×670 であることを検査する。tests/note-cover-contract.test.mjs（unit-tests）の判定を
 * CLI として切り出したもので、判定は同一（テストは本ファイルを import する）。
 *
 * なぜ CLI が要るか:
 *   cover PNG は DN-0111 Phase 4-B で R2 へ退避し git 追跡から外した。以後、新しい note 記事を
 *   書いた PR は「カバーが manifest に無い」で unit-tests が赤くなる（2026-09-01 PR #480）。
 *   供給（生成 → R2 → manifest）はローカルの R2 creds が要る手動運用で、記事を書いただけでは
 *   誰も実行しない。note-cover-supply.yml がこの検査の --json で欠落 dir を拾って CI で供給する
 *   （ogp-supply.yml と同型）。
 *
 * 使い方:
 *   node scripts/check-note-cover-coverage.mjs           # 人向けサマリ
 *   node scripts/check-note-cover-coverage.mjs --json    # { checked, missing:[{article,dir,cover}], … }
 *
 * exit 0 = 全件解決・寸法 OK / 1 = 欠落・不正あり / 2 = 検査不成立（記事 or 解決件数が下限未満＝
 *          走査そのものが壊れている。CLAUDE.md §9「検査ゼロを PASS と呼ばない」）
 *
 * missing[].dir は content/note 相対の posix パスで、generate-note-covers.mjs の
 * collectArticleDirs が返す relDir と**完全一致**する（生成器に渡すと部分一致でなく 1 dir だけ生成）。
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from 'node:child_process';
import { existsSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, toPosix } from './lib/asset-storage.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 検査不成立の下限。note 記事は 2026-08 時点で 800 超・型別 195 件。これ未満は走査の破損を疑う。 */
export const MIN_ARTICLES = 500;
export const MIN_RESOLVED = 500;
export const COVER_WIDTH = 1280;
export const COVER_HEIGHT = 670;

// core.quotepath=false は必須。content/note は大半が日本語ディレクトリで、
// 既定の 8 進エスケープのままだと existsSync が全件 false になり「検査ゼロの緑」になる。
const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024,
  });

export const trackedNoteFiles = () => git(['ls-files', 'content/note']).split('\n').filter(Boolean);

export const ARTICLE_RE = /\/article(-[A-Za-z0-9][A-Za-z0-9-]*)?\.md$/;
export const TYPED_ARTICLE_RE = /\/article-[A-Za-z0-9][A-Za-z0-9-]*\.md$/;

/** PNG の IHDR から寸法を読む（先頭 24 バイトのみ。sharp 非依存で速い）。 */
export function pngSize(absPath) {
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
export function resolveCover(articleRelPath, manifest = loadManifest()) {
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
    const e = manifest.entries?.[toPosix(c)];
    if (e) return { path: toPosix(c), source: 'manifest', entry: e };
  }
  return null;
}

/** 記事に対して生成器が書き出すカバーのパス（型別なら cover-XXX.png、それ以外は cover.png）。 */
export function expectedCoverPath(articleRelPath) {
  const dir = dirname(articleRelPath);
  const base = articleRelPath.slice(dir.length + 1);
  const m = base.match(/^article-([A-Za-z0-9][A-Za-z0-9-]*)\.md$/);
  return toPosix(join(dir, 'img', m ? `cover-${m[1]}.png` : 'cover.png'));
}

/**
 * 全 note 記事のカバー解決を監査する。
 * 返り値:
 *   checked        … 走査した記事数
 *   localCount / manifestCount … 解決元の内訳
 *   missing        … [{ article, dir, cover }] ローカルにも manifest にも無い（publish が壊れる）
 *   notPng         … 拡張子は .png なのに PNG ではない
 *   noProof        … 退避済みなのに sha256/bytes/寸法の記録が欠けている
 *   wrongSize      … 1280×670 でない（"path = W×H" 形式）
 *   typedArticles / typedResolved … 型別記事の件数と、型別カバーへ解決した件数
 */
export function auditNoteCovers({ manifest = loadManifest(), files = trackedNoteFiles() } = {}) {
  const articles = files.filter((p) => ARTICLE_RE.test(p));
  const missing = [];
  const notPng = [];
  const noProof = [];
  const wrongSize = [];
  let localCount = 0;
  let manifestCount = 0;
  let typedResolved = 0;

  for (const a of articles) {
    const r = resolveCover(a, manifest);
    if (!r) {
      const cover = expectedCoverPath(a);
      missing.push({ article: a, dir: toPosix(dirname(a)).replace(/^content\/note\//, ''), cover });
      continue;
    }
    if (TYPED_ARTICLE_RE.test(a) && /\/cover-[A-Za-z0-9-]+\.png$/.test(r.path)) typedResolved++;
    if (r.source === 'local') {
      localCount++;
      const size = pngSize(join(ROOT, r.path));
      if (!size) { notPng.push(r.path); continue; }
      if (size.width !== COVER_WIDTH || size.height !== COVER_HEIGHT) wrongSize.push(r.path + ' = ' + size.width + '×' + size.height);
    } else {
      manifestCount++;
      const e = r.entry;
      if (!e.sha256 || !e.bytes || !e.width || !e.height) { noProof.push(r.path); continue; }
      if (e.width !== COVER_WIDTH || e.height !== COVER_HEIGHT) wrongSize.push(r.path + ' = ' + e.width + '×' + e.height + '（manifest 記録）');
    }
  }

  return {
    checked: articles.length,
    localCount,
    manifestCount,
    missing,
    notPng,
    noProof,
    wrongSize,
    typedArticles: articles.filter((p) => TYPED_ARTICLE_RE.test(p)).length,
    typedResolved,
  };
}

function main() {
  const json = process.argv.includes('--json');
  const r = auditNoteCovers();
  const resolved = r.localCount + r.manifestCount;
  const invalid = r.checked < MIN_ARTICLES || resolved < MIN_RESOLVED;
  const bad = r.missing.length + r.notPng.length + r.noProof.length + r.wrongSize.length;

  if (json) {
    console.log(JSON.stringify({ ...r, resolved, invalid }, null, 2));
  } else {
    console.log(
      `[check-note-cover-coverage] 記事 ${r.checked} 件を実検査 / 解決 ${resolved}（ローカル ${r.localCount} / manifest ${r.manifestCount}）` +
      ` / 型別 ${r.typedResolved}/${r.typedArticles}`,
    );
    const list = (label, xs, fmt = (x) => x) => {
      if (!xs.length) return;
      console.log(`  ${label}: ${xs.length} 件`);
      for (const x of xs.slice(0, 20)) console.log(`    - ${fmt(x)}`);
      if (xs.length > 20) console.log(`    … 他 ${xs.length - 20} 件`);
    };
    list('カバーがローカルにも manifest にも無い', r.missing, (m) => `${m.article} → ${m.cover}`);
    list('.png なのに PNG ではない', r.notPng);
    list('退避済みだが sha256/bytes/寸法の記録が欠けている', r.noProof);
    list(`${COVER_WIDTH}×${COVER_HEIGHT} でない`, r.wrongSize);
  }

  if (invalid) {
    console.error(`[check-note-cover-coverage] ✗ 検査不成立: 記事 ${r.checked}（下限 ${MIN_ARTICLES}）/ 解決 ${resolved}（下限 ${MIN_RESOLVED}）。走査の破損を疑う`);
    process.exit(2);
  }
  if (bad > 0) {
    console.error(`[check-note-cover-coverage] ✗ 欠落・不正 ${bad} 件（missing ${r.missing.length} / notPng ${r.notPng.length} / noProof ${r.noProof.length} / wrongSize ${r.wrongSize.length}）。供給は note-cover-supply.yml（develop push）またはローカルで generate-note-covers → asset-offload --group note-cover-png --include-untracked --commit`);
    process.exit(1);
  }
  if (!json) console.log('[check-note-cover-coverage] ✓ 全記事のカバーが解決でき寸法も規定どおり');
}

// import 時は実行しない（tests/note-cover-contract.test.mjs が判定関数を読む）。
const isMain = process.argv[1] && process.argv[1].split(/[\\/]/).pop() === 'check-note-cover-coverage.mjs';
if (isMain) main();
