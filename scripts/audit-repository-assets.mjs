#!/usr/bin/env node
// audit-repository-assets.mjs — DN-0111 Phase 0 の read-only 監査。
//
// リポジトリ肥大化の実体を「3 つの別指標」として測り、追跡中の各ファイルを
// KEEP_GIT / R2_PUBLIC / R2_PRIVATE / DRIVE_VAULT / REGENERATE / REVIEW へ分類する。
// DRIVE_VAULT＝人か手元のスクリプトだけが使うもの（asset-storage-policy.md §1・2026-09-05）。
//
//   1. ワークツリー容量  — 作業ディレクトリの実ファイル（追跡外も含む）
//   2. HEAD 追跡容量     — 現在の commit が持つ blob の合計（clone 直後の checkout 相当）
//   3. Git 履歴容量      — .git の pack（過去 blob 込み。通常 commit では減らない）
//
// この 3 つを混同しない。特に「HEAD から消す」＝「履歴が減る」ではない（Phase 7 の別承認事項）。
//
// 使い方:
//   node scripts/audit-repository-assets.mjs              # HEAD + ワークツリー監査（数秒）
//   node scripts/audit-repository-assets.mjs --history    # 履歴 blob の path 帰属も集計（要キャッシュ）
//   node scripts/audit-repository-assets.mjs --write-baseline  # 現在値を baseline.json へ固定
//
// 出力: .claude/state/repo-assets/audit-latest.{json,md}
// 真実源カード: .claude/todo/backlog.md の DN-0111

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, '.claude/state/repo-assets');
const BASELINE = join(OUT_DIR, 'baseline.json');

const MiB = 1048576;
const GiB = 1073741824;
const mib = (b) => Number((b / MiB).toFixed(1));
const gib = (b) => Number((b / GiB).toFixed(2));

const argv = process.argv.slice(2);
const WANT_HISTORY = argv.includes('--history');
const JSON_ONLY = argv.includes('--json-only');

// core.quotepath=false は必須。有効だと日本語パスが 8 進エスケープされ、
// 拡張子・ディレクトリ集計が丸ごとずれる（content/ の大半が日本語ディレクトリ）。
const git = (args, opts = {}) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 * 512, ...opts,
  });

// ---------------------------------------------------------------- 1. 3 指標

function measureScales() {
  const co = git(['count-objects', '-vH']);
  const field = (k) => (co.match(new RegExp('^' + k + ': (.+)$', 'm')) || [])[1] || null;
  let worktreeBytes = null;
  try {
    const du = execSync('du -sk . 2>/dev/null', { cwd: ROOT, encoding: 'utf-8' });
    const total = Number(du.trim().split(/\s+/)[0]) * 1024;
    const dg = execSync('du -sk .git 2>/dev/null', { cwd: ROOT, encoding: 'utf-8' });
    worktreeBytes = total - Number(dg.trim().split(/\s+/)[0]) * 1024;
  } catch { /* du 不在環境では null のまま */ }
  return {
    gitPackHuman: field('size-pack'),
    gitGarbageHuman: field('size-garbage'),
    inPackObjects: Number(field('in-pack') || 0),
    looseObjects: Number(field('count') || 0),
    worktreeBytes,
  };
}

// ---------------------------------------------------------------- 2. HEAD 実体

/** HEAD の全 blob を {path, sha, size} で返す。ls-tree --long はタブの後ろが path。 */
function readHeadBlobs() {
  const out = git(['ls-tree', '-r', 'HEAD', '--long']);
  const blobs = [];
  for (const line of out.split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const meta = line.slice(0, tab).trim().split(/\s+/); // mode type sha size
    const path = line.slice(tab + 1);
    if (meta[1] !== 'blob') continue;
    blobs.push({ path, sha: meta[2], size: Number(meta[3]) });
  }
  return blobs;
}

const extOf = (p) => {
  const b = basename(p);
  const i = b.lastIndexOf('.');
  return i > 0 ? b.slice(i + 1).toLowerCase() : '(none)';
};

function groupBy(blobs, keyFn) {
  const m = new Map();
  for (const b of blobs) {
    const k = keyFn(b);
    const g = m.get(k) || { key: k, bytes: 0, files: 0 };
    g.bytes += b.size; g.files += 1;
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.bytes - a.bytes);
}

// ---------------------------------------------------------------- 3. 分類

/**
 * note カバーの公開範囲は、同ディレクトリの article*.md frontmatter で決まる。
 * noteUrl か noteId があれば「note 上に実体が出ている＝公開 R2 可」、無ければ draft 扱い。
 * 判定不能（article*.md が読めない）は private 側へ倒す（公開バケットへの誤配置を作らない）。
 */
const noteVisibilityCache = new Map();
function noteDirVisibility(imgPath) {
  const articleDir = dirname(dirname(join(ROOT, imgPath))); // .../<slug>/img/cover.png → .../<slug>
  if (noteVisibilityCache.has(articleDir)) return noteVisibilityCache.get(articleDir);
  let visibility = 'private';
  try {
    const names = readdirSync(articleDir);
    const articles = names.filter((n) => /^article(-[A-Za-z0-9][A-Za-z0-9-]*)?\.md$/.test(n));
    for (const a of articles) {
      const head = readFileSync(join(articleDir, a), 'utf-8').slice(0, 4000);
      const fm = head.split('\n---')[0];
      if (/^note(Url|Id):\s*\S/m.test(fm)) { visibility = 'public'; break; }
    }
  } catch { /* 読めなければ private のまま */ }
  noteVisibilityCache.set(articleDir, visibility);
  return visibility;
}

/**
 * IG パックの公開状態は同ディレクトリ（最大 5 階層上）の status.json で決まる。
 * いずれかのチャネル（carousel/reel）が posted なら投稿済み＝公開、判定不能・未投稿は private へ倒す。
 * ロジックは scripts/lib/asset-storage.mjs の igPackVisibility（asset-storage.json の
 * ig-rendered-image group が visibilityFrom: igPackStatus として使う判定）と同一。
 */
const igVisibilityCache = new Map();
function igPackVisibility(imgPath) {
  const startDir = dirname(join(ROOT, imgPath));
  if (igVisibilityCache.has(startDir)) return igVisibilityCache.get(startDir);
  let visibility = 'private';
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const s = join(dir, 'status.json');
    if (existsSync(s)) {
      try {
        const j = JSON.parse(readFileSync(s, 'utf-8'));
        if (j.posted === true) {
          visibility = 'public'; // 旧形式のトップレベル
        } else {
          for (const v of Object.values(j)) {
            if (!v || typeof v !== 'object') continue;
            if (v.status === 'posted' || Boolean(v.posted_at) || Boolean(v.postedAt)) { visibility = 'public'; break; }
          }
        }
      } catch { /* 壊れていたら private のまま */ }
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  igVisibilityCache.set(startDir, visibility);
  return visibility;
}

/**
 * 分類ルール（上から順に最初に当たったものを採用）。
 * reason は「なぜその置き場なのか」、regenFrom は再生成入力、usedBy は実際に読むコード。
 * usedBy が空配列の REGENERATE は「参照ゼロの中間生成物」＝最優先の削除候補。
 */
const RULES = [
  {
    id: 'note-cover-svg',
    test: (p) => /^content\/note\/.*\/img\/cover[A-Za-z0-9_-]*\.svg$/.test(p),
    bucket: 'REGENERATE',
    reason: 'satori の中間生成物。背景写真を data:image base64 で丸ごと内包するため巨大。cover.png はこの SVG から sharp で焼くだけで、SVG 自体を読むコードは存在しない（repo 全体 grep で参照ゼロを確認）',
    regenFrom: 'article*.md frontmatter の cover ブロック + .claude/config/ogp/backgrounds/<exam>.png',
    usedBy: [],
    generator: 'scripts/generate-note-covers.mjs',
    visibility: () => 'n/a',
  },
  {
    id: 'note-cover-png',
    test: (p) => /^content\/note\/.*\/img\/cover[A-Za-z0-9_-]*\.png$/.test(p),
    bucket: (p) => (noteDirVisibility(p) === 'public' ? 'R2_PUBLIC' : 'R2_PRIVATE'),
    reason: 'note へアップロード済みの成果物。frontmatter の cover 仕様が原本で再生成可能だが、ライブ差し替え時の同一性確認に実体が要るため R2 を正とする',
    regenFrom: 'article*.md frontmatter の cover ブロック（generate-note-covers）',
    usedBy: ['scripts/note-publish.mjs', 'scripts/note-update-cover.mjs'],
    generator: 'scripts/generate-note-covers.mjs',
    visibility: (p) => noteDirVisibility(p),
  },
  {
    id: 'note-image',
    test: (p) => /^content\/note\//.test(p) && /\.(png|jpe?g|webp|gif)$/i.test(p),
    bucket: 'KEEP_GIT',
    reason: '記事本文の図版（cover*.png はすでに note-cover-png ルールで先に一致するので、ここに来るのは figure-*.png 等の本文埋め込み画像のみ）。note アップロード時に本文中へ自動アップロードされる原本（lib/note-images.mjs）。R2 台帳の対象外で Git 側が唯一の実体',
    regenFrom: null, usedBy: ['note 本文中の画像参照（scripts/lib/note-images.mjs）'], generator: null, visibility: () => 'n/a',
  },
  {
    id: 'textbook-page-image',
    test: (p) => /^content\/sources\/textbook\//.test(p) && /\.(png|jpe?g|webp|tiff?)$/i.test(p),
    bucket: 'DRIVE_VAULT',
    reason: '市販テキスト・白書のページ画像。人（OCR・図クロップ）しか読まないので Google Drive vault（原資料PDF/教材/・drive-vault.json textbook-page-image）。2026-09-05 に private R2 から移設。リポジトリは PRIVATE なので公開露出は無いが、HEAD と CI checkout を重くする',
    regenFrom: '原典 PDF（Drive vault 原資料PDF/教材/）から再抽出',
    usedBy: ['OCR / 図クロップ worker（書名単位 hydrate 前提）'],
    generator: 'scripts/pdf-to-mdx 系',
    visibility: () => 'private',
  },
  {
    id: 'note-pdf',
    test: (p) => /^content\/note\//.test(p) && /\.pdf$/i.test(p),
    bucket: 'DRIVE_VAULT',
    reason: 'note 添付・商品 PDF。人が note に添付するだけでサイトも CI も読まないので Google Drive vault（制作物/note配布PDF/・drive-vault.json note-delivery-pdf）。2026-09-05 に private R2 から移設。購入者限定の配布物を含むので public には置かない',
    regenFrom: 'magazine-to-pdf の spec + article.md',
    usedBy: ['scripts/note-attach-file.mjs'],
    generator: 'scripts/magazine-to-pdf.mjs',
    visibility: () => 'private',
  },
  {
    id: 'ig-rendered-png',
    test: (p) => /^content\/sns\/instagram\//.test(p) && /\.(png|jpe?g)$/i.test(p),
    bucket: 'DRIVE_VAULT',
    reason: 'slide-data.json から決定論的に焼けるレンダー成果物。publish-ig-bs（人の手元）しか読まないので Google Drive vault（制作物/IGレンダー/・drive-vault.json ig-rendered-image）。2026-09-05 に R2 の byVisibility 配置（public 7 / private 2,133）から移設',
    regenFrom: 'slide-data.json / script.json + caption.txt',
    usedBy: ['publish-ig-bs（投稿時に読む）'],
    generator: '.claude/scripts/sns/ 系レンダラ',
    visibility: (p) => igPackVisibility(p),
  },
  {
    id: 'sns-binary',
    test: (p) => /^content\/sns\//.test(p) && /\.(mp4|wav|mp3|mov|m4a)$/i.test(p),
    bucket: 'R2_PUBLIC',
    reason: '動画・音声。sns-archive-policy.md の既存 R2 退避経路（upload-sns-r2）で asset-storage.json の sns-archived-media group（bucket: public・投稿済みで既に公開されているため公開バケット）へ退避済み',
    regenFrom: 'script.json + wav（VOICEVOX 再合成）',
    usedBy: ['publish-ig-bs / yt upload'],
    generator: 'ig-reel-create 系',
    visibility: () => 'public',
  },
  {
    id: 'kindle-artifact',
    test: (p) => /^scripts\/kindle-(dist|published|covers)\//.test(p) || /\.epub$/i.test(p),
    bucket: 'KEEP_GIT',
    reason: 'KDP 入稿成果物。scripts/kindle-dist/ 配下は R2 バックアップ済み（kindle-dist group・2026-08-29 決着）。kindle-published/・kindle-covers/ は cover-designs（P6 で repo-archive group へ退避済み）を除き未バックアップだが、いずれも git が正典で CI（check-kindle-format.mjs 等）が git 実体に依存するため untrack はしない',
    regenFrom: 'content/kindle/books/**（要検証）',
    usedBy: ['scripts/kdp-publish.mjs'],
    generator: 'kindle-build',
    visibility: () => 'private',
  },
  {
    id: 'site-figure-svg',
    test: (p) => /^content\/site\//.test(p) && /\.svg$/i.test(p),
    bucket: 'KEEP_GIT',
    reason: '記事図版の編集可能ベクター。原本かつ通常は小さい（Base64 raster 混入は別途 FAIL 対象）',
    regenFrom: null, usedBy: ['MDX 本文'], generator: null, visibility: () => 'public',
  },
  {
    id: 'site-image',
    test: (p) => /^content\/site\//.test(p) && /\.(png|jpe?g|webp|gif)$/i.test(p),
    bucket: 'KEEP_GIT',
    reason: '公開記事の図版・OGP。R2 へは CI が同期するが Git 側が原本。ただし巨大 blob は個別に REVIEW へ落とす',
    regenFrom: null, usedBy: ['MDX 本文 / og:image'], generator: null, visibility: () => 'public',
  },
  {
    id: 'font',
    test: (p) => /\.(ttf|otf|woff2?)$/i.test(p),
    bucket: 'KEEP_GIT',
    reason: 'レンダリング必須のフォント実体（allowlist）',
    regenFrom: null, usedBy: ['satori / OGP 生成'], generator: null, visibility: () => 'n/a',
  },
  {
    id: 'ogp-background',
    test: (p) => /^\.claude\/config\/ogp\//.test(p),
    bucket: 'KEEP_GIT',
    reason: '資格別ブランド写真プール。note カバーとサイト OGP の再生成入力そのもので、これを外すと生成が不能になる（git-binary-policy.json allowlist で既に判定済み）',
    regenFrom: null, usedBy: ['scripts/generate-note-covers.mjs', 'scripts/generate-magazine-covers.mjs', 'scripts/coconala-thumb.mjs', '.claude/skills/conversion/ogp-create'], generator: null, visibility: () => 'n/a',
  },
  {
    id: 'public-static',
    test: (p) => /^public\//.test(p),
    bucket: 'KEEP_GIT',
    reason: 'サイトが直接配信する静的アセットの原本。R2 ではなく Next.js のビルド入力（git-binary-policy.json allowlist で既に判定済み）',
    regenFrom: null, usedBy: ['Next.js static assets'], generator: null, visibility: () => 'public',
  },
  {
    id: 'obsidian-env',
    test: (p) => /^\.obsidian\//.test(p),
    bucket: 'KEEP_GIT',
    reason: 'Obsidian のプラグイン・アイコン素材。制作物ではなくエディタ環境で、全 PC 共有が要る（git-binary-policy.json allowlist で KEEP_GIT 判定済み）',
    regenFrom: null, usedBy: ['Obsidian エディタ'], generator: null, visibility: () => 'n/a',
  },
  {
    id: 'text-ssot',
    test: (p) => /\.(md|mdx|json|jsonl|ts|tsx|js|mjs|cjs|css|yml|yaml|txt|html|toml|sh|py|xml|csv)$/i.test(p) || !basename(p).includes('.') || basename(p).startsWith('.'),
    bucket: 'KEEP_GIT',
    reason: '原稿・設定・コードの SSOT',
    regenFrom: null, usedBy: null, generator: null, visibility: () => 'public',
  },
];

const OVERSIZE_KEEP_GIT = 2 * MiB; // KEEP_GIT でもこれを超える blob は個別 REVIEW へ落とす

function classify(blob) {
  for (const r of RULES) {
    if (!r.test(blob.path)) continue;
    let bucket = typeof r.bucket === 'function' ? r.bucket(blob.path) : r.bucket;
    let note = null;
    if (bucket === 'KEEP_GIT' && blob.size > OVERSIZE_KEEP_GIT) {
      bucket = 'REVIEW';
      note = 'KEEP_GIT 相当だが ' + mib(blob.size) + ' MiB と大きい。圧縮・webp 化・R2 化の余地を個別判断';
    }
    return { ruleId: r.id, bucket, reason: r.reason, regenFrom: r.regenFrom, usedBy: r.usedBy, generator: r.generator, visibility: r.visibility(blob.path), note };
  }
  return { ruleId: '(unmatched)', bucket: 'REVIEW', reason: 'どのルールにも当たらない。置き場の方針が未定義', regenFrom: null, usedBy: null, generator: null, visibility: 'unknown', note: null };
}

// ---------------------------------------------------------------- 4. 整合チェック

/** Base64 raster を埋め込んだ SVG（＝真のベクターではない）を検出する。 */
function findBase64Svgs(blobs) {
  const hits = [];
  for (const b of blobs) {
    if (!/\.svg$/i.test(b.path)) continue;
    if (b.size < 64 * 1024) continue; // 小さい SVG は埋め込みなしとみなす（全件 read を避ける）
    const abs = join(ROOT, b.path);
    if (!existsSync(abs)) continue;
    let head;
    try { head = readFileSync(abs, 'latin1'); } catch { continue; }
    const m = head.match(/data:image\/(png|jpe?g|webp|gif);base64,/i);
    if (m) hits.push({ path: b.path, bytes: b.size, embedded: m[1].toLowerCase() });
  }
  return hits.sort((a, b) => b.bytes - a.bytes);
}

/** 同一 blob（sha 一致）が複数パスで追跡されている重複。pack 削減量として二重計上しないための材料。 */
function findDuplicateBlobs(blobs) {
  const bySha = new Map();
  for (const b of blobs) {
    const g = bySha.get(b.sha) || { sha: b.sha, size: b.size, paths: [] };
    g.paths.push(b.path);
    bySha.set(b.sha, g);
  }
  const dups = [...bySha.values()].filter((g) => g.paths.length > 1);
  // 「重複によって余分に checkout される容量」= size * (paths-1)。pack 上は 1 個しか無いので
  // Git 履歴の削減見込みへ足してはいけない。
  const worktreeWaste = dups.reduce((s, g) => s + g.size * (g.paths.length - 1), 0);
  const packUnique = dups.reduce((s, g) => s + g.size, 0);
  return {
    count: dups.length, worktreeWaste, packUnique,
    top: dups.sort((a, b) => b.size * (b.paths.length - 1) - a.size * (a.paths.length - 1)).slice(0, 20),
  };
}

/** 追跡中なのに .gitignore にも当たっているファイル（＝ignore を足しただけで untrack し忘れ）。 */
function findTrackedButIgnored() {
  try {
    return git(['ls-files', '-i', '-c', '--exclude-standard']).split('\n').filter(Boolean);
  } catch { return []; }
}

/** HEAD にあるのに作業ディレクトリで実体が無いファイル。 */
function findMissingInWorktree(blobs) {
  const missing = [];
  for (const b of blobs) if (!existsSync(join(ROOT, b.path))) missing.push(b.path);
  return missing;
}

// ---------------------------------------------------------------- 5. 履歴（任意）

// このリポジトリは `blob:none` の partial clone（promisor remote あり）。
// **`git rev-list --objects --all` を素で回してはいけない**——欠損 blob を origin から
// 遅延取得しにいき、履歴を丸ごとローカルへ再ハイドレートする（＝肥大化を直しに来て
// 肥大化させる）。2026-08-21 の Phase 0 実査で実際に 266 個の promisor pack を増やした。
// 必ず `--missing=allow-any` を付けて「欠損は欠損のまま数える」こと。
const HISTORY_CACHE_CMDS = [
  "git -c core.quotepath=false rev-list --objects --all --missing=allow-any > .tmp/rev-list-objects.txt",
  "git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype) %(objectsize) %(objectsize:disk)' > .tmp/objects-sizes.txt",
];

function historyAttribution() {
  const cacheDir = process.env.REPO_AUDIT_CACHE || join(ROOT, '.tmp');
  const revList = join(cacheDir, 'rev-list-objects.txt');
  const sizes = join(cacheDir, 'objects-sizes.txt');
  if (!existsSync(revList) || !existsSync(sizes)) {
    return {
      available: false,
      hint: 'キャッシュ未作成。先に以下を実行すること（--missing=allow-any は必須。外すと partial clone が履歴を再ダウンロードする）:\n  ' + HISTORY_CACHE_CMDS.join('\n  '),
    };
  }
  const sizeBySha = new Map();
  let totalBlobDisk = 0, blobCount = 0;
  // allObjectCount は blob 以外（commit / tree / tag）も含む「ローカルにあるユニークオブジェクト数」。
  // count-objects の in-pack はパック間の重複を含む延べ数なので、比較はこちらと行う
  // （blob だけの件数と突き合わせると重複率が数倍に膨れて誤読する）。
  let allObjectCount = 0;
  for (const line of readFileSync(sizes, 'utf-8').split('\n')) {
    if (!line) continue;
    const [sha, type, size, disk] = line.split(' ');
    allObjectCount++;
    if (type !== 'blob') continue;
    sizeBySha.set(sha, { size: Number(size), disk: Number(disk) });
    totalBlobDisk += Number(disk); blobCount++;
  }
  const byPath = new Map();
  const seenPair = new Set();
  const uniqueShas = new Set();
  let uniqueDisk = 0;
  for (const line of readFileSync(revList, 'utf-8').split('\n')) {
    if (!line) continue;
    const sp = line.indexOf(' ');
    if (sp === -1) continue;
    const sha = line.slice(0, sp);
    const path = line.slice(sp + 1);
    const s = sizeBySha.get(sha);
    if (!s) continue;
    if (!uniqueShas.has(sha)) { uniqueShas.add(sha); uniqueDisk += s.disk; }
    const key = sha + ' ' + path;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    // 同一 sha が複数 path に出る場合、pack 実体は 1 個。ここは path 帰属を見るための集計で、
    // 削減見込みの合計としては uniqueDisk 側が正。
    const g = byPath.get(path) || { path, disk: 0, versions: 0 };
    g.disk += s.disk; g.versions += 1;
    byPath.set(path, g);
  }
  const dirAgg = new Map();
  for (const g of byPath.values()) {
    const d = g.path.split('/').slice(0, 3).join('/');
    const a = dirAgg.get(d) || { key: d, disk: 0, paths: 0 };
    a.disk += g.disk; a.paths += 1;
    dirAgg.set(d, a);
  }
  return {
    available: true,
    partialClone: {
      isPartial: (() => { try { return git(['config', '--get', 'remote.origin.promisor']).trim() === 'true'; } catch { return false; } })(),
      filter: (() => { try { return git(['config', '--get', 'remote.origin.partialclonefilter']).trim(); } catch { return null; } })(),
      warning: 'partial clone のため「ローカル pack にある blob」は履歴の全量ではない。逆に、履歴を歩く操作が欠損 blob を取りに行って pack を膨らませる。走査は必ず --missing=allow-any で行う。',
    },
    reachableBlobs: blobCount,
    reachableBlobDiskBytes: totalBlobDisk,
    uniqueReachableDiskBytes: uniqueDisk,
    caveat: 'topPaths/topDirs は path 帰属の参考値。同一 blob が複数 path に現れるため単純合計は pack 実体を上回る。削減見込みは uniqueReachableDisk 側で読む。',
    // 「pack 実容量 − ユニーク実容量」の差を、回収可能な余剰と読んではいけない。
    // 2026-08-21 に実際に読み違えて `git repack -a -d` を実行し、次の 2 つが起きた:
    //   1. pack 12.01GiB → 6.52GiB へ縮んだが、**到達可能な commit を 21 個落とした**
    //      （origin から取り戻して修復済み。手順は memory: partial-clone-repack-hazard）
    //   2. その後 git 自身の auto-gc が約 6GiB の pack をもう 1 つ作り、13GiB へ戻った
    // つまりこの差は「溜まった沈殿物」ではなく「今も作られ続けている重複」で、
    // 掃除しても再生成される。差の大きさは施策の根拠にならない。
    // ローカル .git を小さくする正しい手段は repack ではなく、HEAD を軽くしてから
    // partial clone を作り直すこと（DN-0111 Phase 6）。
    packDuplication: (() => {
      const entries = Number((git(['count-objects', '-v']).match(/^in-pack: (\d+)$/m) || [])[1] || 0);
      const unique = allObjectCount;
      return {
        inPackEntries: entries,
        uniqueLocalObjects: unique,
        duplicationRatio: unique ? Number((entries / unique).toFixed(2)) : null,
        interpretation: entries > unique * 1.2
          ? 'パック間で重複格納されている。**repack で掃除しても auto-gc が作り直すため戻る（2026-08-21 実証）。回収可能な余剰として計上しないこと。**'
          : '重複は小さい。',
        correctFix: 'HEAD を軽くした後に partial clone を作り直す（DN-0111 Phase 6）。git repack -a -d は到達可能 commit を落とす実績があるので使わない。',
      };
    })(),
    topPaths: [...byPath.values()].sort((a, b) => b.disk - a.disk).slice(0, 30).map((g) => ({ path: g.path, diskMiB: mib(g.disk), versions: g.versions })),
    topDirs: [...dirAgg.values()].sort((a, b) => b.disk - a.disk).slice(0, 20).map((g) => ({ dir: g.key, diskMiB: mib(g.disk), paths: g.paths })),
  };
}

// ---------------------------------------------------------------- 6. 実行

function lastCommitDate(pathspec) {
  try { return git(['log', '-1', '--format=%cs', '--', pathspec]).trim() || null; } catch { return null; }
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const scales = measureScales();
  const blobs = readHeadBlobs();
  const headBytes = blobs.reduce((s, b) => s + b.size, 0);
  if (blobs.length === 0) {
    console.error('[audit-repository-assets] HEAD の blob が 0 件。検査が成立していないので FAIL とする。');
    process.exit(1);
  }

  const classified = blobs.map((b) => ({ ...b, ...classify(b) }));

  const byBucket = new Map();
  for (const c of classified) {
    const g = byBucket.get(c.bucket) || { bucket: c.bucket, bytes: 0, files: 0, rules: new Map() };
    g.bytes += c.size; g.files += 1;
    const r = g.rules.get(c.ruleId) || { ruleId: c.ruleId, bytes: 0, files: 0, reason: c.reason, regenFrom: c.regenFrom, usedBy: c.usedBy, generator: c.generator, samples: [] };
    r.bytes += c.size; r.files += 1;
    // 上位サンプルを残す（Phase 1 の policy 記述と、REVIEW の中身の目視に要る）
    if (r.samples.length < 8) r.samples.push({ path: c.path, sizeMiB: mib(c.size) });
    else {
      const min = r.samples.reduce((a, b, idx) => (b.sizeMiB < r.samples[a].sizeMiB ? idx : a), 0);
      if (mib(c.size) > r.samples[min].sizeMiB) r.samples[min] = { path: c.path, sizeMiB: mib(c.size) };
    }
    g.rules.set(c.ruleId, r);
    byBucket.set(c.bucket, g);
  }
  const buckets = [...byBucket.values()].sort((a, b) => b.bytes - a.bytes).map((g) => ({
    bucket: g.bucket, sizeMiB: mib(g.bytes), files: g.files,
    groups: [...g.rules.values()].sort((a, b) => b.bytes - a.bytes).map((r) => ({
      ruleId: r.ruleId, sizeMiB: mib(r.bytes), files: r.files,
      reason: r.reason, regenFrom: r.regenFrom, usedBy: r.usedBy, generator: r.generator,
      samples: r.samples.sort((a, b) => b.sizeMiB - a.sizeMiB),
    })),
  }));

  const dups = findDuplicateBlobs(blobs);
  const b64 = findBase64Svgs(blobs);
  const ignored = findTrackedButIgnored();
  const missing = findMissingInWorktree(blobs);

  const report = {
    generatedAt: new Date().toISOString(),
    head: git(['rev-parse', 'HEAD']).trim(),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']).trim(),
    scales: {
      worktreeBytes: scales.worktreeBytes,
      worktreeGiB: scales.worktreeBytes == null ? null : gib(scales.worktreeBytes),
      headTrackedBytes: headBytes, headTrackedGiB: gib(headBytes), headTrackedFiles: blobs.length,
      gitPackHuman: scales.gitPackHuman, gitGarbageHuman: scales.gitGarbageHuman,
      inPackObjects: scales.inPackObjects, looseObjects: scales.looseObjects,
      caveat: 'headTracked を減らしても gitPack は減らない（過去 blob は履歴に残る）。pack の縮小は履歴書換え＝DN-0111 Phase 7 の別承認事項。',
    },
    byExtension: groupBy(blobs, (b) => extOf(b.path)).slice(0, 20).map((g) => ({ ext: g.key, sizeMiB: mib(g.bytes), files: g.files })),
    byDirectory: groupBy(blobs, (b) => b.path.split('/').slice(0, 3).join('/')).slice(0, 25).map((g) => ({ dir: g.key, sizeMiB: mib(g.bytes), files: g.files })),
    topBlobs: [...classified].sort((a, b) => b.size - a.size).slice(0, 40).map((b) => ({ path: b.path, sizeMiB: mib(b.size), bucket: b.bucket })),
    classification: buckets,
    base64Svgs: {
      count: b64.length, sizeMiB: mib(b64.reduce((s, x) => s + x.bytes, 0)),
      top: b64.slice(0, 15).map((x) => ({ path: x.path, sizeMiB: mib(x.bytes), embedded: x.embedded })),
    },
    integrity: {
      duplicateBlobs: {
        distinctShas: dups.count,
        worktreeWasteMiB: mib(dups.worktreeWaste),
        packUniqueMiB: mib(dups.packUnique),
        caveat: 'worktreeWaste は「checkout 時に余分に展開される容量」。pack 上は同一 blob が 1 個しか無いので、Git 履歴の削減見込みへ足さない。',
        top: dups.top.map((g) => ({ sizeMiB: mib(g.size), copies: g.paths.length, paths: g.paths.slice(0, 4) })),
      },
      trackedButIgnored: { count: ignored.length, sample: ignored.slice(0, 20) },
      missingInWorktree: { count: missing.length, sample: missing.slice(0, 20) },
    },
    lastCommit: {
      'content/note': lastCommitDate('content/note'),
      'content/sources/textbook': lastCommitDate('content/sources/textbook'),
      'content/sns/instagram': lastCommitDate('content/sns/instagram'),
      'content/site': lastCommitDate('content/site'),
    },
    history: WANT_HISTORY ? historyAttribution() : { available: false, hint: '--history を付けると集計する' },
  };

  if (existsSync(BASELINE)) {
    const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
    report.delta = {
      baselineGeneratedAt: base.generatedAt,
      headTrackedMiB: Number((mib(headBytes) - mib(base.scales.headTrackedBytes)).toFixed(1)),
      headTrackedFiles: blobs.length - base.scales.headTrackedFiles,
    };
  } else {
    report.delta = { note: 'baseline.json 未作成。--write-baseline で現在値を固定する。' };
  }

  writeFileSync(join(OUT_DIR, 'audit-latest.json'), JSON.stringify(report, null, 2));
  if (!JSON_ONLY) writeFileSync(join(OUT_DIR, 'audit-latest.md'), renderMarkdown(report));
  if (argv.includes('--write-baseline')) writeFileSync(BASELINE, JSON.stringify(report, null, 2));

  console.log('[audit-repository-assets] 検査 ' + blobs.length + ' blob / HEAD 追跡 ' + report.scales.headTrackedGiB + ' GiB / pack ' + report.scales.gitPackHuman);
  for (const b of buckets) console.log('  ' + b.bucket.padEnd(11) + String(b.sizeMiB).padStart(9) + ' MiB  ' + String(b.files).padStart(6) + ' files');
  console.log('→ ' + join(OUT_DIR, 'audit-latest.json'));
}

function renderMarkdown(r) {
  const L = [];
  const row = (...c) => L.push('| ' + c.join(' | ') + ' |');
  L.push('# リポジトリ資産監査（DN-0111 Phase 0）', '');
  L.push('実行: ' + r.generatedAt + ' / branch `' + r.branch + '` / HEAD `' + r.head.slice(0, 10) + '`', '');
  L.push('> [!warning]', '> 3 つの容量は別の指標。**HEAD から消しても Git 履歴（pack）は減らない**。', '');
  L.push('## 1. 容量の 3 指標', '');
  row('指標', '値', '意味'); row('---', '---', '---');
  row('ワークツリー', r.scales.worktreeGiB == null ? '(未計測)' : r.scales.worktreeGiB + ' GiB', '作業ディレクトリの実容量（追跡外含む・.git 除く）');
  row('HEAD 追跡', r.scales.headTrackedGiB + ' GiB / ' + r.scales.headTrackedFiles + ' files', 'clone 直後に checkout される量。Phase 6 の削減目標対象');
  row('Git 履歴 (pack)', r.scales.gitPackHuman, '過去 blob 込み。通常 commit では減らない（Phase 7 の別承認）');
  L.push('', 'garbage: ' + r.scales.gitGarbageHuman + ' / in-pack objects: ' + r.scales.inPackObjects.toLocaleString(), '');
  L.push('## 2. 分類サマリ', '');
  row('分類', '容量', '件数'); row('---', '---:', '---:');
  for (const b of r.classification) row('**' + b.bucket + '**', b.sizeMiB + ' MiB', String(b.files));
  L.push('');
  for (const b of r.classification) {
    L.push('### ' + b.bucket + ' — ' + b.sizeMiB + ' MiB / ' + b.files + ' files', '');
    for (const g of b.groups) {
      L.push('- **`' + g.ruleId + '`** — ' + g.sizeMiB + ' MiB / ' + g.files + ' files');
      L.push('  - 理由: ' + g.reason);
      if (g.regenFrom) L.push('  - 再生成入力: ' + g.regenFrom);
      if (g.generator) L.push('  - 生成器: `' + g.generator + '`');
      if (g.usedBy) L.push('  - 参照コード: ' + (g.usedBy.length ? g.usedBy.map((u) => '`' + u + '`').join(' / ') : '**なし（参照ゼロ）**'));
    }
    L.push('');
  }
  L.push('## 3. 拡張子別 TOP', '');
  row('拡張子', '容量', '件数'); row('---', '---:', '---:');
  for (const e of r.byExtension.slice(0, 12)) row('`.' + e.ext + '`', e.sizeMiB + ' MiB', String(e.files));
  L.push('', '## 4. ディレクトリ別 TOP', '');
  row('ディレクトリ', '容量', '件数'); row('---', '---:', '---:');
  for (const d of r.byDirectory.slice(0, 15)) row('`' + d.dir + '`', d.sizeMiB + ' MiB', String(d.files));
  L.push('', '## 5. Base64 raster 入り SVG（真のベクターではない）', '');
  L.push(r.base64Svgs.count + ' 件 / ' + r.base64Svgs.sizeMiB + ' MiB', '');
  for (const s of r.base64Svgs.top.slice(0, 8)) L.push('- `' + s.path + '` — ' + s.sizeMiB + ' MiB（' + s.embedded + ' 埋込）');
  L.push('', '## 6. 整合チェック', '');
  const i = r.integrity;
  L.push('- **同一 blob 重複**: ' + i.duplicateBlobs.distinctShas + ' sha / checkout 余剰 ' + i.duplicateBlobs.worktreeWasteMiB + ' MiB（pack 実体は ' + i.duplicateBlobs.packUniqueMiB + ' MiB）');
  L.push('  - ' + i.duplicateBlobs.caveat);
  L.push('- **追跡中なのに ignore 対象**: ' + i.trackedButIgnored.count + ' 件');
  for (const p of i.trackedButIgnored.sample.slice(0, 10)) L.push('  - `' + p + '`');
  L.push('- **HEAD にあるが作業ツリーに実体なし**: ' + i.missingInWorktree.count + ' 件');
  L.push('', '## 7. 上位 blob', '');
  row('容量', '分類', 'パス'); row('---:', '---', '---');
  for (const b of r.topBlobs.slice(0, 25)) row(b.sizeMiB + ' MiB', b.bucket, '`' + b.path + '`');
  if (r.history && r.history.available) {
    L.push('', '## 8. Git 履歴の path 帰属', '');
    L.push('到達可能 blob: ' + r.history.reachableBlobs.toLocaleString() + ' 件 / pack 実体 ' + gib(r.history.uniqueReachableDiskBytes) + ' GiB', '');
    L.push('> ' + r.history.caveat, '');
    const pd = r.history.packDuplication;
    if (pd) {
      L.push('> [!warning]', '> **pack 実容量とユニーク容量の差を「回収可能な余剰」と読まないこと。**');
      L.push('> pack エントリ ' + pd.inPackEntries.toLocaleString() + ' / ユニーク ' + pd.uniqueLocalObjects.toLocaleString() + '（' + pd.duplicationRatio + ' 倍）。' + pd.interpretation);
      L.push('> 正しい直し方: ' + pd.correctFix, '');
    }
    row('ディレクトリ', 'pack 容量', 'path 数'); row('---', '---:', '---:');
    for (const d of r.history.topDirs.slice(0, 15)) row('`' + d.dir + '`', d.diskMiB + ' MiB', String(d.paths));
  }
  L.push('');
  return L.join('\n');
}

main();
