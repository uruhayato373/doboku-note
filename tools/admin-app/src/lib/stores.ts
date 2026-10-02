import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';

import { loadDomains } from '../../../../scripts/lib/domains.mjs';
import { STORE_KINDS, groupStores, inferShape, listStoreFiles, storeDomainIds } from '../../../../scripts/lib/data-stores.mjs';
import { findRepoRoot } from './repo-root';

/**
 * stores.ts — 管理画面 管理＞設定／データ（/ops/store）の表示モデル（read-only）。
 *
 * 一覧・系列・型の読み取りは scripts/lib/data-stores.mjs、領域の割り当ては domains.json の documents が正本で、
 * ここでは並べるだけ。未割当は npm run check-domains（CI）が止めるので、画面に出るのは手元の git 管理外だけのはず。
 */

export type StoreKind = keyof typeof STORE_KINDS;
export const STORE_KIND_IDS = Object.keys(STORE_KINDS) as StoreKind[];
export const isStoreKind = (v: string | undefined): v is StoreKind => !!v && v in STORE_KINDS;

type Cfg = { domains: { id: string; label: string }[]; documents: Record<string, string> };
type Series = { key: string; domain: string | null; files: string[] };
type Shape = { format: string; summary: string; rows: { path: string; type: string }[]; doc: string | null; error?: string };

export type StoreNavItem = { id: string; label: string };

/** サイドバーの枝（設定・データの下の領域）。documents だけで決め、ファイルは読まない。 */
export function storeNav(): Record<StoreKind, StoreNavItem[]> {
  try {
    const cfg = loadDomains(findRepoRoot()) as Cfg;
    const label = (id: string) => cfg.domains.find((d) => d.id === id)?.label ?? id;
    return Object.fromEntries(
      STORE_KIND_IDS.map((k) => [k, (storeDomainIds(cfg, k) as string[]).map((id) => ({ id, label: label(id) }))]),
    ) as Record<StoreKind, StoreNavItem[]>;
  } catch {
    return { config: [], data: [] };
  }
}

export interface StoreRow {
  key: string;
  name: string;
  files: number;
  updated: string | null;
  untracked: boolean;
  shape: string;
  doc: string | null;
}

export interface StoreDetail {
  key: string;
  name: string;
  domain: string | null;
  shape: Shape;
  files: { path: string; updated: string | null; size: string; untracked: boolean }[];
  more: number;
  refs: string[];
  refToken: string;
}

export interface StoreView {
  kind: StoreKind;
  kindLabel: string;
  domains: { id: string; label: string; series: number; files: number }[];
  domain: { id: string; label: string } | null;
  rows: StoreRow[];
  detail: StoreDetail | null;
  unassigned: string[];
  total: { series: number; files: number };
  error: string | null;
}

const day = (ms: number) => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const sizeOf = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : n >= 1024 ? `${Math.round(n / 1024)}KB` : `${n}B`);
const stat = (root: string, p: string) => {
  try {
    return statSync(join(root, p));
  } catch {
    return null;
  }
};

/** 名前で参照しているコードを探す語: ファイル名の固定部分（短すぎればフォルダ名）。 */
function refToken(key: string): string {
  const parts = key.split('/');
  const base = parts[parts.length - 1].replace(/\.[a-z]+$/i, '');
  const literal = base.split('*').sort((a, b) => b.length - a.length)[0].replace(/^[-_]+|[-_]+$/g, '');
  if (!key.includes('*')) return parts[parts.length - 1];
  return literal.length >= 4 ? literal : parts[parts.length - 2] ?? base;
}

const REF_PATHS = ['scripts', '.claude/scripts', 'tools/admin-app/src', 'src', '.github/workflows', 'package.json'];

function codeRefs(root: string, token: string): string[] {
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'grep', '-l', '-F', '-e', token, '--', ...REF_PATHS], { cwd: root, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).sort();
  } catch {
    return []; // 一致なしは exit 1
  }
}

export function loadStoreView(kind: StoreKind, domainId?: string, key?: string): StoreView {
  const root = findRepoRoot();
  const { dir, label: kindLabel } = STORE_KINDS[kind];
  const empty: StoreView = { kind, kindLabel, domains: [], domain: null, rows: [], detail: null, unassigned: [], total: { series: 0, files: 0 }, error: null };
  try {
    const cfg = loadDomains(root) as Cfg;
    const files = listStoreFiles(root, kind) as string[];
    const tracked = new Set(listStoreFiles(root, kind, { tracked: true }) as string[]);
    const { series, unassigned } = groupStores(cfg, files) as { series: Series[]; unassigned: string[] };
    const name = (k: string) => k.slice(dir.length + 1);

    const domains = cfg.domains
      .map((d) => {
        const mine = series.filter((s) => s.domain === d.id);
        return { id: d.id, label: d.label, series: mine.length, files: mine.reduce((n, s) => n + s.files.length, 0) };
      })
      .filter((d) => d.series > 0);
    const domain = domains.find((d) => d.id === domainId) ?? null;

    const rows: StoreRow[] = domain
      ? series
          .filter((s) => s.domain === domain.id)
          .map((s) => {
            const latest = s.files[0];
            const st = stat(root, latest);
            const shape = inferShape(root, latest) as Shape;
            return {
              key: s.key,
              name: name(s.key),
              files: s.files.length,
              updated: st ? day(st.mtimeMs) : null,
              untracked: s.files.every((f) => !tracked.has(f)),
              shape: shape.format === 'JSON' ? shape.summary : `${shape.format}・${shape.summary}`,
              doc: shape.doc,
            };
          })
      : [];

    const hit = key ? series.find((s) => s.key === key) : undefined;
    let detail: StoreDetail | null = null;
    if (hit) {
      const token = refToken(hit.key);
      const shown = hit.files.slice(0, 30);
      detail = {
        key: hit.key,
        name: name(hit.key),
        domain: hit.domain,
        shape: inferShape(root, hit.files[0]) as Shape,
        files: shown.map((f) => {
          const st = stat(root, f);
          return { path: f, updated: st ? day(st.mtimeMs) : null, size: st ? sizeOf(st.size) : '—', untracked: !tracked.has(f) };
        }),
        more: hit.files.length - shown.length,
        refs: codeRefs(root, token),
        refToken: token,
      };
    }

    return {
      ...empty,
      domains,
      domain: domain ? { id: domain.id, label: domain.label } : null,
      rows,
      detail,
      unassigned,
      total: { series: series.length, files: files.length },
    };
  } catch (e) {
    return { ...empty, error: (e as Error).message };
  }
}
