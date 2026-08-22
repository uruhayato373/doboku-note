import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';
import { repoPath } from './repo-root';
import { NOTE_CONTENT_ROOT, SITE_CONTENT_ROOT, SNS_CONTENT_ROOT } from '../../../../scripts/lib/repository-paths.mjs';

/**
 * gallery.ts — ギャラリー走査（tools/admin/lib/scan.mjs の要点を findRepoRoot ベースで移植）。
 * 画像 URL はすべて /media/{posts|sns|note}/... 形式で返す。
 * 大量ファイル（OGP 1100+/figure 1300+）対策に module-level TTL キャッシュを噛ませる。
 */

const toPosix = (p: string) => p.replace(/\\/g, '/');

// ── TTL キャッシュ（300s。コンテンツは頻繁に変わらない） ──
const TTL_MS = 300_000;
const cache = new Map<string, { at: number; val: unknown }>();
function memo<T>(key: string, fn: () => T): T {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.val as T;
  const val = fn();
  cache.set(key, { at: Date.now(), val });
  return val;
}

/**
 * 退避台帳（DN-0111）。note カバーと IG レンダー画像は R2 へ出して Git 追跡から外したので、
 * ディスクを readdir するだけだと**ギャラリーから静かに消える**。台帳に載っているものは
 * 「R2 にある・要 hydrate」として出す。壊れた <img> は出さない（実体が無いので src を作らない）。
 */
interface OffloadEntry { bucket: string; group: string; bytes: number; width?: number; height?: number }
function offloadedByRel(rootPrefix: string, groupIds: string[]): Map<string, OffloadEntry> {
  return memo('offload:' + rootPrefix + ':' + groupIds.join(','), () => {
    const out = new Map<string, OffloadEntry>();
    let raw: { entries?: Record<string, OffloadEntry & { logicalPath?: string }> } | null = null;
    try {
      raw = JSON.parse(readFileSync(repoPath('.claude', 'state', 'assets', 'manifest.json'), 'utf8'));
    } catch {
      return out;
    }
    for (const [logical, e] of Object.entries(raw?.entries ?? {})) {
      if (!groupIds.includes(e.group)) continue;
      if (!logical.startsWith(rootPrefix)) continue;
      out.set(logical.slice(rootPrefix.length), e);
    }
    return out;
  });
}

function readJson<T>(abs: string): T | null {
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as T;
  } catch {
    return null;
  }
}

// ─── OGP ───────────────────────────────────────────────
export const GROUP_LABEL: Record<string, string> = {
  guide: 'ガイド',
  textbook: 'テキスト',
  keyword: 'キーワード',
  pillar: 'まとめ',
  primary: '過去問(一次)',
  secondary: '過去問(二次)',
  'past-exam': '過去問',
  other: 'その他',
};

export interface OgpItem {
  rel: string;
  category: string;
  group: string;
  url: string;
}
export interface OgpResult {
  items: OgpItem[];
  catLabel: Record<string, string>;
}

export function scanOgp(): OgpResult {
  return memo('ogp', () => {
    const POSTS = SITE_CONTENT_ROOT;
    const cats = readJson<{ slug: string; label: string }[]>(repoPath('src', 'config', 'categories.json')) ?? [];
    const catLabel = Object.fromEntries(cats.map((c) => [c.slug, c.label]));

    if (!existsSync(POSTS)) return { items: [], catLabel };
    const rels = readdirSync(POSTS, { recursive: true, withFileTypes: false })
      .map((p) => toPosix(String(p)))
      .filter((p) => p.endsWith('/ogp.png'));

    const items = rels
      .map((rel) => {
        const slugDir = dirname(rel);
        const category = slugDir.split('/')[0] ?? 'other';
        let mdx = join(POSTS, slugDir, 'article.mdx');
        if (!existsSync(mdx)) mdx = join(POSTS, slugDir + '.mdx');
        if (!existsSync(mdx)) mdx = join(POSTS, slugDir.replace(/\//g, '-'), 'article.mdx');
        let group = 'other';
        if (existsSync(mdx)) {
          try {
            const g = matter(readFileSync(mdx, 'utf8')).data.group;
            if (g && GROUP_LABEL[g as string]) group = g as string;
          } catch {
            /* keep other */
          }
        }
        return { rel, category, group, url: `/media/posts/${rel}` };
      })
      .sort((a, b) => a.rel.localeCompare(b.rel));
    return { items, catLabel };
  });
}

// ─── 記事図版（svg / raster） ───────────────────────────
// needs トリアージは figure-provenance.json（真実源: figure-sources.json 台帳 +
// figure-text-audit.json 品質）が published/referenced/needs/source_dir を precompute 済み。
// 旧 admin の MDX 再ジョインは不要で、baseRel（拡張子なし）で lookup するだけ。
export const FIGURE_NEEDS_ORDER = [
  'recrop-urgent',
  'recrop',
  'recrop-review',
  'rescan',
  'rescan-need-source',
  'rescan-or-svg',
  'ok',
] as const;
export const FIGURE_NEEDS_LABEL: Record<string, string> = {
  'recrop-urgent': '要再クロップ(緊急)',
  recrop: '再クロップ',
  'recrop-review': '再クロップ?(要目視)',
  rescan: '要再スキャン',
  'rescan-need-source': '要再スキャン(元入手)',
  'rescan-or-svg': '再スキャン/SVG',
  ok: 'OK',
};

export interface FigureItem {
  rel: string;
  category: string;
  name: string;
  kind: 'svg' | 'raster';
  url: string;
  needs: string | null;
  needsReason: string | null;
  sourceDir: string | null;
  textStatus: string | null;
  published: boolean;
  referenced: boolean;
}

interface ProvEntry {
  published?: boolean;
  referenced?: boolean;
  textStatus?: string;
  source_dir?: string;
  needs?: string;
  manualReason?: string;
}

export function scanFigures(): { items: FigureItem[] } {
  return memo('figures', () => {
    const POSTS = SITE_CONTENT_ROOT;
    if (!existsSync(POSTS)) return { items: [] };
    const prov = readJson<{ figures?: Record<string, ProvEntry> }>(
      repoPath('.claude', 'state', 'figure-provenance.json'),
    );
    const figures = prov?.figures ?? {};
    const rels = readdirSync(POSTS, { recursive: true, withFileTypes: false })
      .map((p) => toPosix(String(p)))
      .filter((p) => /\/img\/[^/]+\.(svg|png|webp|jpg)$/i.test(p));

    const items: FigureItem[] = rels
      .map((rel) => {
        const category = dirname(rel).split('/')[0] ?? 'other';
        const name = rel.split('/').pop() ?? rel;
        const kind: 'svg' | 'raster' = /\.svg$/i.test(name) ? 'svg' : 'raster';
        const baseRel = rel.replace(/\.(svg|png|webp|jpg|jpeg)$/i, '');
        const fp = figures[baseRel];
        return {
          rel,
          category,
          name,
          kind,
          url: `/media/posts/${rel}`,
          needs: fp?.needs ?? null,
          needsReason: fp?.manualReason ?? null,
          sourceDir: fp?.source_dir ?? null,
          textStatus: fp?.textStatus ?? null,
          published: fp?.published ?? false,
          referenced: fp?.referenced ?? false,
        };
      })
      .sort((a, b) => a.rel.localeCompare(b.rel));
    return { items };
  });
}

export interface FigureProgress {
  liveOk: number;
  liveAction: number;
  liveTotal: number;
  pct: number;
  breakdown: { needs: string; count: number }[];
  ndCount: Record<string, number>;
}

/**
 * 図クロップ進捗（旧 admin gallery.js の fig-progress を移植）。
 * 「公開×掲載」（ライブで読者に見える図）だけを分母に、ok 以外を要対応として集計。
 * png/webp ペアは basename（拡張子除去）で重複排除する。ndCount は全ラスタの needs 別。
 */
export function figureProgress(items: FigureItem[]): FigureProgress {
  const ndCount: Record<string, number> = {};
  const liveND: Record<string, number> = {};
  const seen = new Set<string>();
  for (const i of items) {
    if (i.kind !== 'raster' || !i.needs) continue;
    ndCount[i.needs] = (ndCount[i.needs] ?? 0) + 1;
    if (i.published && i.referenced) {
      const k = i.rel.replace(/\.(png|webp|jpg|jpeg)$/i, '');
      if (!seen.has(k)) {
        seen.add(k);
        liveND[i.needs] = (liveND[i.needs] ?? 0) + 1;
      }
    }
  }
  const liveTotal = FIGURE_NEEDS_ORDER.reduce((n, s) => n + (liveND[s] ?? 0), 0);
  const liveOk = liveND.ok ?? 0;
  const liveAction = liveTotal - liveOk;
  const pct = liveTotal ? Math.round((liveOk / liveTotal) * 100) : 100;
  const breakdown = FIGURE_NEEDS_ORDER.filter((s) => s !== 'ok' && liveND[s]).map((s) => ({
    needs: s,
    count: liveND[s]!,
  }));
  return { liveOk, liveAction, liveTotal, pct, breakdown, ndCount };
}

// ─── note 画像（cover / figure） ────────────────────────
export interface NoteImageItem {
  rel: string;
  seg: string; // content/note/ 直下セグメント（試験/系列）
  name: string;
  kind: 'cover' | 'figure';
  url: string;
  /** local = 手元に実体あり / offloaded = R2 にあり要 hydrate */
  state: 'local' | 'offloaded';
  bucket?: string;
}

export function scanNoteImages(): { items: NoteImageItem[]; segs: string[] } {
  return memo('note', () => {
    const NOTE = NOTE_CONTENT_ROOT;
    const items: NoteImageItem[] = [];
    if (!existsSync(NOTE)) return { items, segs: [] };
    const rels = readdirSync(NOTE, { recursive: true, withFileTypes: false })
      .map((p) => toPosix(String(p)))
      .filter((p) => /\/img\/(cover(-[A-Za-z0-9-]+)?\.png|figure-[^/]+\.png)$/.test(p));

    for (const rel of rels) {
      const name = rel.split('/').pop() ?? rel;
      const seg = rel.split('/')[0] ?? '';
      const kind: 'cover' | 'figure' = /^cover/.test(name) ? 'cover' : 'figure';
      items.push({ rel, seg, name, kind, url: `/media/note/${rel}`, state: 'local' });
    }

    // 退避済み（ローカルに実体が無い）分を足す。件数が静かに減るのを防ぐ。
    const seen = new Set(items.map((i) => i.rel));
    for (const [rel, e] of offloadedByRel('content/note/', ['note-cover-png'])) {
      if (seen.has(rel)) continue;
      const name = rel.split('/').pop() ?? rel;
      items.push({
        rel, seg: rel.split('/')[0] ?? '', name,
        kind: /^cover/.test(name) ? 'cover' : 'figure',
        url: '', state: 'offloaded', bucket: e.bucket,
      });
    }
    items.sort((a, b) => a.rel.localeCompare(b.rel));
    const segs = [...new Set(items.map((i) => i.seg))].sort();
    return { items, segs };
  });
}

// ─── SNS パック（IG carousel/reels/stories + X draft） ──
export interface SnsImage {
  name: string;
  url: string;
  video: boolean;
  /** local = 手元に実体あり / offloaded = R2 にあり要 hydrate */
  state?: 'local' | 'offloaded';
  bucket?: string;
}
export interface SnsPack {
  channel: 'instagram' | 'x';
  rel: string;
  label: string;
  images: SnsImage[];
}

const IMG_RE = /\.(png|webp|jpg|jpeg)$/i;
const MEDIA_RE = /\.(png|webp|jpg|jpeg|mp4)$/i;

export function scanSnsPacks(): { packs: SnsPack[] } {
  return memo('sns', () => {
    const SNS = SNS_CONTENT_ROOT;
    const packs: SnsPack[] = [];
    if (!existsSync(SNS)) return { packs };

    // Instagram: 画像/動画を持つディレクトリを 1 パックとして集約
    const igDir = join(SNS, 'instagram');
    if (existsSync(igDir)) {
      const dirsWithMedia = new Map<string, SnsImage[]>();
      const files = readdirSync(igDir, { recursive: true, withFileTypes: false })
        .map((p) => toPosix(String(p)))
        .filter((p) => MEDIA_RE.test(p) && !p.startsWith('_'));
      for (const rel of files) {
        const packRel = dirname(rel);
        const arr = dirsWithMedia.get(packRel) ?? [];
        arr.push({
          name: rel.split('/').pop() ?? rel,
          url: `/media/sns/instagram/${rel}`,
          video: /\.mp4$/i.test(rel),
          state: 'local',
        });
        dirsWithMedia.set(packRel, arr);
      }

      // 退避済み（ローカルに実体が無い）分を足す。
      const seenIg = new Set<string>();
      for (const [packRel, arr] of dirsWithMedia) for (const im of arr) seenIg.add(packRel + '/' + im.name);
      for (const [rel, e] of offloadedByRel('content/sns/instagram/', ['ig-rendered-image'])) {
        if (seenIg.has(rel)) continue;
        const packRel = dirname(rel);
        const arr = dirsWithMedia.get(packRel) ?? [];
        arr.push({ name: rel.split('/').pop() ?? rel, url: '', video: false, state: 'offloaded', bucket: e.bucket });
        dirsWithMedia.set(packRel, arr);
      }
      for (const [packRel, images] of [...dirsWithMedia.entries()].sort()) {
        packs.push({
          channel: 'instagram',
          rel: `instagram/${packRel}`,
          label: packRel,
          images: images.sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    }

    // X draft: content/sns/x/draft/<pack>/img/*
    const xDraft = join(SNS, 'x', 'draft');
    if (existsSync(xDraft)) {
      for (const name of readdirSync(xDraft).sort()) {
        const dir = join(xDraft, name);
        if (!statSync(dir).isDirectory()) continue;
        const imgDir = join(dir, 'img');
        const images: SnsImage[] = existsSync(imgDir)
          ? readdirSync(imgDir)
              .filter((f) => IMG_RE.test(f))
              .sort()
              .map((f) => ({ name: f, url: `/media/sns/x/draft/${name}/img/${f}`, video: false }))
          : [];
        if (images.length > 0) packs.push({ channel: 'x', rel: `x/draft/${name}`, label: name, images });
      }
    }

    return { packs };
  });
}
