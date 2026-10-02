import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { loadDomains } from '../../../../scripts/lib/domains.mjs';
import {
  AREAS,
  DATASETS,
  KINDS,
  areaDomainIds,
  areaOf,
  datasetById,
  fileDoc,
  inferShape,
  listAreaFiles,
  matchFiles,
  schemaRows,
} from '../../../../scripts/lib/datasets.mjs';
import { jsonSchemaOf, validateFiles } from '../../../../scripts/lib/dataset-validate.mjs';
import { findRepoRoot } from './repo-root';

/**
 * stores.ts — 管理画面 管理＞設定／データ（/ops/store）の表示モデル（read-only）。
 *
 * 何がどのデータかは scripts/lib/datasets.mjs の台帳が正本で、ここは並べるだけ。型（zod）のあるデータセットは
 * 型の定義と検査結果を、無いものは最新ファイルの実物から読んだ形を出す。未宣言のファイルは npm run check-datasets（CI）が
 * 止めるので、画面に出るのは手元の git 管理外だけのはず。
 */

export type StoreArea = keyof typeof AREAS;
export const STORE_AREAS = Object.keys(AREAS) as StoreArea[];
export const isStoreArea = (v: string | undefined): v is StoreArea => !!v && v in AREAS;

type Dataset = (typeof DATASETS)[number] & { immutable?: boolean; local?: boolean; planned?: boolean; schema?: unknown };
type Shape = { format: string; summary: string; rows: { path: string; type: string }[]; doc: string | null; error?: string };

export type StoreNavItem = { id: string; label: string };

/** サイドバーの枝（設定・データの下の領域）。台帳だけで決め、ファイルは読まない */
export function storeNav(): Record<StoreArea, StoreNavItem[]> {
  try {
    const domains = (loadDomains(findRepoRoot()) as { domains: { id: string; label: string }[] }).domains;
    const label = (id: string) => domains.find((d) => d.id === id)?.label ?? id;
    return Object.fromEntries(
      STORE_AREAS.map((a) => [a, (areaDomainIds(a, domains.map((d) => d.id)) as string[]).map((id) => ({ id, label: label(id) }))]),
    ) as Record<StoreArea, StoreNavItem[]>;
  } catch {
    return { config: [], data: [] };
  }
}

export interface StoreRow {
  id: string;
  name: string;
  doc: string;
  kind: string;
  files: number;
  updated: string | null;
  local: boolean;
  typed: boolean;
  shape: string;
}

export interface StoreDetail {
  id: string;
  name: string;
  path: string;
  doc: string;
  kind: string;
  domain: string;
  flags: string[];
  fileDoc: string | null;
  schema: { rows: { path: string; type: string; description: string | null }[]; checked: number; errors: { file: string; message: string }[] } | null;
  shape: Shape | null;
  files: { path: string; updated: string | null; size: string; untracked: boolean }[];
  more: number;
  refs: string[];
  refToken: string;
}

export interface StoreView {
  area: StoreArea;
  areaLabel: string;
  domains: { id: string; label: string; datasets: number; files: number }[];
  domain: { id: string; label: string } | null;
  rows: StoreRow[];
  detail: StoreDetail | null;
  unmatched: string[];
  total: { datasets: number; files: number; typed: number };
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
const shapeLabel = (s: Shape) => (s.format === 'JSON' ? s.summary : `${s.format}・${s.summary}`);

/** 名前で参照しているコードを探す語: ファイル名の固定部分（短すぎればフォルダ名） */
function refToken(path: string): string {
  const parts = path.split('/');
  const base = parts[parts.length - 1];
  if (!base.includes('{')) return base;
  const literal = base.replace(/\.[a-z]+$/i, '').split(/\{[^}]+\}/).sort((a, b) => b.length - a.length)[0].replace(/^[-_]+|[-_]+$/g, '');
  return literal.length >= 6 ? literal : (parts[parts.length - 2] ?? literal);
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

export function loadStoreView(area: StoreArea, domainId?: string, datasetId?: string): StoreView {
  const root = findRepoRoot();
  const { dir, label: areaLabel } = AREAS[area];
  const empty: StoreView = { area, areaLabel, domains: [], domain: null, rows: [], detail: null, unmatched: [], total: { datasets: 0, files: 0, typed: 0 }, error: null };
  try {
    const domainList = (loadDomains(root) as { domains: { id: string; label: string }[] }).domains;
    const files = listAreaFiles(root, area) as string[];
    const tracked = new Set(listAreaFiles(root, area, { tracked: true }) as string[]);
    const { byId, unmatched } = matchFiles(files) as { byId: Map<string, string[]>; unmatched: string[] };
    const sets = (DATASETS as Dataset[]).filter((x) => areaOf(x) === area);
    const filesOf = (x: Dataset) => byId.get(x.id) ?? [];
    const name = (x: Dataset) => x.path.slice(dir.length + 1);

    const domains = domainList
      .map((d) => {
        const mine = sets.filter((x) => x.domain === d.id);
        return { id: d.id, label: d.label, datasets: mine.length, files: mine.reduce((n, x) => n + filesOf(x).length, 0) };
      })
      .filter((d) => d.datasets > 0);
    const domain = domains.find((d) => d.id === domainId) ?? null;

    const rows: StoreRow[] = domain
      ? sets
          .filter((x) => x.domain === domain.id)
          .map((x) => {
            const list = filesOf(x);
            const st = list[0] ? stat(root, list[0]) : null;
            const shape = !x.schema && list[0] ? (inferShape(root, list[0]) as Shape) : null;
            return {
              id: x.id,
              name: name(x),
              doc: x.doc,
              kind: KINDS[x.kind as keyof typeof KINDS] ?? x.kind,
              files: list.length,
              updated: st ? day(st.mtimeMs) : null,
              local: !!x.local || (list.length > 0 && list.every((f) => !tracked.has(f))),
              typed: !!x.schema,
              shape: x.schema ? '型あり' : shape ? shapeLabel(shape) : x.planned ? '未着手' : '—',
            };
          })
      : [];

    const hit = datasetId ? (datasetById(datasetId) as Dataset | null) : null;
    let detail: StoreDetail | null = null;
    if (hit && areaOf(hit) === area) {
      const list = filesOf(hit);
      const shown = list.slice(0, 30);
      const token = refToken(hit.path);
      let doc: string | null = null;
      if (list[0]?.endsWith('.json')) {
        try {
          doc = fileDoc(JSON.parse(readFileSync(join(root, list[0]), 'utf8'))) as string | null;
        } catch {
          doc = null;
        }
      }
      const checked = hit.schema ? (validateFiles(root, hit, list.filter((f) => tracked.has(f))) as { checked: number; errors: { file: string; message: string }[] }) : null;
      detail = {
        id: hit.id,
        name: name(hit),
        path: hit.path,
        doc: hit.doc,
        kind: KINDS[hit.kind as keyof typeof KINDS] ?? hit.kind,
        domain: hit.domain,
        flags: [hit.immutable && '中身を変えない', hit.local && '手元だけ（git 管理外）', hit.planned && '未着手（ファイルなし）'].filter(Boolean) as string[],
        fileDoc: doc,
        schema: checked ? { rows: schemaRows(jsonSchemaOf(hit)), ...checked } : null,
        shape: !hit.schema && list[0] ? (inferShape(root, list[0]) as Shape) : null,
        files: shown.map((f) => {
          const st = stat(root, f);
          return { path: f, updated: st ? day(st.mtimeMs) : null, size: st ? sizeOf(st.size) : '—', untracked: !tracked.has(f) };
        }),
        more: list.length - shown.length,
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
      unmatched,
      total: { datasets: sets.length, files: files.length, typed: sets.filter((x) => x.schema).length },
    };
  } catch (e) {
    return { ...empty, error: (e as Error).message };
  }
}
