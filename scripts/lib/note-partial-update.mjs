/**
 * note 部分更新の純粋関数。ブラウザ操作と分離し、spec と PDF 添付不変条件をテスト可能にする。
 */

const SUPPORTED = new Set([
  'replaceText',
  'replaceTopCta',
  'insertTopCta',
  'replaceCard',
  'replaceLink',
  'removeBlock',
  'insertAfter',
  'insertListItems',
  'moveSectionBefore',
  'replaceSectionHtml',
  'replaceElementHtml',
  'moveBlockGroupBefore',
  'insertBeforeHeadingHtml',
  'replaceImage',
]);

export function validatePartialSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('spec は JSON object が必要');
  if (!spec.article || typeof spec.article !== 'string') throw new Error('spec.article が必要');
  if (!Array.isArray(spec.operations) || spec.operations.length === 0) throw new Error('spec.operations が必要');
  if (spec.verifyLiveApi !== undefined && typeof spec.verifyLiveApi !== 'boolean') {
    throw new Error('spec.verifyLiveApi は boolean');
  }
  if (spec.publishWhenAlready !== undefined && typeof spec.publishWhenAlready !== 'boolean') {
    throw new Error('spec.publishWhenAlready は boolean');
  }

  for (const [index, op] of spec.operations.entries()) {
    const at = `operations[${index}]`;
    if (!op || !SUPPORTED.has(op.type)) throw new Error(`${at}.type が未対応: ${op?.type ?? ''}`);
    if (op.expected !== undefined && (!Number.isInteger(op.expected) || op.expected < 1)) {
      throw new Error(`${at}.expected は 1 以上の整数`);
    }
    if (op.type === 'replaceText') {
      if (!op.old || typeof op.new !== 'string') throw new Error(`${at}: old/new が必要`);
      if (op.old === op.new) throw new Error(`${at}: old と new が同一`);
    } else if (op.type === 'replaceTopCta') {
      if (!op.oldStart || typeof op.newText !== 'string' || !Array.isArray(op.newUrls)) {
        throw new Error(`${at}: oldStart/newText/newUrls が必要`);
      }
      if (op.newText && !op.probe) throw new Error(`${at}: 新CTAの冪等確認用 probe が必要`);
    } else if (op.type === 'insertTopCta') {
      if (!op.newText || !Array.isArray(op.newUrls) || !op.probe) {
        throw new Error(`${at}: newText/newUrls/probe が必要`);
      }
    } else if (op.type === 'replaceCard') {
      if (!op.oldKey || !op.newUrl) throw new Error(`${at}: oldKey/newUrl が必要`);
    } else if (op.type === 'replaceLink') {
      if (!op.oldKey || !op.newUrl) throw new Error(`${at}: oldKey/newUrl が必要`);
    } else if (op.type === 'removeBlock') {
      if (!op.needle) throw new Error(`${at}: needle が必要`);
      if (op.selector && !['p', 'figure', 'div', 'ul', 'ol', 'blockquote', 'h2', 'h3'].includes(op.selector)) {
        throw new Error(`${at}: selector が未対応`);
      }
    } else if (op.type === 'insertAfter') {
      if (!op.anchor || !Array.isArray(op.lines) || op.lines.length === 0) throw new Error(`${at}: anchor/lines が必要`);
      if (!op.probe) throw new Error(`${at}: 冪等確認用 probe が必要`);
    } else if (op.type === 'insertListItems') {
      if (!op.anchorKey || !Array.isArray(op.items) || op.items.length === 0) throw new Error(`${at}: anchorKey/items が必要`);
      if (op.position !== undefined && !['before', 'after-end'].includes(op.position)) throw new Error(`${at}: position が未対応`);
      for (const item of op.items) if (!item.url || !item.title) throw new Error(`${at}: item.url/title が必要`);
    } else if (op.type === 'moveSectionBefore') {
      if (!op.heading || !op.beforeHeading) throw new Error(`${at}: heading/beforeHeading が必要`);
      if (op.heading === op.beforeHeading) throw new Error(`${at}: 移動元と移動先が同一`);
    } else if (op.type === 'replaceSectionHtml') {
      if (!op.startHeading || !op.endHeading || !op.html || !op.probe) {
        throw new Error(`${at}: startHeading/endHeading/html/probe が必要`);
      }
      if (/<\/?(?:script|style|iframe)|\son\w+\s*=|api\/v2\/attachments\/download/i.test(op.html)) {
        throw new Error(`${at}: 許可されない HTML`);
      }
    } else if (op.type === 'replaceElementHtml') {
      if (!['p', 'li', 'ul', 'ol', 'h2', 'h3', 'blockquote'].includes(op.selector)
        || !op.oldProbe || typeof op.html !== 'string' || !op.probe) {
        throw new Error(`${at}: selector/oldProbe/html/probe が必要`);
      }
      if (/<\/?(?:script|style|iframe)|\son\w+\s*=|api\/v2\/attachments\/download/i.test(op.html)) {
        throw new Error(`${at}: 許可されない HTML`);
      }
      if (op.keepOldProbe !== undefined && typeof op.keepOldProbe !== 'boolean') {
        throw new Error(`${at}: keepOldProbe は boolean`);
      }
    } else if (op.type === 'moveBlockGroupBefore') {
      if (!op.fromNeedle || !op.beforeNeedle || !Number.isInteger(op.blocks) || op.blocks < 1) {
        throw new Error(`${at}: fromNeedle/beforeNeedle/blocks が必要`);
      }
      if (op.fromSelector && !['p', 'figure', 'div', 'ul', 'ol', 'blockquote'].includes(op.fromSelector)) throw new Error(`${at}: fromSelector が未対応`);
      if (op.beforeSelector && !['p', 'figure', 'div', 'ul', 'ol', 'blockquote'].includes(op.beforeSelector)) throw new Error(`${at}: beforeSelector が未対応`);
    } else if (op.type === 'insertBeforeHeadingHtml') {
      if (!op.beforeHeading || !op.html || !op.probe) throw new Error(`${at}: beforeHeading/html/probe が必要`);
      if (/<\/?(?:script|style|iframe)|\son\w+\s*=|api\/v2\/attachments\/download/i.test(op.html)) {
        throw new Error(`${at}: 許可されない HTML`);
      }
    } else if (op.type === 'replaceImage') {
      if (!Number.isInteger(op.imageIndex) || op.imageIndex < 0 || !Number.isInteger(op.expectedImages) || op.expectedImages < 1
        || !op.oldSrcKey || !op.file || !op.followingProbe) {
        throw new Error(`${at}: imageIndex/expectedImages/oldSrcKey/file/followingProbe が必要`);
      }
    }
  }
  return spec;
}

export function normalizeAttachmentSnapshot(snapshot) {
  const hrefs = (snapshot?.hrefs || [])
    .map((href) => String(href).replace(/[?#].*$/, ''))
    .sort();
  const names = (snapshot?.names || []).map(String).sort();
  return { hrefs, names };
}

export function sameAttachmentSnapshot(before, after) {
  return JSON.stringify(normalizeAttachmentSnapshot(before)) === JSON.stringify(normalizeAttachmentSnapshot(after));
}
