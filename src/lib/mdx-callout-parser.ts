

// Callout記法の正規表現パターン
const CALLOUT_PATTERN = /^>\s*\[!(\w+)\](.*?)$/;

// :::directive 記法のパターン（:::tip, :::note, :::caution 等）
const DIRECTIVE_START_PATTERN = /^:::(\w+)\s*(.*)?$/;
const DIRECTIVE_END_PATTERN = /^:::$/;

// サポートされているCalloutタイプ
const SUPPORTED_TYPES = ['info', 'warning', 'error', 'success', 'note', 'tip', 'caution', 'danger'];

/**
 * MDXコンテンツ内のCallout記法をReactコンポーネントに変換
 * 2つの記法をサポート:
 * - Obsidian記法: > [!tip] Title / > content
 * - Directive記法: :::tip Title / content / :::
 * @param content MDXコンテンツ
 * @returns 変換されたコンテンツ
 */
export function parseCallouts(content: string): string {
  // CRLF/CR を LF に正規化（Windows改行のMDXで :::directive の終端 /^:::$/ が
  // 末尾 \r のためマッチせず、Calloutブロック全体が生テキストで残る不具合への対策）
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const result: string[] = [];
  let inCallout = false;
  let inDirective = false;
  let calloutType = '';
  let calloutTitle = '';
  let calloutContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // undefinedや空行も処理する必要がある
    const lineToProcess = line ?? '';

    const calloutMatch = lineToProcess.match(CALLOUT_PATTERN);
    const directiveStartMatch = lineToProcess.match(DIRECTIVE_START_PATTERN);
    const directiveEndMatch = lineToProcess.match(DIRECTIVE_END_PATTERN);

    // ::: directive 終了
    if (inDirective && directiveEndMatch) {
      inDirective = false;
      const calloutComponent = generateCalloutComponent(calloutType, calloutTitle, calloutContent);
      result.push(calloutComponent);
      result.push('');
      continue;
    }

    // ::: directive 内のコンテンツ
    if (inDirective) {
      calloutContent.push(lineToProcess);
      continue;
    }

    // ::: directive 開始
    if (directiveStartMatch && !inCallout && !inDirective) {
      inDirective = true;
      calloutType = directiveStartMatch[1]?.toLowerCase() || 'info';
      calloutTitle = directiveStartMatch[2]?.trim() || '';
      calloutContent = [];

      if (!SUPPORTED_TYPES.includes(calloutType)) {
        calloutType = 'info';
      }
      continue;
    }

    // > [!type] Obsidian記法の開始
    if (calloutMatch && !inCallout) {
      inCallout = true;
      calloutType = calloutMatch[1]?.toLowerCase() || 'info';
      calloutTitle = calloutMatch[2]?.trim() || '';
      calloutContent = [];

      if (!SUPPORTED_TYPES.includes(calloutType)) {
        calloutType = 'info';
      }

    } else if (inCallout && lineToProcess.startsWith('>')) {
      // Callout内のコンテンツ
      const content = lineToProcess.substring(1).trim();
      if (content) {
        calloutContent.push(content);
      }

    } else if (inCallout && !lineToProcess.startsWith('>')) {
      // Callout終了
      inCallout = false;

      const calloutComponent = generateCalloutComponent(calloutType, calloutTitle, calloutContent);
      result.push(calloutComponent);
      result.push('');
      result.push(lineToProcess);

    } else {
      // 通常の行（空行を含む）
      result.push(lineToProcess);
    }
  }

  // 最後のCallout/Directiveが終了していない場合の処理
  if (inCallout || inDirective) {
    const calloutComponent = generateCalloutComponent(calloutType, calloutTitle, calloutContent);
    result.push(calloutComponent);
    result.push('');
  }

  return result.join('\n');
}

/**
 * CalloutコンポーネントのJSX文字列を生成
 */
function generateCalloutComponent(type: string, title: string, content: string[]): string {
  const escapedTitle = title.replace(/"/g, '&quot;');
  const titleAttr = escapedTitle ? ` title="${escapedTitle}"` : '';
  const contentText = content.join('\n');

  return `<Callout type="${type}"${titleAttr}>\n${contentText}\n</Callout>`;
}
