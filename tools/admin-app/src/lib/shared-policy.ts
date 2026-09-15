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
}

interface Manifest {
  schemaVersion?: number;
  version?: string;
  updated?: string;
  sourcePath?: string;
  docs?: Record<string, { sourcePath: string; version: string; updated: string }>;
}

/**
 * 配布された共有 SSOT の一覧。manifest の `docs`（schema 2）を正とし、旧 schema 1（POLICY.md のみ）
 * ならトップレベルの値から 1 件だけ組む。manifest が無ければ空（＝未配布）。
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
  const entries = manifest.docs
    ? Object.entries(manifest.docs)
    : manifest.version && manifest.sourcePath
      ? [['POLICY.md', { sourcePath: manifest.sourcePath, version: manifest.version, updated: manifest.updated ?? '' }] as const]
      : [];
  return entries
    .filter(([name]) => existsSync(join(root, name)))
    .map(([name, d]) => ({ name, slug: name.replace(/\.md$/, ''), version: d.version, updated: d.updated, sourcePath: d.sourcePath }));
}

export function sharedPolicyDoc(slug: string): SharedPolicyDoc | undefined {
  return sharedPolicyDocs().find((d) => d.slug === slug);
}

/** 画面に出す短い説明。文書の中身は写しにあるので、ここは「何の型か」だけ。 */
export const SHARED_POLICY_LABELS: Record<string, { title: string; summary: string }> = {
  'POLICY.md': { title: '共通事業方針（HARM）', summary: 'HARM・5 つの判断の問い・原則・エージェントの判断契約。企画・収益化・週次/月次計画の前に読む。' },
  'REPURPOSE.md': { title: 'SNS リパーパス戦略（6 切り口）', summary: '結論／理由／体験／反論／数字／ハウツーの 6 切り口と `angle` パラメータ。X / IG / YouTube の writer が参照。' },
  'STRUCTURE.md': { title: 'note 記事の構成（売れる 9 型）', summary: '5 ステップ骨格・9 型・強化 6 部品・制約。記事タイプ別の使い分けは note-selling-structures.md。' },
};
