/**
 * MDX を通らない平文（参考資料の行・frontmatter の FAQ の回答）に書かれた `[題](URL)` と `**太字**` を
 * 文とリンクの並びに分ける。描画は `InlineParts`、構造化データなどの平文は `inlinePlainText` で使う。
 * 以前はそのまま平文で出していて `[題](URL)` が画面に出ていた（2026-10-28 の描画検査）。
 */

export interface InlinePart {
  text: string;
  url?: string;
}

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

export function inlineParts(text: string): InlinePart[] {
  const body = stripBold(text);
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of body.matchAll(LINK_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: body.slice(last, at) });
    parts.push({ text: m[1] ?? '', url: m[2] ?? '' });
    last = at + m[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
}

export function inlinePlainText(text: string): string {
  return inlineParts(text).map((p) => p.text).join('');
}
