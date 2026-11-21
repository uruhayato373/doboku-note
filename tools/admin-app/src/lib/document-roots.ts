import { posix } from 'node:path';
import { documentLink } from '../../../../scripts/lib/page-documents.mjs';
import {
  CONTENT_ROOT, DOCS_ROOT, KNOWLEDGE_ROOT, PLANS_ROOT, SHARED_POLICY_ROOT,
} from '../../../../scripts/lib/repository-paths.mjs';
import type { DocumentSource } from './document-store';
import { contentSegmentLabel } from './channel-registry';

/**
 * document-roots.ts — 管理画面が読んでよいルートの **allowlist**。
 *
 * ルートを増やすときは必ずここへ descriptor を足す。画面側でパスを組み立てない
 * （root 外参照の判定を 1 箇所に閉じるため。検査は document-store の prefix + realpath）。
 *
 * 2026-08-18 の情報アーキテクチャ移行に合わせ、`docs/` と `content/` を独立ルートにした。
 * 移行期間に置いていた旧ルート fallback は**移行完了と同時に削除済み**
 * （残すと「新旧どちらが SSOT か」が画面から判らなくなる）。旧配置の復活は
 * `scripts/checks/check-information-architecture.mjs` が機械で止める。
 *
 * root のパスは `scripts/lib/repository-paths.mjs` が唯一の宣言で、ここは引くだけ。
 */
export interface RootDescriptor extends DocumentSource {
  id: string;
  label: string;
  routeBase: string;
  /** 空のときに画面へ出す説明（「未作成」と「本当に空」を区別する） */
  emptyState: string;
  /** チャネル → ディレクトリ → 文書と段階的に列挙する（content のように巨大なルート） */
  staged?: boolean;
}

const MD = new Set(['.md']);
const MD_JSON = new Set(['.md', '.json']);

export const ROOTS: RootDescriptor[] = [
  {
    id: 'docs',
    label: '文書',
    routeBase: '/docs',
    root: DOCS_ROOT as string,
    filePrefix: 'docs',
    allowedExtensions: MD,
    emptyState: 'docs/ に文書がありません。',
  },
  {
    id: 'content',
    label: 'コンテンツ',
    routeBase: '/content',
    root: CONTENT_ROOT as string,
    filePrefix: 'content',
    allowedExtensions: MD,
    staged: true,
    emptyState: 'content/ にチャネルがありません。',
  },
  {
    id: 'knowledge',
    label: 'ナレッジ',
    routeBase: '/knowledge',
    root: KNOWLEDGE_ROOT as string,
    filePrefix: '.claude/knowledge',
    allowedExtensions: MD_JSON,
    emptyState: '.claude/knowledge に文書がありません。',
  },
  {
    id: 'plans',
    label: '実装計画',
    routeBase: '/plans',
    root: PLANS_ROOT as string,
    filePrefix: '.claude/plans',
    allowedExtensions: MD,
    emptyState: '実行中の実装契約はありません（完了した plan は削除する運用）。',
  },
  {
    id: 'shared-policy',
    label: '共通事業方針',
    routeBase: '/strategy/policy',
    root: SHARED_POLICY_ROOT as string,
    filePrefix: '.claude/shared-policy',
    allowedExtensions: MD,
    emptyState: '配布物がありません（Obsidian vault で npm run policy:sync を実行）。',
  },
];

export const rootById = (id: string) => ROOTS.find((r) => r.id === id);

/**
 * `/content` チャネルカードのラベル。物理セグメント→論理 channel の解決は
 * channel-registry.ts の唯一の mapping を通す（DN-0103 Phase 01・ラベルの二重定義を避ける）。
 */
export const contentChannelLabel = contentSegmentLabel;

/**
 * 文書本文の相対リンク・画像の宛先を管理画面の URL へ引く**唯一の判定**（markdown.ts が使う）。
 *
 * - `fromFile` はリポジトリ相対の文書パス（`docs/strategy/README.md`）。`url` は本文に書かれた値
 * - 戻り値: `undefined` = 書き換え対象外（外部 URL・絶対パス・`#見出し` だけ）／`null` = 管理画面で
 *   開けない宛先（`config/*.json`・`.mdx`・`src/*`・ディレクトリなど。呼び出し側はリンクを外す）／
 *   文字列 = 書き換え後の URL（`#見出し` は残す）
 * - docs 宛は page-documents.mjs の documentLink と同じ URL、content 宛は `/content/content~<相対パス>`
 *   （content/[...path]/page.tsx の形）。content のディレクトリは一覧が開けるのでリンクする
 * - 画像は docs 配下だけ `/media/docs/<docs からの相対パス>` へ（media route の MEDIA_ROOTS.docs）
 */
export function adminUrlFor(fromFile: string, url: string, kind: 'link' | 'image' = 'link'): string | null | undefined {
  if (!url || url.startsWith('#') || url.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(url)) return undefined;
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  let pathPart = (hashAt >= 0 ? url.slice(0, hashAt) : url).split('?')[0]!;
  try { pathPart = decodeURIComponent(pathPart); } catch { /* 不正な %エスケープは原文のまま扱う */ }
  if (!pathPart) return undefined;

  const target = posix.normalize(posix.join(posix.dirname(fromFile), pathPart)).replace(/\/+$/, '');
  if (target === '.' || target.startsWith('..')) return null; // リポジトリの外

  if (kind === 'image') {
    return target.startsWith(`${DOCS_PREFIX}/`) ? `/media/docs/${target.slice(DOCS_PREFIX.length + 1)}` : undefined;
  }

  const root = ROOTS.find((r) => target === r.filePrefix || target.startsWith(`${r.filePrefix}/`));
  if (!root) return null;
  const rel = target.slice(root.filePrefix.length + 1);
  const ext = posix.extname(target);
  if (!rel) return root.id === 'content' ? null : `${root.routeBase}${hash}`;
  if (!ext) return root.id === 'content' ? `/content/content~${rel}${hash}` : null;
  if (!root.allowedExtensions.has(ext)) return null;
  const slug = rel.slice(0, -ext.length);
  if (root.id === 'docs') return `${documentLink(target).href}${hash}`;
  if (root.id === 'content') return `/content/content~${slug}${hash}`;
  return `${root.routeBase}/${slug}${hash}`;
}

const DOCS_PREFIX = 'docs';

/** filePrefix から DocumentSource を引く。/content の URL 解決用。 */
export function sourceByPrefix(d: RootDescriptor, prefix: string): DocumentSource | null {
  return prefix === d.filePrefix ? d : null;
}
