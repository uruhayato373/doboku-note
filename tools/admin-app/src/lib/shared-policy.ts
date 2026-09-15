import 'server-only';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rootById } from '@/lib/document-roots';

/** `.claude/shared-policy/manifest.json`（sync.mjs が配布時に書く）の読み取り専用ビュー。 */
export interface SharedPolicyDoc {
  /** 配布ファイル名（POLICY.md 等） */
  name: string;
  /** URL セグメント（拡張子なし） */
  slug: string;
  version: string;
  updated: string;
  /** Obsidian vault 内の正本パス（memos/…SSOT.md） */
  sourcePath: string;
  /** 索引カードの見出しと 1 行説明。正本の frontmatter → manifest 経由（配布時に必須検査済み）。ここに写しを持たない */
  title: string;
  summary: string;
}

interface Manifest {
  schemaVersion?: number;
  version?: string;
  updated?: string;
  sourcePath?: string;
  docs?: Record<string, { sourcePath: string; version: string; updated: string; title?: string; summary?: string }>;
}

/**
 * 配布された共有 SSOT の一覧。manifest の `docs`（schema 2）を正とし、旧 schema 1（POLICY.md のみ）
 * ならトップレベルの値から 1 件だけ組む。manifest が無ければ空（＝未配布）。
 * 文書を増やすときはここを触らない——正本側（obsidian の sync.mjs `docs`）に 1 行足して配布すれば索引に出る。
 */
export function sharedPolicyDocs(): SharedPolicyDoc[] {
  const root = rootById('shared-policy')?.root;
  if (!root) return [];
  const manifestPath = join(root, 'manifest.json');
  if (!existsSync(manifestPath)) return [];
  let manifest: Manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  } catch {
    return [];
  }
  type DocMeta = NonNullable<Manifest['docs']>[string];
  const entries: [string, DocMeta][] = manifest.docs
    ? Object.entries(manifest.docs)
    : manifest.version && manifest.sourcePath
      ? [['POLICY.md', { sourcePath: manifest.sourcePath, version: manifest.version, updated: manifest.updated ?? '' }]]
      : [];
  return entries
    .filter(([name]) => existsSync(join(root, name)))
    .map(([name, d]) => {
      const slug = name.replace(/\.md$/, '');
      return {
        name,
        slug,
        version: d.version,
        updated: d.updated,
        sourcePath: d.sourcePath,
        title: d.title ?? slug,
        summary: d.summary ?? '',
      };
    });
}

export function sharedPolicyDoc(slug: string): SharedPolicyDoc | undefined {
  return sharedPolicyDocs().find((d) => d.slug === slug);
}
