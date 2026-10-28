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
 *   - 行頭以外にもリンクがある行（`厚生労働省「[題](URL)」`・`[A](u)・[B](u)`）は行全体を 1 つの
 *     リンクにできないので、url を空にして parts（文とリンクの並び）で返す。
 *     以前は行全体を平文にしていて `[題](URL)` が画面にそのまま出ていた（2026-10-28・23 記事 53 行）
 *   - 太字の `**` は描画しないので外す
 */

export interface ReferencePart {
  text: string;
  url?: string;
}

export interface ReferenceItem {
  title: string;
  url: string;
  source?: string;
  parts?: ReferencePart[];
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

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function parseLine(rawBody: string): ReferenceItem {
  const body = rawBody.replace(/\*\*(.+?)\*\*/g, '$1');
  // 形式: [title](url) followed by optional （source）
  const linkMatch = body.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/);

  if (linkMatch && !(linkMatch[3] ?? '').includes('](')) {
    const title = linkMatch[1] ?? '';
    const url = linkMatch[2] ?? '';
    const rest = linkMatch[3] ?? '';
    return { title, url, ...parseSource(rest) };
  }

  if (body.includes('](')) return parseInlineLinks(body);

  // リンクが無いアイテム（書籍参照等）→ 太字を除去してタイトルとして扱う
  const cleaned = body;
  const trailing = parseSource(cleaned);
  if (trailing.source) {
    const titlePart = cleaned.replace(/（[^）]+）.*$/, '').trim();
    return { title: titlePart || cleaned.trim(), url: '', ...trailing };
  }
  return { title: cleaned.trim(), url: '' };
}

function parseInlineLinks(body: string): ReferenceItem {
  const parts: ReferencePart[] = [];
  let last = 0;
  for (const m of body.matchAll(LINK_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: body.slice(last, at) });
    parts.push({ text: m[1] ?? '', url: m[2] ?? '' });
    last = at + m[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return { title: parts.map((p) => p.text).join('').trim(), url: '', parts };
}

function parseSource(rest: string): { source?: string } {
  const sourceMatch = rest.match(/（([^）]+)）/);
  if (sourceMatch && sourceMatch[1]) return { source: sourceMatch[1] };
  return {};
}
