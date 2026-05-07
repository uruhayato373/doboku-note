/**
 * 記事末尾の `## 参考資料` セクションを抽出して構造化する。
 *
 * content-principles.md §12 で規定された形式:
 *   - [タイトル](URL)（出典元）
 *
 * MDX を 1 行も書き換えず、render 時にこの関数で本文から抽出して
 * 別カード（<ExternalReferences>）として表示する。
 *
 * パース仕様:
 *   - `## 参考資料` 見出しから次の `## ` 見出し or EOF までをセクションとする
 *   - セクション内の `- ` で始まる行をリストアイテムとして抽出
 *   - リンクが無いアイテム（書籍参照等）は url を空文字で返す
 */

export interface ReferenceItem {
  title: string;
  url: string;
  source?: string;
}

export interface ExtractResult {
  strippedContent: string;
  references: ReferenceItem[];
}

const HEADING_RE = /^## 参考資料\s*$/m;
const NEXT_H2_RE = /\n## /;

export function extractReferencesSection(content: string): ExtractResult {
  const headingMatch = content.match(HEADING_RE);
  if (!headingMatch || headingMatch.index === undefined) {
    return { strippedContent: content, references: [] };
  }

  const headingStart = headingMatch.index;
  const sectionStart = headingStart + headingMatch[0].length;
  const restAfter = content.slice(sectionStart);

  const nextH2Match = restAfter.match(NEXT_H2_RE);
  const sectionEndOffset = nextH2Match && nextH2Match.index !== undefined
    ? nextH2Match.index
    : restAfter.length;

  const sectionBody = restAfter.slice(0, sectionEndOffset);
  const references = parseListItems(sectionBody);

  // 本文から `## 参考資料` セクション全体を削除（前後の余分な改行も整える）
  const before = content.slice(0, headingStart).replace(/\n+$/, '');
  const after = content.slice(sectionStart + sectionEndOffset).replace(/^\n+/, '');
  const strippedContent = after ? `${before}\n\n${after}` : before;

  return { strippedContent, references };
}

function parseListItems(sectionBody: string): ReferenceItem[] {
  const items: ReferenceItem[] = [];
  const lines = sectionBody.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('- ')) continue;
    const body = line.slice(2);
    items.push(parseLine(body));
  }

  return items;
}

function parseLine(body: string): ReferenceItem {
  // 形式: [title](url) followed by optional （source）
  const linkMatch = body.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/);

  if (linkMatch) {
    const title = linkMatch[1] ?? '';
    const url = linkMatch[2] ?? '';
    const rest = linkMatch[3] ?? '';
    return { title, url, ...parseSource(rest) };
  }

  // リンクが無いアイテム（書籍参照等）→ 太字を除去してタイトルとして扱う
  const cleaned = body.replace(/\*\*(.+?)\*\*/g, '$1');
  const trailing = parseSource(cleaned);
  if (trailing.source) {
    const titlePart = cleaned.replace(/（[^）]+）.*$/, '').trim();
    return { title: titlePart || cleaned.trim(), url: '', ...trailing };
  }
  return { title: cleaned.trim(), url: '' };
}

function parseSource(rest: string): { source?: string } {
  const sourceMatch = rest.match(/（([^）]+)）/);
  if (sourceMatch && sourceMatch[1]) return { source: sourceMatch[1] };
  return {};
}
