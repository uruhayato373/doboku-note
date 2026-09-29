import { readFileSync } from 'node:fs';

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

/**
 * note 商品 id → note 上の表紙画像 URL の索引。
 * 手元の _cover.png の有無は見ない（カバー PNG は Git 管理外で、置いてある checkout とない checkout がある）。
 * 台帳 .claude/state/note-republish-hashes.json の magazineCovers（Mac の週次 note-sync-routine が登録直後に note API で
 * 読んだ URL）を、商品の noteUrl の /m/{key} で引く。台帳に無い商品は null（＝最新デザインで未登録。判定は check-note-sync）。
 */
function noteCoverIndex(products: { id: string; noteUrl: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  let ledger: { magazines?: Record<string, { noteKey?: string; liveUrl?: string }> };
  try {
    ledger = { magazines: JSON.parse(readFileSync(repoPath('.claude', 'state', 'note-republish-hashes.json'), 'utf8')).magazineCovers };
  } catch {
    return out;
  }
  const urlByKey = new Map(Object.values(ledger.magazines ?? {}).filter((e) => e.noteKey && e.liveUrl).map((e) => [e.noteKey!, e.liveUrl!]));
  for (const p of products) {
    const key = p.noteUrl?.match(/\/m\/(m[0-9a-f]+)/)?.[1];
    const url = key ? urlByKey.get(key) : undefined;
    if (url) out.set(p.id, url);
  }
  return out;
}

export function loadNoteItems(): LineupItem[] {
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

export function loadCoconalaItems(): LineupItem[] {
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

export function loadKindleItems(): LineupItem[] {
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
