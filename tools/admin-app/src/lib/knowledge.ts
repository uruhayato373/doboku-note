import { listDocuments, loadDocument, type DocumentEntry, type LoadedDocument } from './document-store';
import { rootById } from './document-roots';

/**
 * knowledge.ts — `.claude/knowledge` 用の薄いアダプタ。
 *
 * 列挙・全文検索テキスト生成・安全な詳細読込は document-store.ts が持つ
 * （/docs と同じ経路を通す＝パストラバーサル検査を 2 実装にしない）。
 * **ルートの宣言は document-roots.ts の allowlist が唯一**で、ここは引くだけ
 * （2026-08-18 まではここにも root を書いていて、allowlist と二重宣言だった）。
 */
export const KNOWLEDGE_SOURCE = rootById('knowledge')!;

export type KnowledgeEntry = DocumentEntry;

export function loadKnowledge(): KnowledgeEntry[] {
  return listDocuments(KNOWLEDGE_SOURCE);
}

export function loadKnowledgeDocument(slugParts: string[]): LoadedDocument | null {
  return loadDocument(KNOWLEDGE_SOURCE, slugParts);
}
