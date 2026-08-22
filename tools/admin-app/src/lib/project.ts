import { readFileSync } from 'node:fs';
import { listDocuments, loadDocument, type DocumentEntry, type LoadedDocument } from './document-store';
import { rootById } from './document-roots';
import { repoPath } from './repo-root';

/**
 * project.ts — 恒久文書（`docs/`）固有の領域ラベル・警告・backlog ID 参照の抽出。
 *
 * 列挙と安全な読込は document-store.ts（`.claude/knowledge` と同一経路）。
 * ここが持つのは docs/ だけの意味付け＝領域ラベル、未チェック記法の件数、
 * `DN-####` 参照、廃止済み経路の警告。
 *
 * 2026-08-18 の情報アーキテクチャ移行で `docs/project/{01_戦略,…}` は `docs/{strategy,…}` へ
 * フラット化し、`docs/project/_archive/` は 3 件を個別に分類して消滅した
 * （現行チェックリスト 1 件は docs/operations へ、完遂 2 件は削除）。**アーカイブ層は無い**ので、
 * 「アーカイブだから警告集計の対象外」という分岐も持たない。
 *
 * **Markdown が SSOT**。HTML はリクエスト時に生成し、生成物を保存しない。
 * 管理画面から本文を編集する経路は持たない（read-only）。
 */

/** ルートの宣言は document-roots.ts の allowlist が唯一。ここは引くだけ。 */
export const PROJECT_SOURCE = rootById('docs')!;

/** ディレクトリ名（URL・物理パス）→ 画面ラベル（日本語）。 */
const SECTION_LABELS: Record<string, string> = {
  // docs/ 直下のファイル（README.md）は領域に属さない
  root: '索引',
  strategy: '戦略',
  editorial: 'コンテンツ',
  marketing: 'マーケティング',
  operations: '運営',
  products: 'プロダクト',
  design: 'デザイン',
  handoffs: '引き継ぎ',
  reviews: 'レビュー',
};

export const sectionLabel = (section: string) => SECTION_LABELS[section] ?? section;

/** 相対パスの先頭ディレクトリ。直下のファイルは領域を持たないので 'root'。 */
const sectionOf = (rel: string) => (rel.includes('/') ? rel.split('/')[0]! : 'root');

/** backlog ID の記法。カテゴリや優先度は将来変わるので ID へ含めない。 */
export const BACKLOG_ID_RE = /DN-\d{4}/g;

/**
 * 廃止済み経路。参照が残っていると「進捗の SSOT がそこにある」と読めてしまう。
 * ファイルを再作成して参照を成立させてはならない（2026-06-11 に廃止済み）。
 */
const RETIRED_PATTERNS: RegExp[] = [
  /\.claude\/state\/task-queue\.json/g,
  /(?<![\w/.-])task-queue\.json/g,
  new RegExp(['docs/project', 'TODO\\.md'].join('/'), 'g'),
];

export interface ProjectEntry extends DocumentEntry {
  section: string;
  sectionLabel: string;
  uncheckedCount: number;
  backlogIds: string[];
  retiredReferenceCount: number;
}

/** 本文から未チェック記法・ID・廃止参照を数える。 */
function analyze(content: string) {
  return {
    uncheckedCount: (content.match(/^\s*[-*]\s+\[ \]\s/gm) ?? []).length,
    backlogIds: [...new Set(content.match(BACKLOG_ID_RE) ?? [])].sort(),
    retiredReferenceCount: RETIRED_PATTERNS.reduce((sum, re) => sum + (content.match(re) ?? []).length, 0),
  };
}

export function loadProjectEntries(): ProjectEntry[] {
  return listDocuments(PROJECT_SOURCE).map((entry) => {
    const section = sectionOf(entry.slug);
    const content = readFileSync(repoPath(...entry.file.split('/')), 'utf8');
    return { ...entry, section, sectionLabel: sectionLabel(section), ...analyze(content) };
  });
}

export interface LoadedProjectDocument extends LoadedDocument {
  section: string;
  sectionLabel: string;
  uncheckedCount: number;
  backlogIds: string[];
  retiredReferenceCount: number;
}

/**
 * 解決済みの `file`（例 `docs/operations/13_...md`）と本文から領域固有の意味付けを採る。
 * `/docs` の詳細画面がレールを組み立てるのに使う。実装は 1 つにして両経路が同じ結果を出す。
 */
export function projectAnalysis(file: string, content: string) {
  const prefix = `${PROJECT_SOURCE.filePrefix}/`;
  if (!file.startsWith(prefix)) return null;
  const section = sectionOf(file.slice(prefix.length));
  return { section, sectionLabel: sectionLabel(section), ...analyze(content) };
}

export function loadProjectDocument(slugParts: string[]): LoadedProjectDocument | null {
  const document = loadDocument(PROJECT_SOURCE, slugParts);
  if (!document) return null;
  // section は **解決済みの file パス**から採る。slugParts は URL エンコードのまま届くことが
  // あり、生のまま使うとパンくずが `04_%E9%81%8B%E5%96%B6` と出る（2026-08-18 実測）。
  const section = sectionOf(document.file.slice(`${PROJECT_SOURCE.filePrefix}/`.length));
  return { ...document, section, sectionLabel: sectionLabel(section), ...analyze(document.content) };
}

/**
 * backlog ID → その ID を参照している恒久文書。
 * TODO カードから「どの戦略文書がこのタスクを指しているか」へ戻るために使う（相互リンク）。
 */
export function projectRefsByBacklogId(): Map<string, { slug: string; title: string }[]> {
  const out = new Map<string, { slug: string; title: string }[]>();
  for (const entry of loadProjectEntries()) {
    for (const id of entry.backlogIds) {
      const list = out.get(id) ?? [];
      list.push({ slug: entry.slug, title: entry.title });
      out.set(id, list);
    }
  }
  return out;
}
