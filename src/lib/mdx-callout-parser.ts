

// Callout記法の正規表現パターン
const CALLOUT_PATTERN = /^>\s*\[!(\w+)\](.*?)$/;

// サポートされているCalloutタイプ
const SUPPORTED_TYPES = ['info', 'warning', 'error', 'success', 'note', 'tip'];

/**
 * MDXコンテンツ内のCallout記法をReactコンポーネントに変換
 * @param content MDXコンテンツ
 * @returns 変換されたコンテンツ
 */
export function parseCallouts(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inCallout = false;
  let calloutType = '';
  let calloutTitle = '';
  let calloutContent: string[] = [];
  let calloutStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // undefinedや空行も処理する必要がある
    const lineToProcess = line ?? '';

    const match = lineToProcess.match(CALLOUT_PATTERN);

    if (match && !inCallout) {
      // Callout開始
      inCallout = true;
      calloutType = match[1]?.toLowerCase() || 'info';
      calloutTitle = match[2]?.trim() || '';
      calloutContent = [];
      calloutStartIndex = result.length; // resultの現在のインデックスを使用

      // サポートされていないタイプの場合はinfoにフォールバック
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

      // Calloutコンポーネントを生成
      const calloutComponent = generateCalloutComponent(calloutType, calloutTitle, calloutContent);

      // Calloutコンポーネントを追加
      result.push(calloutComponent);

      // 空行を追加してCalloutコンポーネントを分離
      result.push('');

      // 現在の行を処理
      result.push(lineToProcess);

    } else {
      // 通常の行（空行を含む）
      result.push(lineToProcess);
    }
  }

  // 最後のCalloutが終了していない場合の処理
  if (inCallout) {
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
  const titleAttr = title ? ` title="${title}"` : '';
  const contentText = content.join('\n');
  
  return `<Callout type="${type}"${titleAttr}>\n${contentText}\n</Callout>`;
}

/**
 * インラインCallout記法の変換（1行での記述）
 */
export function parseInlineCallouts(content: string): string {
  return content.replace(
    />\s*\[!(\w+)\](.*?)$/gm,
    (match, type, title) => {
      const cleanType = (type as string)?.toLowerCase() || 'info';
      const cleanTitle = (title as string)?.trim() || '';
      const supportedType = SUPPORTED_TYPES.includes(cleanType) ? cleanType : 'info';
      
      return `<Callout type="${supportedType}" title="${cleanTitle}">`;
    }
  );
} 