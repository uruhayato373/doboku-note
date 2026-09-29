import { readFileSync } from 'node:fs';

import { classifyProduct } from '../../../../scripts/lib/product-lineup.mjs';
import { loadThemes, themeLabel, themeShortLabel } from '../../../../scripts/lib/content-theme.mjs';
import { loadCoconalaItems, loadKindleItems, loadNoteItems, type LineupItem } from './lineup';
import { findRepoRoot, repoPath } from './repo-root';
import { artifactRelPaths, loadKindleCatalog } from '../../../../scripts/lib/kindle-catalog.mjs';
import { isOnKdp, kindleDrift } from '../../../../scripts/lib/kindle-uploaded.mjs';

/**
 * ledger.ts — 管理画面「コンテンツ台帳」（/content/ledger）の表示モデル（DN-0438）。
 *
 * 1 行 = 1 制作物。テーマ（資格＋転職などの話題・scripts/lib/content-theme.mjs）とチャネルの 2 軸で絞る。
 *   - note の記事: 索引 .claude/state/content-ledger.json（scripts/build-content-ledger.mjs が作る）を読むだけ。
 *     原稿約 920 本と同期の計画を画面で読み直さない（この端末では 1 分を超える）
 *   - note のマガジン・ココナラ・Kindle: 件数が少なく速いので、商品ラインナップと同じ読み込み（lib/lineup.ts）を使い、
 *     テーマは product-lineup.json のルール（資格 × 試験区分のマス）から取る
 * 正本は原稿・各チャネルの台帳のまま。ここは読むだけ。読めなかった元は 0 件ではなく sourceErrors に出す（§9）。
 */

export type SyncStatus = 'synced' | 'ready' | 'blocked';
/** 導線の公開照合（scripts/lib/note-cta-live.mjs）。unknown は取得失敗 */
export type CtaLiveState = 'ok' | 'missing' | 'order' | 'position' | 'unknown';
/** ココナラの公開照合（scripts/lib/coconala-live.mjs）。各配列は食い違いの説明。image は承認済み POP 画像が無いときの説明 */
export interface ProductLive {
  text: string[]; price: string[]; sale: string[]; image: string | null; checkedAt: string | null;
  /** 比べる元が無い（Kindle の上げた版の記録が無い・手元にファイルが無い）ときの説明。あれば「?」 */
  bodyUnknown?: string; imageUnknown?: string;
  /** 済のときの説明（無ければ照合の文言） */
  okNote?: { body: string; image: string };
}
export interface CtaLive { state: CtaLiveState; byId: Record<string, { state: CtaLiveState; missing: string[] }>; checkedAt: string; error?: string }

export interface LedgerRow {
  key: string;
  channel: string;
  kind: string;
  title: string;
  url: string | null;
  themes: string[];
  price: string | null;
  published: boolean;
  stageLabel: string;
  sync: { status: SyncStatus; parts: string[]; reasons?: Record<string, string>; blocker: string | null } | null;
  ctas: string[];
  ctaLive: CtaLive | null;
  /** ココナラの出品中のサービスだけ。照合の索引が無ければ null */
  live: ProductLive | null;
  /** 管理画面内の詳細（ココナラは正本 3 ファイルをまとめて見る画面） */
  detailHref: string | null;
  /** 恒久に終えた商品（ココナラのアーカイブ済み）。台帳は既定で隠し、状態「終了」で出す */
  ended: boolean;
  path: string | null;
}

export interface LedgerView {
  rows: LedgerRow[];
  channels: { id: string; label: string }[];
  themeLabel: (id: string | null) => string;
  themeShortLabel: (id: string | null) => string;
  lineupQualifications: Set<string>;
  blockers: Record<string, { label: string; action: string }>;
  index: { ok: boolean; generatedAt: string | null; error: string | null; syncCounts: Record<string, number> | null };
  sourceErrors: { channel: string; message: string }[];
}

interface NoteIndexEntry {
  path: string;
  title: string;
  contentType: string;
  theme: string | null;
  pricing: string;
  magazine: string | null;
  noteUrl: string | null;
  published: boolean;
  ctas: string[];
  ctaLive?: CtaLive | null;
  sync: { status: SyncStatus; parts: string[]; reasons?: Record<string, string>; blocker: string | null } | null;
}

interface NoteIndex {
  generatedAt: string;
  counts: { sync: Record<string, number> };
  blockers: Record<string, { label: string; action: string }>;
  notes: NoteIndexEntry[];
  kindle?: { files: Record<string, { key: string | null; sha256: string | null }> };
  coconala?: { checkedAt: string; items: Record<string, { fetched: boolean; text: string[]; price: string[]; sale: string[]; checkedAt?: string }> } | null;
}

interface LineupConfig {
  channels: { id: string; label: string }[];
  qualifications: { id: string }[];
  rules: Record<string, { match: string; cells: string[] }[]>;
}

const PRICE_LABEL: Record<string, string> = { paid: '有料', free: '無料', membership: '会員' };
const KIND: Record<string, string> = { note: 'マガジン', coconala: '出品', kindle: '本' };

/** 承認済み POP 画像（ココナラの商品画像の正本）。読めなければ空 */
export function readApprovedThumbs(): Record<string, { path: string; sha256: string }> {
  try {
    return JSON.parse(readFileSync(repoPath('.claude', 'config', 'coconala-thumb-approved.json'), 'utf8')).images ?? {};
  } catch {
    return {};
  }
}

function readNoteIndex(): { index: NoteIndex | null; error: string | null } {
  try {
    return { index: JSON.parse(readFileSync(repoPath('.claude', 'state', 'content-ledger.json'), 'utf8')) as NoteIndex, error: null };
  } catch (e) {
    return { index: null, error: (e as Error).message.slice(0, 160) };
  }
}

/** 商品の資格（product-lineup のマス「資格:試験区分」の資格部分）。 */
function productThemes(config: LineupConfig, item: LineupItem): string[] {
  const cells = (classifyProduct(config.rules?.[item.channel], item.id) as string[] | null) ?? [];
  return [...new Set(cells.map((c) => c.split(':')[0]))];
}

export function loadLedgerView(): LedgerView {
  const config = JSON.parse(readFileSync(repoPath('.claude', 'config', 'product-lineup.json'), 'utf8')) as LineupConfig;
  const themes = loadThemes(findRepoRoot());
  const sourceErrors: LedgerView['sourceErrors'] = [];
  const rows: LedgerRow[] = [];

  const { index, error } = readNoteIndex();
  for (const n of index?.notes ?? []) {
    rows.push({
      key: `note-article:${n.path}`,
      channel: 'note',
      kind: '記事',
      title: n.title,
      url: n.noteUrl,
      themes: n.theme ? [n.theme] : [],
      price: PRICE_LABEL[n.pricing] ?? null,
      published: n.published,
      stageLabel: n.published ? '公開' : '未公開',
      sync: n.sync,
      ctas: n.ctas,
      ctaLive: n.ctaLive ?? null,
      live: null,
      detailHref: null,
      ended: false,
      path: n.path,
    });
  }

  const approved = readApprovedThumbs();
  // Kindle: 手元の EPUB・表紙（索引のハッシュ）と、KDP に上げた版（catalog の uploaded）を比べる（lib/kindle-uploaded.mjs）
  type KindleBook = { id: string; status: string; uploaded?: { epub?: { sha256: string; at: string }; cover?: { sha256: string; at: string } } } & Record<string, unknown>;
  const kindleBooks = new Map((loadKindleCatalog() as KindleBook[]).map((b) => [b.id, b]));
  const kindleLive = (id: string): ProductLive | null => {
    const b = kindleBooks.get(id);
    if (!b || !isOnKdp(b)) return null;
    if (!index?.kindle) return { text: [], price: [], sale: [], image: null, checkedAt: null, bodyUnknown: '索引に手元の版が無い（npm run content-ledger で作る）', imageUnknown: '索引に手元の版が無い（npm run content-ledger で作る）' };
    const rel = artifactRelPaths(b) as { epub: string | null; cover: string | null };
    const local = { epub: rel.epub ? index.kindle.files[rel.epub]?.sha256 ?? null : null, cover: rel.cover ? index.kindle.files[rel.cover]?.sha256 ?? null : null };
    const d = kindleDrift(b, local) as { epub: string; cover: string };
    const msg = (part: 'epub' | 'cover', label: string) => ({
      drift: `${label}が KDP に上げた版と違う（ビルドし直してまだ入稿していない）`,
      unknown: `${label}の上げた版の記録が無い`,
      missing: `手元に${label}のファイルが無い`,
    } as Record<string, string>)[d[part]];
    const at = (part: 'epub' | 'cover') => b.uploaded?.[part]?.at ?? '?';
    return {
      text: d.epub === 'drift' ? [msg('epub', '原稿（EPUB）')] : [],
      price: [],
      sale: [],
      image: d.cover === 'drift' ? msg('cover', '表紙') : null,
      checkedAt: index.generatedAt,
      bodyUnknown: d.epub === 'unknown' || d.epub === 'missing' ? msg('epub', '原稿（EPUB）') : undefined,
      imageUnknown: d.cover === 'unknown' || d.cover === 'missing' ? msg('cover', '表紙') : undefined,
      okNote: { body: `手元の原稿が KDP に上げた版と同じ（上げた日 ${at('epub')}）`, image: `手元の表紙が KDP に上げた版と同じ（上げた日 ${at('cover')}）` },
    };
  };

  const coconalaLive = (id: string, stage: string): ProductLive | null => {
    if (stage !== 'published') return null;
    const hit = index?.coconala?.items?.[id];
    return {
      text: hit?.text ?? [],
      price: hit?.price ?? [],
      sale: hit ? hit.sale : index?.coconala ? ['公開照合の対象に入っていない（出品中なのに照合されていない）'] : [],
      image: approved[id] ? null : '承認済みの POP 画像が無い（coconala-thumb-approved.json に未登録）',
      checkedAt: hit?.checkedAt ?? index?.coconala?.checkedAt ?? null,
    };
  };

  const loaders: [string, () => LineupItem[]][] = [
    ['note', loadNoteItems],
    ['coconala', loadCoconalaItems],
    ['kindle', loadKindleItems],
  ];
  for (const [channel, load] of loaders) {
    try {
      const got = load();
      if (got.length === 0) sourceErrors.push({ channel, message: '台帳から商品を 1 件も読めなかった' });
      for (const item of got) {
        rows.push({
          key: `${channel}-product:${item.id}`,
          channel,
          kind: KIND[channel] ?? '商品',
          title: item.title,
          url: item.url,
          themes: productThemes(config, item),
          price: item.price,
          published: item.stage === 'published',
          stageLabel: item.ended ? '終了' : item.stageLabel,
          ended: Boolean(item.ended),
          sync: null,
          ctas: [],
          ctaLive: null,
          live: channel === 'coconala' ? coconalaLive(item.id, item.stage) : channel === 'kindle' ? kindleLive(item.id) : null,
          detailHref: channel === 'coconala' ? `/content/ledger/coconala/${encodeURIComponent(item.id)}` : channel === 'kindle' ? `/content/kindle/${encodeURIComponent(item.id)}` : null,
          path: null,
        });
      }
    } catch (e) {
      sourceErrors.push({ channel, message: (e as Error).message });
    }
  }

  return {
    rows,
    channels: config.channels.filter((c) => c.id !== 'app'),
    themeLabel: (id) => themeLabel(themes, id) as string,
    themeShortLabel: (id) => themeShortLabel(themes, id) as string,
    lineupQualifications: new Set(config.qualifications.map((q) => q.id)),
    blockers: index?.blockers ?? {},
    index: { ok: Boolean(index), generatedAt: index?.generatedAt ?? null, error, syncCounts: index?.counts?.sync ?? null },
    sourceErrors,
  };
}

/** サイドメニュー用: 制作物のあるテーマ（件数の多い順・短い名前）とチャネル。読めなければ空。 */
export function ledgerNav(): { themes: { id: string; label: string }[]; channels: { id: string; label: string }[] } {
  try {
    const view = loadLedgerView();
    const themeCount = new Map<string, number>();
    const channelCount = new Map<string, number>();
    for (const r of view.rows) {
      for (const t of r.themes) themeCount.set(t, (themeCount.get(t) ?? 0) + 1);
      channelCount.set(r.channel, (channelCount.get(r.channel) ?? 0) + 1);
    }
    return {
      themes: [...themeCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => ({ id, label: view.themeShortLabel(id) })),
      channels: view.channels.filter((c) => (channelCount.get(c.id) ?? 0) > 0),
    };
  } catch {
    return { themes: [], channels: [] };
  }
}
