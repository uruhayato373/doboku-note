// mdx-hygiene-rules.mjs — lint-mdx-mobile.mjs の追加ルール群（純関数・テスト可能）。
//
// 各関数は (lines[], findings[]) を受け取り、content 相対の行番号で
// { severity, rule, line, endLine, message } を findings に push する。
// lint-mdx-mobile 本体が offset シフトと config(applyContentRules) を担う。
//
//   0-3 U+FFFD 文字化け（HIGH）
//   0-4 MDX コメント内の TODO/FIXME/TBD 残存（MEDIUM）
//   2-4 見出しアンカー ID の重複（MEDIUM）
//   7-3 装飾絵文字（MEDIUM。❌✅⭕★↔ 等の過去問/強調記号は対象外。7-1/7-2 は既存の太字ルール）
//   10-6 alt が空 or 一般語（MEDIUM。80字超は既存 10-3 が担当で重複しない）

import { generateHeadingId } from '#lib/heading-id.mjs';

// content-authoring「絵文字禁止」の装飾絵文字 denylist。
// ⭕★↔ 等は過去問正誤・強調・関係記号として実コーパスで正規利用されるため含めない。
const DECORATIVE_EMOJI = /[💡🔑📌⚠🎯📝✨🚀👉🔥💪📊📈📉🎉👏🙌👍👎📢🔔🚨⏰💰🏆🎓📚🔍⛔🚫❗❓‼⁉😀😁😊😍🤔🥺😎🙏]/u;

// 一般語の alt（帰属情報がなく検索/読み上げに無価値）。完全一致のみ。
const GENERIC_ALT = new Set(['画像', '写真', '図', 'イメージ', 'image', 'figure', 'img', 'picture', 'photo']);

// コードフェンス内の行インデックス集合（各ルールで除外する）。
function codeFenceLineSet(lines) {
  const inFence = new Set();
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = !fence; inFence.add(i); continue; }
    if (fence) inFence.add(i);
  }
  return inFence;
}

export function lintMojibake(lines, findings) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('�')) {
      findings.push({ severity: 'HIGH', rule: '0-3', line: i + 1, endLine: i + 1, message: 'U+FFFD 文字化けを検出。元データの文字コードを確認して修正すること' });
    }
  }
}

export function lintTodoMarkers(lines, findings) {
  // {/* ... TODO|FIXME|TBD ... */} の MDX コメント内のみ（本文の「仮置き」等は対象外）。
  const text = lines.join('\n');
  const re = /\{\/\*[\s\S]*?\*\/\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (/\b(TODO|FIXME|TBD)\b/.test(m[0])) {
      const line = text.slice(0, m.index).split('\n').length;
      findings.push({ severity: 'MEDIUM', rule: '0-4', line, endLine: line, message: 'MDX コメント内に TODO/FIXME/TBD の未処理マーカー。公開前に解消 or 削除すること' });
    }
  }
}

export function lintDecorativeEmoji(lines, findings) {
  const fence = codeFenceLineSet(lines);
  for (let i = 0; i < lines.length; i++) {
    if (fence.has(i)) continue;
    if (DECORATIVE_EMOJI.test(lines[i])) {
      const hit = lines[i].match(DECORATIVE_EMOJI)[0];
      findings.push({ severity: 'MEDIUM', rule: '7-3', line: i + 1, endLine: i + 1, message: `装飾絵文字「${hit}」を検出。絵文字は使わず <Callout> 等で表現すること（content-authoring）` });
    }
  }
}

export function lintHeadingAnchorDuplicates(lines, findings) {
  const content = lines.join('\n');
  const fence = codeFenceLineSet(lines);
  const seen = new Map(); // id -> 初出行
  for (let i = 0; i < lines.length; i++) {
    if (fence.has(i)) continue;
    const m = /^(#{2,6})\s+(.+?)\s*$/.exec(lines[i]);
    if (!m) continue;
    const id = generateHeadingId(m[2]);
    if (!id) continue;
    if (seen.has(id)) {
      findings.push({ severity: 'MEDIUM', rule: '2-4', line: i + 1, endLine: i + 1, message: `見出しアンカー ID「${id}」が重複（初出 L${seen.get(id)}）。同一 ID はページ内リンクを壊すため見出し文を差別化すること` });
    } else {
      seen.set(id, i + 1);
    }
  }
  void content;
}

export function lintImageAltQuality(lines, findings) {
  const fence = codeFenceLineSet(lines);
  const tagRe = /<(?:img|ArticleImage)\b[^>]*?\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
  for (let i = 0; i < lines.length; i++) {
    if (fence.has(i)) continue;
    let m;
    tagRe.lastIndex = 0;
    while ((m = tagRe.exec(lines[i])) !== null) {
      const alt = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      if (alt === '') {
        findings.push({ severity: 'MEDIUM', rule: '10-6', line: i + 1, endLine: i + 1, message: 'alt 属性が空。画像の内容を説明する alt を付けること（image-policy）' });
      } else if (GENERIC_ALT.has(alt.toLowerCase())) {
        findings.push({ severity: 'MEDIUM', rule: '10-6', line: i + 1, endLine: i + 1, message: `alt が一般語「${alt}」。検索/読み上げに無価値。具体的な内容説明にすること` });
      }
    }
  }
}

/** 5 ルールをまとめて適用（lint-mdx-mobile の lintFile から1回呼ぶ用）。 */
export function lintMdxHygiene(lines, findings) {
  lintMojibake(lines, findings);
  lintTodoMarkers(lines, findings);
  lintDecorativeEmoji(lines, findings);
  lintHeadingAnchorDuplicates(lines, findings);
  lintImageAltQuality(lines, findings);
}
