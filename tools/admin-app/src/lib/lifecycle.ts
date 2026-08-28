import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  STAGES,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  emptyCounts,
  tally,
  siteDocToStage,
  noteToStage,
  coconalaStatusToStage,
  brainStatusToStage,
  kindleStatusToStage,
  xTweetStatusToStage,
  youtubeScheduleStatusToStage,
  igPackToStage,
} from '../../../../scripts/lib/content-lifecycle.mjs';
import {
  loadConfig as loadVideoConfig,
  loadPackSummaries,
} from '../../../../scripts/lib/video-content-check.mjs';
import { SNS_CONTENT_ROOT } from '../../../../scripts/lib/repository-paths.mjs';

import { articlesIndex, magazines, noteArticleCounts } from './content';
import { loadBrainView } from './brain';
import { loadKindleView } from './kindle';
import { findRepoRoot, repoPath } from './repo-root';

/**
 * lifecycle.ts — 全チャネルを「企画 → 下書き → 公開」の共通ステージで横断集計する（read-only）。
 *
 * 設計（.claude/knowledge/reference/content-lifecycle.md）:
 *   - ステージ語彙と写像は `scripts/lib/content-lifecycle.mjs` が唯一の実装。ここでは
 *     各チャネルのネイティブ状態を集めて写像関数へ渡すだけで、判定を React 側へ書かない。
 *   - 各チャネルの既存 SoT は書き換えない。読むだけ。
 *   - **取得に失敗したチャネルは 0 件ではなく `ok:false` にする**（CLAUDE.md §9）。
 *     0 と「数えられていない」を同じ緑にしない。
 */

export type Stage = (typeof STAGES)[number];

export const STAGE_ORDER = STAGES as readonly string[];
export const LABELS = STAGE_LABELS as Record<string, string>;
export const DESCRIPTIONS = STAGE_DESCRIPTIONS as Record<string, string>;

export interface StageCounts {
  planned: number;
  draft: number;
  review: number;
  scheduled: number;
  published: number;
  retired: number;
  unknown: number;
}

export interface ChannelLifecycle {
  id: string;
  label: string;
  /** false なら「未取得」＝この行の 0 を健全と読まない */
  ok: boolean;
  reason: string | null;
  total: number;
  counts: StageCounts;
  /** 詳細を見に行く admin 内リンク */
  href: string;
  /** 何を読んで数えたか（画面に出して出所を明示する） */
  source: string;
}

type Counter = ReturnType<typeof emptyCounts>;

function failed(id: string, label: string, href: string, source: string, reason: string): ChannelLifecycle {
  return {
    id, label, ok: false, reason, total: 0,
    counts: emptyCounts() as unknown as StageCounts, href, source,
  };
}

function done(
  id: string, label: string, href: string, source: string, counts: Counter,
): ChannelLifecycle {
  const total = STAGES.reduce((n: number, s: string) => n + (counts[s] as number), 0) + counts.unknown;
  return { id, label, ok: true, reason: null, total, counts: counts as unknown as StageCounts, href, source };
}

// ─── チャネル別アダプタ ────────────────────────────────────

function videoLifecycle(): ChannelLifecycle {
  const href = '/content/video';
  const source = 'content/sns/video-packs/**/video-pack.json + .claude/state/video-content-status.json';
  try {
    const root = findRepoRoot();
    const rows = loadPackSummaries(root, loadVideoConfig(root)) as { stage: string | null }[];
    const counts = emptyCounts();
    for (const r of rows) tally(counts, r.stage);
    return done('video', '動画パック', href, source, counts);
  } catch (e) {
    return failed('video', '動画パック', href, source, (e as Error).message);
  }
}

function siteLifecycle(): ChannelLifecycle {
  const href = '/content/articles';
  // doc-meta-index.json は **published:false を除外して生成される**
  // （.claude/scripts/build-doc-meta-index.mjs L85-88）。index だけを数えると
  // 「下書き 0」という偽の緑になるので、非公開は MDX を直接走査して数える。
  const source = 'src/config/doc-meta-index.json（公開）＋ content/site/**/*.mdx の published:false（下書き）';
  try {
    const { docs, generatedAt } = articlesIndex();
    if (docs.length === 0) {
      return failed('site', 'サイト記事', href, source, 'doc-meta-index.json が空または未生成');
    }
    const unpublished = countUnpublishedSiteDocs();
    if (unpublished < 0) {
      return failed('site', 'サイト記事', href, source, '非公開記事の走査（git grep）に失敗');
    }
    const counts = emptyCounts();
    for (const d of docs) tally(counts, siteDocToStage({ published: d.published }));
    for (let i = 0; i < unpublished; i += 1) tally(counts, siteDocToStage({ published: false }));
    const row = done('site', 'サイト記事', href, source, counts);
    return { ...row, source: generatedAt ? `${source}（index 生成 ${generatedAt.slice(0, 10)}）` : source };
  } catch (e) {
    return failed('site', 'サイト記事', href, source, (e as Error).message);
  }
}

/**
 * content/site 配下で frontmatter が published: false の MDX 数（doc-meta-index に載らない下書き）。
 *
 * 1200 本の MDX を Node で個別に読むと、この端末では EDR のスキャンで 1 ファイル 20〜45ms かかり
 * ページ表示が 70 秒を超えた（memory: reference_local_build_io_bound）。git grep なら 1 プロセスで
 * 1〜2 秒で終わるのでこちらを使う。git が無い/失敗したら -1 を返し、呼び手が「未取得」にする。
 */
function countUnpublishedSiteDocs(): number {
  try {
    const out = execFileSync('git', ['grep', '-l', '^published: false', '--', 'content/site'], {
      cwd: findRepoRoot(),
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
    return out.split('\n').filter((l) => l.trim().endsWith('.mdx')).length;
  } catch (e) {
    // git grep はマッチ 0 件で exit 1。それと実行失敗を区別する。
    const err = e as { status?: number; stdout?: string };
    if (err.status === 1 && (err.stdout ?? '') === '') return 0;
    return -1;
  }
}

function noteLifecycle(): ChannelLifecycle {
  const href = '/content/magazines';
  const source = 'src/lib/note-magazines.ts（published）';
  try {
    const mags = magazines();
    if (mags.length === 0) return failed('note', 'note マガジン', href, source, 'マガジンを 1 件も読めていない');
    const counts = emptyCounts();
    for (const m of mags) tally(counts, noteToStage({ published: m.published, hasLiveUrl: Boolean(m.noteUrl) }));
    return done('note', 'note マガジン', href, source, counts);
  } catch (e) {
    return failed('note', 'note マガジン', href, source, (e as Error).message);
  }
}

function noteArticleLifecycle(): ChannelLifecycle {
  const href = '/content/note';
  const source = 'content/note/**/article*.md（noteUrl の有無）';
  try {
    // 件数しか要らないので noteArticles() の全文走査ではなく git ベースの高速版を使う
    // （判定ルールは content.ts の noteArticles と同じ場所に置いてある）。
    const c = noteArticleCounts();
    if (!c) return failed('note-article', 'note 記事', href, source, '記事の走査（git）に失敗');
    if (c.total === 0) return failed('note-article', 'note 記事', href, source, '記事を 1 件も読めていない');
    const counts = emptyCounts();
    for (let i = 0; i < c.published; i += 1) tally(counts, noteToStage({ published: true }));
    for (let i = 0; i < c.total - c.published; i += 1) tally(counts, noteToStage({ published: false }));
    return done('note-article', 'note 記事', href, source, counts);
  } catch (e) {
    return failed('note-article', 'note 記事', href, source, (e as Error).message);
  }
}

function coconalaLifecycle(): ChannelLifecycle {
  const href = '/content/content~coconala';
  const source = 'src/lib/coconala-services.ts（status + pauseReason）';
  try {
    const ts = readFileSync(repoPath('src', 'lib', 'coconala-services.ts'), 'utf8');
    // カタログの各エントリは status と（paused のときだけ）pauseReason を持つ。
    // 判定は content-lifecycle.mjs 側。ここは値の抽出だけ。
    const entries = [...ts.matchAll(/\n {2}'[a-z0-9-]+': \{([\s\S]*?)\n {2}\},/g)];
    if (entries.length === 0) return failed('coconala', 'ココナラ出品', href, source, 'カタログを解析できない');
    const counts = emptyCounts();
    for (const [, body] of entries) {
      const status = body.match(/status: '([a-z_]+)'/)?.[1] ?? null;
      if (!status) continue;
      const reason = body.match(/pauseReason: '([a-z_]+)'/)?.[1] ?? null;
      tally(counts, coconalaStatusToStage(status, reason));
    }
    return done('coconala', 'ココナラ出品', href, source, counts);
  } catch (e) {
    return failed('coconala', 'ココナラ出品', href, source, (e as Error).message);
  }
}

function brainLifecycle(): ChannelLifecycle {
  const href = '/content/brain';
  const source = 'src/lib/brain-products.ts（status）';
  try {
    const view = loadBrainView();
    const counts = emptyCounts();
    for (const p of view.products) tally(counts, brainStatusToStage(p.status));
    return done('brain', 'Brain 商品', href, source, counts);
  } catch (e) {
    return failed('brain', 'Brain 商品', href, source, (e as Error).message);
  }
}

function kindleLifecycle(): ChannelLifecycle {
  const href = '/content/kindle';
  const source = 'scripts/kindle-published/catalog.json（status）';
  try {
    const view = loadKindleView();
    const counts = emptyCounts();
    for (const b of view.books) tally(counts, kindleStatusToStage(b.status));
    return done('kindle', 'Kindle', href, source, counts);
  } catch (e) {
    return failed('kindle', 'Kindle', href, source, (e as Error).message);
  }
}

function xLifecycle(): ChannelLifecycle {
  const href = '/sns#x';
  const source = 'content/sns/x/draft/**/status.json（tweets[].status）';
  try {
    const dir = join(SNS_CONTENT_ROOT as string, 'x', 'draft');
    if (!existsSync(dir)) return failed('x', 'X 投稿', href, source, 'draft ディレクトリが無い');
    const counts = emptyCounts();
    let files = 0;
    for (const name of readdirSync(dir)) {
      const f = join(dir, name, 'status.json');
      if (!existsSync(f) || !statSync(join(dir, name)).isDirectory()) continue;
      files += 1;
      const j = JSON.parse(readFileSync(f, 'utf8')) as { tweets?: Record<string, { status?: string }> };
      for (const t of Object.values(j.tweets ?? {})) tally(counts, xTweetStatusToStage(t.status ?? ''));
    }
    if (files === 0) return failed('x', 'X 投稿', href, source, 'status.json を 1 件も読めていない');
    return done('x', 'X 投稿', href, source, counts);
  } catch (e) {
    return failed('x', 'X 投稿', href, source, (e as Error).message);
  }
}

function youtubeShortsLifecycle(): ChannelLifecycle {
  const href = '/sns';
  const source = '.claude/state/youtube-schedule.json（items[].status）';
  try {
    const p = repoPath('.claude', 'state', 'youtube-schedule.json');
    if (!existsSync(p)) return failed('youtube-shorts', 'YouTube Shorts', href, source, '台帳が無い');
    const j = JSON.parse(readFileSync(p, 'utf8')) as { items?: { status?: string }[] };
    const items = j.items ?? [];
    if (items.length === 0) return failed('youtube-shorts', 'YouTube Shorts', href, source, '台帳が空');
    const counts = emptyCounts();
    for (const i of items) tally(counts, youtubeScheduleStatusToStage(i.status ?? ''));
    return done('youtube-shorts', 'YouTube Shorts', href, source, counts);
  } catch (e) {
    return failed('youtube-shorts', 'YouTube Shorts', href, source, (e as Error).message);
  }
}

async function instagramLifecycle(): Promise<ChannelLifecycle> {
  const href = '/sns#instagram';
  const source = 'content/sns/instagram/**（posted.json の有無 / status.json の予約）';
  try {
    const { igBoard } = await import('./sns-board');
    const board = await igBoard();
    if (board.packs.length === 0) return failed('instagram', 'Instagram', href, source, 'パックを 1 件も読めていない');
    const counts = emptyCounts();
    for (const p of board.packs) {
      // igBoard は posted オブジェクトを返さず、フォーマット別の投稿有無を
      // 「CRS」形式の文字列（未投稿は '-'）に畳んで status に入れる（sns-board.ts statusStr）。
      // 1 つでも投稿済みの記号があれば公開扱い。
      const anyPosted = /[^-]/.test(p.status ?? '');
      tally(counts, igPackToStage({ posted: anyPosted ? p.status : null, scheduled: false }));
    }
    return done('instagram', 'Instagram', href, source, counts);
  } catch (e) {
    return failed('instagram', 'Instagram', href, source, (e as Error).message);
  }
}

/** 全チャネルのライフサイクル集計（表示順＝制作の上流→下流） */
export async function allChannelLifecycles(): Promise<ChannelLifecycle[]> {
  const sync = [
    videoLifecycle(),
    siteLifecycle(),
    noteArticleLifecycle(),
    noteLifecycle(),
    coconalaLifecycle(),
    brainLifecycle(),
    kindleLifecycle(),
    xLifecycle(),
    youtubeShortsLifecycle(),
  ];
  const ig = await instagramLifecycle();
  return [...sync.slice(0, 3), ig, ...sync.slice(3)];
}

/** 全チャネル合算（未取得チャネルは合算に含めず件数だけ返す） */
export function totalsOf(rows: ChannelLifecycle[]) {
  const counts = emptyCounts() as unknown as StageCounts;
  let missing = 0;
  for (const r of rows) {
    if (!r.ok) { missing += 1; continue; }
    for (const s of [...STAGES, 'unknown'] as string[]) {
      (counts as unknown as Record<string, number>)[s] +=
        (r.counts as unknown as Record<string, number>)[s];
    }
  }
  return { counts, missing };
}
