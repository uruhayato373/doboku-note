import {
  CONTENT_ROOT, DOCS_ROOT, KNOWLEDGE_ROOT, PLANS_ROOT,
} from '../../../../scripts/lib/repository-paths.mjs';
import type { DocumentSource } from './document-store';

/**
 * document-roots.ts — 管理画面が読んでよいルートの **allowlist**。
 *
 * ルートを増やすときは必ずここへ descriptor を足す。画面側でパスを組み立てない
 * （root 外参照の判定を 1 箇所に閉じるため。検査は document-store の prefix + realpath）。
 *
 * 2026-08-18 の情報アーキテクチャ移行に合わせ、`docs/` と `content/` を独立ルートにした。
 * 移行期間に置いていた旧ルート fallback は**移行完了と同時に削除済み**
 * （残すと「新旧どちらが SSOT か」が画面から判らなくなる）。旧配置の復活は
 * `scripts/check-information-architecture.mjs` が機械で止める。
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
];

export const rootById = (id: string) => ROOTS.find((r) => r.id === id);

export const contentChannelLabel = (segment: string): string =>
  ({
    site: 'サイト', note: 'note', coconala: 'ココナラ', sns: 'SNS',
    kindle: 'Kindle', sources: '原典・入力資料',
    textbook: '原典・入力資料',
  } as Record<string, string>)[segment] ?? segment;

/** filePrefix から DocumentSource を引く。/content の URL 解決用。 */
export function sourceByPrefix(d: RootDescriptor, prefix: string): DocumentSource | null {
  return prefix === d.filePrefix ? d : null;
}
