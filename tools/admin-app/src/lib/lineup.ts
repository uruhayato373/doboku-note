import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  buildLineup,
  validateLineupConfig,
} from '../../../../scripts/lib/product-lineup.mjs';
import {
  noteToStage,
  coconalaStatusToStage,
  kindleStatusToStage,
  STAGE_LABELS,
} from '../../../../scripts/lib/content-lifecycle.mjs';
import { readCatalog as readCoconalaCatalog } from '../../../../scripts/lib/coconala-catalog.mjs';
import { loadKindleCatalog, coverMediaUrl } from '../../../../scripts/lib/kindle-catalog.mjs';

import { magazines } from './content';
import { repoPath } from './repo-root';

/**
 * lineup.ts — `/content/lineup`（read-only）の表示モデル。
 *
 * 商品を「資格 × 試験区分 × チャネル」のマトリクスへ並べる。分類ルールの SSOT は
 * `.claude/config/product-lineup.json`、判定は `scripts/lib/product-lineup.mjs`、
 * 状態の語彙は `scripts/lib/content-lifecycle.mjs` を使い、ここでは各チャネルの既存台帳を
 * 読んで item へ正規化するだけ。台帳は書き換えない。試験日・受験者数は資格一覧（/strategy/qualifications）が扱う。
 * 読めなかったチャネルは 0 件ではなく `sourceErrors` に出す（CLAUDE.md §9）。
 */

export interface LineupItem {
  channel: string;
  id: string;
  title: string;
  price: string | null;
  stage: string;
  stageLabel: string;
  url: string | null;
  coverUrl: string | null;
  platform?: string;
  note?: string;
  cells?: string[];
}

export interface LineupRow {
  key: string;
  qualificationId: string;
  qualificationLabel: string;
  stageId: string;
  stageLabel: string;
  isFirstStage: boolean;
  stageCount: number;
  byChannel: Record<string, LineupItem[]>;
}

export interface LineupView {
  channels: { id: string; label: string }[];
  rows: LineupRow[];
  unclassified: LineupItem[];
  configErrors: string[];
  sourceErrors: { channel: string; message: string }[];
  totals: Record<string, { all: number; published: number }>;
}

interface LineupConfig {
  channels: { id: string; label: string }[];
  apps?: Array<{ id: string; title: string; platform?: string; status: string; price?: string; url?: string; note?: string; cells: string[] }>;
  [k: string]: unknown;
}

const stageLabel = (stage: string | null): string =>
  stage ? ((STAGE_LABELS as Record<string, string>)[stage] ?? stage) : '不明';

/** content/note 配下の相対パス → /media/note/... の URL。 */
function noteMediaUrl(abs: string): string {
  const rel = relative(repoPath('content', 'note'), abs).split(sep).map(encodeURIComponent).join('/');
  return `/media/note/${rel}`;
}

function frontmatterValue(md: string, key: string): string | null {
  const fm = md.startsWith('---') ? md.slice(3, md.indexOf('\n---', 3)) : '';
  const m = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, 'm'));
  return m ? m[1]!.trim() : null;
}

/**
 * note 商品 id → 表紙画像 URL の索引。
 * マガジン dir（content/note/{資格}/magazines/{ラベル}/）の表紙（_cover.png か img/cover.png）を、
 * ①記事 frontmatter の utmCampaign / noteUrl ②ラベル→id（note-magazine-membership.json）
 * ③掲載文（note掲載文.txt）のタイトル行が商品タイトルの接頭辞、の順で商品へ結び付ける。
 */
function noteCoverIndex(products: { id: string; title: string | null; noteUrl: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  const noteRoot = repoPath('content', 'note');
  let membership: { labels?: Record<string, string> } = {};
  try {
    membership = JSON.parse(readFileSync(repoPath('.claude', 'config', 'note-magazine-membership.json'), 'utf8'));
  } catch {
    /* 無ければラベル経由の対応だけ諦める */
  }
  const byNoteUrl = new Map(products.map((p) => [p.noteUrl, p.id]));
  const titled = products.filter((p) => p.title);

  for (const exam of readdirSync(noteRoot, { withFileTypes: true })) {
    const magRoot = join(noteRoot, exam.name, 'magazines');
    if (!exam.isDirectory() || !existsSync(magRoot)) continue;
    for (const d of readdirSync(magRoot, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const dir = join(magRoot, d.name);
      const cover = [join(dir, '_cover.png'), join(dir, 'img', 'cover.png')].find((p) => existsSync(p));
      if (!cover) continue;
      const ids = new Set<string>();
      const article = join(dir, 'article.md');
      if (existsSync(article)) {
        const md = readFileSync(article, 'utf8');
        const utm = frontmatterValue(md, 'utmCampaign');
        const url = frontmatterValue(md, 'noteUrl');
        if (utm) ids.add(utm);
        if (url && byNoteUrl.has(url)) ids.add(byNoteUrl.get(url)!);
      }
      const labelId = membership.labels?.[d.name];
      if (labelId) ids.add(labelId);
      const listing = join(dir, 'note掲載文.txt');
      if (existsSync(listing)) {
        const head = readFileSync(listing, 'utf8').split('\n').slice(0, 5).map((l) => l.trim());
        const titleLine = head.find((l) => l && !l.startsWith('━') && !l.includes('コピペ用'));
        if (titleLine) for (const p of titled) if (p.title!.startsWith(titleLine)) ids.add(p.id);
      }
      for (const id of ids) if (!out.has(id)) out.set(id, noteMediaUrl(cover));
    }
  }
  return out;
}

function loadNoteItems(): LineupItem[] {
  const mags = magazines();
  const covers = noteCoverIndex(mags);
  return mags.map((m) => {
    const stage = noteToStage({ published: m.published, hasLiveUrl: Boolean(m.noteUrl) });
    return {
      channel: 'note',
      id: m.id,
      title: m.shortTitle ?? m.title ?? m.id,
      price: m.priceStr,
      stage,
      stageLabel: stageLabel(stage),
      url: m.noteUrl || null,
      coverUrl: covers.get(m.id) ?? null,
    };
  });
}

function loadCoconalaItems(): LineupItem[] {
  const catalog = readCoconalaCatalog() as Record<string, { id: string; status: string; serviceUrl: string; priceYen: number | null; title: string; shortTitle: string | null; pauseReason: string | null }>;
  return Object.values(catalog).map((s) => {
    const stage = coconalaStatusToStage(s.status, s.pauseReason) ?? 'unknown';
    return {
      channel: 'coconala',
      id: s.id,
      title: s.shortTitle ?? s.title,
      price: s.priceYen != null ? `¥${s.priceYen.toLocaleString('ja-JP')}` : null,
      stage,
      stageLabel: stageLabel(stage),
      url: s.serviceUrl || null,
      coverUrl: null,
    };
  });
}

function loadKindleItems(): LineupItem[] {
  return loadKindleCatalog().map((b: { id: string; title: string; priceJpy: number; status: string; asin: string | null }) => {
    const stage = kindleStatusToStage(b.status) ?? 'unknown';
    return {
      channel: 'kindle',
      id: b.id,
      title: b.title,
      price: b.priceJpy ? `¥${b.priceJpy.toLocaleString('ja-JP')}` : null,
      stage,
      stageLabel: stageLabel(stage),
      url: b.status === 'live' && b.asin ? `https://www.amazon.co.jp/dp/${b.asin}` : null,
      coverUrl: coverMediaUrl(b),
    };
  });
}

export function loadLineupView(): LineupView {
  const config = JSON.parse(readFileSync(repoPath('.claude', 'config', 'product-lineup.json'), 'utf8')) as LineupConfig;
  const configErrors = validateLineupConfig(config) as string[];
  const sourceErrors: LineupView['sourceErrors'] = [];
  const items: LineupItem[] = [];
  const loaders: [string, () => LineupItem[]][] = [
    ['note', loadNoteItems],
    ['coconala', loadCoconalaItems],
    ['kindle', loadKindleItems],
  ];
  for (const [channel, load] of loaders) {
    try {
      const got = load();
      if (got.length === 0) sourceErrors.push({ channel, message: '台帳から商品を1件も読めなかった' });
      items.push(...got);
    } catch (e) {
      sourceErrors.push({ channel, message: (e as Error).message });
    }
  }
  for (const a of config.apps ?? []) {
    items.push({
      channel: 'app',
      id: a.id,
      title: a.title,
      price: a.price ?? null,
      stage: a.status,
      stageLabel: stageLabel(a.status),
      url: a.url ?? null,
      coverUrl: null,
      platform: a.platform,
      note: a.note,
      cells: a.cells,
    });
  }

  const { rows, unclassified } = buildLineup(config, items) as { rows: LineupRow[]; unclassified: LineupItem[] };
  const totals: LineupView['totals'] = {};
  for (const c of config.channels) totals[c.id] = { all: 0, published: 0 };
  for (const i of items) {
    const t = totals[i.channel];
    if (!t) continue;
    t.all += 1;
    if (i.stage === 'published') t.published += 1;
  }
  return { channels: config.channels, rows, unclassified, configErrors, sourceErrors, totals };
}
