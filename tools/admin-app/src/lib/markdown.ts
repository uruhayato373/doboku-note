import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { defaultSchema, type Schema } from 'hast-util-sanitize';
import { visit } from 'unist-util-visit';
import type { Root, RootContent, Blockquote, Paragraph, Text, Table } from 'mdast';

/**
 * markdown.ts — admin 内で .md を HTML にする**唯一のパイプライン**。
 *
 * ナレッジタブ（knowledge.ts）・TODO の詳細展開（todo/page.tsx）・Project 詳細
 * （project.ts）が同じ関数を通る。ここを 2 実装に分けると「ナレッジでは表が出るのに
 * TODO では出ない」のような見え方のドリフトが起きるので、プラグイン構成を変えるときは
 * 必ずここだけを触る。
 *
 * `sanitize` は既定（GitHub 相当の defaultSchema）に、Obsidian callout の `<div class="callout …">`
 * と表ラッパー `<div class="table-wrap">` だけを狭く許可した拡張スキーマを渡す
 * （DN-0103 Phase 02）。許可するのは固定の class/data 値のみで、`<script>` 除去・
 * `javascript:` URL 拒否・任意 raw HTML 拒否といった既定の防御は一切弱めない。
 *
 * 見出し目次は**同じ AST から**採る（正規表現で本文を二度読みしない）。id の採番も
 * その 1 回の走査が持つ順序に従って行うので、目次と本文の id がずれることがない。
 */

export interface DocumentHeading {
  depth: 2 | 3;
  text: string;
  id: string;
}

/** 見出しノードの可視テキスト（インラインコード・リンクの中身も拾う）。 */
function headingText(node: RootContent): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => headingText(child as RootContent)).join('');
  }
  return '';
}

/**
 * 日本語見出しは英数 slug にならないので、可視テキストをそのまま id に使い、
 * 衝突したときだけ連番を足す（同一文書内で一意・仕様 §7.4）。
 */
function toId(text: string, used: Map<string, number>): string {
  const base =
    text
      .trim()
      .replace(/\s+/g, '-')
      .replace(/["'`<>&#?%\\/]/g, '')
      .slice(0, 80) || 'section';
  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

/** AST を 1 回だけ走査して H2/H3 を拾う。HTML への id 付与もこの順序を使う。 */
function collectHeadings(tree: Root): DocumentHeading[] {
  const used = new Map<string, number>();
  const out: DocumentHeading[] = [];
  for (const node of tree.children) {
    if (node.type !== 'heading') continue;
    if (node.depth !== 2 && node.depth !== 3) continue;
    const text = headingText(node as RootContent).trim();
    if (!text) continue;
    out.push({ depth: node.depth, text, id: toId(text, used) });
  }
  return out;
}

/* ── Obsidian callout（`> [!note] タイトル`）を安全な div へ変換する ──
   docs-markdown-style.md の推奨 4 種（note/warning/important/todo）に加え、
   Obsidian 標準の tip/caution/warn（warning の別名）まで allowlist で受ける。
   allowlist に無い type（例: 実在する `[!info]` / `[!done]`）は通常の blockquote へ
   フォールバックする（本文の `[!xxx]` は消さない＝タイプミスを隠さない）。 */

const CALLOUT_TYPES: Readonly<Record<string, { cls: string; label: string }>> = {
  note: { cls: 'note', label: 'Note' },
  tip: { cls: 'tip', label: 'Tip' },
  important: { cls: 'important', label: 'Important' },
  warning: { cls: 'warning', label: 'Warning' },
  warn: { cls: 'warning', label: 'Warning' },
  caution: { cls: 'caution', label: 'Caution' },
  todo: { cls: 'todo', label: 'Todo' },
};

/** `[!type]` `[!type]+` `[!type]-` の後ろに任意タイトル、その後の行は本文として続いてよい。 */
const CALLOUT_MARKER = /^\[!(\w+)]([+-]?)[ \t]*([^\n]*)\n?([\s\S]*)$/;

/**
 * blockquote が `> [!type] タイトル` で始まっていれば callout div へ書き換える。
 * 該当しなければ何もしない（通常の blockquote のまま描画される）。
 */
function applyCalloutIfMatched(node: Blockquote): void {
  const first = node.children[0];
  if (!first || first.type !== 'paragraph') return;
  const firstText = (first as Paragraph).children[0];
  if (!firstText || firstText.type !== 'text') return;

  const match = CALLOUT_MARKER.exec((firstText as Text).value);
  if (!match) return;
  const meta = CALLOUT_TYPES[match[1]!.toLowerCase()];
  if (!meta) return; // unknown type → 通常の blockquote へフォールバック

  const title = (match[3] ?? '').trim();
  const restInSameNode = match[4] ?? '';
  (firstText as Text).value = restInSameNode;

  const firstParaEmpty = restInSameNode.trim() === '' && (first as Paragraph).children.length === 1;
  const bodyChildren = node.children.slice(1);
  if (!firstParaEmpty) bodyChildren.unshift(first);

  const titleNode: Paragraph = {
    type: 'paragraph',
    data: { hName: 'div', hProperties: { className: ['callout-title'] } },
    children: [{ type: 'text', value: title || meta.label }],
  };

  node.data = {
    hName: 'div',
    hProperties: { className: ['callout', `callout-${meta.cls}`], dataCallout: meta.cls },
  };
  node.children = [titleNode, ...bodyChildren];
}

function calloutPlugin() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      applyCalloutIfMatched(node);
    });
  };
}

/**
 * GFM table を横スクロール可能な `<div class="table-wrap">` で包む。
 * 正規表現での HTML 後処理はしない（AST 上で新しいラップノードを差し込むだけ）。
 */
function tableWrapPlugin() {
  return (tree: Root) => {
    visit(tree, 'table', (node: Table, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      const wrapper: RootContent = {
        type: 'paragraph',
        data: { hName: 'div', hProperties: { className: ['table-wrap'] } },
        children: [node],
      } as unknown as RootContent;
      parent.children.splice(index, 1, wrapper);
      return ['skip', index + 1] as const;
    });
  };
}

/**
 * defaultSchema（GitHub 相当）に、callout / table-wrap の div だけを狭く追加した sanitize schema。
 * `div` 以外のタグ・`class`/`data-callout` 以外の属性は一切広げない。
 */
const CALLOUT_CLASS_VALUES = [
  'callout',
  'callout-note',
  'callout-tip',
  'callout-important',
  'callout-warning',
  'callout-caution',
  'callout-todo',
  'callout-title',
  'table-wrap',
] as const;

const CALLOUT_DATA_VALUES = ['note', 'tip', 'important', 'warning', 'caution', 'todo'] as const;

const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['className', ...CALLOUT_CLASS_VALUES],
      ['dataCallout', ...CALLOUT_DATA_VALUES],
    ],
  },
};

const processor = () =>
  remark().use(remarkGfm).use(calloutPlugin).use(tableWrapPlugin).use(remarkHtml, { sanitize: sanitizeSchema });

/** HTML だけが要る呼び出し側（TODO カード本文など）向け。 */
export function renderMarkdown(markdown: string): string {
  return String(processor().processSync(markdown));
}

/**
 * HTML と見出し目次を同時に返す。
 *
 * sanitize が属性を落とすため id は AST では埋め込めない。代わりに **collectHeadings が
 * 返した順序**で出力 HTML の `<h2>`/`<h3>` に順番に id を差し込む（抽出元は AST 1 つ）。
 * 見出し抽出は callout/table 変換より前の生の parse 結果から行う（見出しノードの形は
 * どちらの変換にも影響されないため、二重変換を避けて素の tree から拾う）。
 */
export function renderDocument(markdown: string): { html: string; headings: DocumentHeading[] } {
  const tree = remark().use(remarkGfm).parse(markdown) as Root;
  const headings = collectHeadings(tree);
  let html = String(processor().processSync(markdown));

  let i = 0;
  html = html.replace(/<(h2|h3)>/g, (match, tag: string) => {
    const depth = tag === 'h2' ? 2 : 3;
    while (i < headings.length && headings[i]!.depth !== depth) i += 1;
    const heading = headings[i];
    if (!heading) return match;
    i += 1;
    return `<${tag} id="${heading.id}">`;
  });

  return { html, headings };
}
