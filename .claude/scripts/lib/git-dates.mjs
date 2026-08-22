// .claude/scripts/lib/git-dates.mjs
//
// git log から各ファイルの初回 commit 日（created）と直近 commit 日（dateModified）を
// まとめて取得する共通ユーティリティ。
//
// 使い方:
//   import { loadGitDates } from './lib/git-dates.mjs';
//   const dates = loadGitDates();          // Map<relPath, { created, dateModified }>
//   const entry = dates.get('path/to/file.mdx');
//
// 設計:
// - `git log --all --name-status -M100% --format=__COMMIT__:%ai` を ONE SHOT で実行し解析
// - 773 ファイル × 2 回 git log の per-file 呼出（~1 分）を 1 回のプロセス呼出（~数秒）に短縮
// - **rename を追跡する**（2026-08-18）。以前は `--name-only` で追跡を捨てており
//   「MDX のリネームは稀」という前提だったが、情報アーキテクチャ移行で
//   `.local/r2/posts` → `content/site` の一括 rename が起き、**全 1,084 記事の
//   dateModified が created まで巻き戻った**（sitemap lastmod が公開影響を持つ）。
//   `--follow` は 1 ファイルずつしか使えないので、`-M100%` の R レコードから
//   旧パス → 現パスの別名表を作って 1 回の走査で解決する。
//
// プロセス間キャッシュ（2026-07-30 追加）:
//   本 lib は 1 ビルドで **3 つの別プロセス**（build-doc-meta-index / generate-sitemap /
//   generate-rss）から呼ばれる。git log --all の実測は **21.5 秒**（.git が 13GB・11GB pack）で、
//   3 回で約 65 秒を同じ全履歴走査に費やしていた。ref が動かない限り結果は同一なので、
//   `git rev-parse --all`（実測 363ms）のハッシュをキーにディスクへキャッシュする。
//   2 回目以降は git log を丸ごと省略できる。キャッシュの読み書き失敗は常に非致命
//   （キャッシュはあくまで高速化で、正しさは git log 実行で担保する）。
//   バイパスは `GIT_DATES_NO_CACHE=1`。
//
// なぜ `-M` ではなく `-M100%`（厳密一致のみ）か（2026-08-21・DN-0111）:
//   `-M` の既定は類似度 50% の**非厳密**リネーム検出で、blob の中身を読んで比較する。
//   `--filter=blob:none` の partial clone ではこれが**履歴の blob を丸ごと遅延取得**させる。
//   実測: 新規 partial clone で `npm run build` を回したところ、この 1 コマンドだけで
//   `.git` が 969 MB → 7.0 GB へ膨れ、13 分間 CPU 1% のまま downloading を続けた
//   （partial clone にした意味が最初の build で消える）。
//   `-M100%` は厳密一致だけを見るので blob の OID 比較で済み、`GIT_NO_LAZY_FETCH=1` でも
//   完走して `.git` の増加は 0 MiB だった。
//
//   精度の差は実測済み: content/site の MDX 1,117 件のうち **dateModified は全件一致**
//   （＝上に書いた「全 1,084 記事の dateModified が巻き戻る」事故は -M100% でも防げる）。
//   差が出たのは created の 22 件だけで、いずれも 12 日ぶん後ろへずれる。
//   これは「リネームと同時に中身も変えた」commit を厳密一致では追えないため。
//   sitemap lastmod（公開影響を持つ側）は無傷なので、partial clone を成立させる方を採る。
//
// 出力の形式: YYYY-MM-DD（JSON-LD / sitemap lastmod 共通）

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const CACHE_FILE = join(process.cwd(), 'node_modules/.cache/doboku-note/git-dates.json');

/** 現在の全 ref のハッシュ。ref が 1 つでも動けばキーが変わる＝キャッシュは自動失効する。 */
// キャッシュキーに算法も混ぜる。ref だけをキーにすると、**算法を変えても
// ref が動くまで古い結果が返り続ける**（2026-08-21 に -M → -M100% へ変えたときに気づいた。
// 気づかなければ「変えたのに反映されない」を延々デバッグすることになる）。
const ALGO_VERSION = 'rename=exact-only/2026-08-21';

function cacheKey() {
  const refs = execSync('git rev-parse --all', {
    encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 8 * 1024 * 1024,
  });
  return createHash('sha256').update(ALGO_VERSION + '\n' + refs).digest('hex');
}

function readCache(key) {
  try {
    const parsed = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    if (parsed.key !== key) return null;
    // 保存形式は [created, dateModified] のタプル（65k エントリの肥大を抑える）。
    return new Map(Object.entries(parsed.entries).map(([p, v]) => [p, { created: v[0], dateModified: v[1] }]));
  } catch {
    return null; // 未生成・壊れ・キー不一致 → 素直に再計算する
  }
}

function writeCache(key, dates) {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    const entries = {};
    for (const [p, v] of dates) entries[p] = [v.created, v.dateModified];
    writeFileSync(CACHE_FILE, JSON.stringify({ key, entries }));
  } catch {
    // 書けなくても動作に影響しない（次回また git log を回すだけ）
  }
}

/**
 * リポジトリ全体の git log を一度解析し、ファイル → 日付マップを返す。
 *
 * @returns {Map<string, { created: string, dateModified: string }>}
 */
export function loadGitDates() {
  const useCache = process.env.GIT_DATES_NO_CACHE !== '1';
  let key = null;
  if (useCache) {
    try {
      key = cacheKey();
      const hit = readCache(key);
      if (hit) return hit;
    } catch {
      key = null; // rev-parse に失敗したらキャッシュを諦めて通常経路へ
    }
  }

  const out = execSync('git log --all --name-status -M100% --format=__COMMIT__:%ai', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024, // 64MB（38k 行 × 数百 byte 程度を想定）
  });

  const dates = new Map();
  /** 旧パス → 現在のパス。git log は新しい順なので、R を見た時点で以降（＝より古い）を写像できる */
  const alias = new Map();
  /** 別名の連鎖（A→B→C）をたどって現在の名前へ。循環しても止まるよう上限を置く */
  const resolve = (p) => {
    let cur = p;
    for (let i = 0; i < 32 && alias.has(cur); i += 1) cur = alias.get(cur);
    return cur;
  };
  const touch = (path, date) => {
    const key = resolve(path);
    const existing = dates.get(key);
    if (!existing) {
      // 初登場 = 最新 commit（git log は新しい順）
      dates.set(key, { created: date, dateModified: date });
    } else {
      // 再登場 = 古い commit → created を更新
      existing.created = date;
    }
  };

  let currentDate = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('__COMMIT__:')) {
      // "__COMMIT__:2026-04-24 15:22:19 +0900" → "2026-04-24"
      currentDate = line.slice('__COMMIT__:'.length).split(' ')[0];
      continue;
    }
    if (!line || !currentDate) continue;

    // --name-status は "M\tpath" / "A\tpath" / "R100\told\tnew" のタブ区切り
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const status = parts[0];
    if (status.startsWith('R')) {
      const [, from, to] = parts;
      if (!from || !to) continue;
      // **純粋な rename（R100）は「更新」ではない**。置き場を変えただけの日で
      // 全記事の dateModified を塗り替えると sitemap lastmod が嘘になる
      // （2026-08-18 の content/ 移行で実際に 1,085 件が当日へ張り付いた）。
      // 内容も変わっている rename（R100 未満）は modification として数える。
      if (status !== 'R100') touch(to, currentDate);
      // これより古い commit で `from` に触れたら、現在の名前として扱う
      if (resolve(from) !== resolve(to)) alias.set(from, resolve(to));
      continue;
    }
    // C（copy）は複製先に新しく実体ができるので modification 扱い（別名にはしない）
    touch(parts[parts.length - 1], currentDate);
  }

  if (key) writeCache(key, dates);
  return dates;
}

/**
 * 正規化したパス（forward slash）で dates マップを参照する。
 * Windows で `path.relative` が `\` を含むパスを返すため、`/` に変換して比較する。
 *
 * @param {Map<string, {created:string, dateModified:string}>} dates
 * @param {string} path - 相対パス（Windows の `\` でも OK）
 * @returns {{ created: string, dateModified: string } | null}
 */
export function lookupGitDates(dates, path) {
  const normalized = path.replace(/\\/g, '/');
  return dates.get(normalized) || null;
}
