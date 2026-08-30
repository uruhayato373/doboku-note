import Link from 'next/link';
import type { StandardDocument } from '@/lib/standards';
import { parseSourcePages, resolveSourcePageHref } from '@/lib/standards-articles';

/**
 * 章記事から原典（逐語文字起こし）の該当 PDF ページへ戻す小さな導線。
 *
 * 章記事は派生コンテンツなので、読者が原本の版面を確かめられる経路を必ず残す。表を GFM へ
 * 復元せずコードブロックで出しているのも同じ理由（確信の無い復元より原文の保全を採る）で、
 * 表と図キャプションには必ずこれが付く。
 *
 * `pages` は生成器が埋める `"151"` か `"151-153"`。原典はページ単位でしかアンカーを持たないので
 * リンク先は先頭ページにし、範囲は表示だけで示す。
 */
export default function SourceRef({
  pages,
  kind = 'section',
  document,
}: {
  pages: string;
  kind?: 'section' | 'table' | 'figure';
  document: StandardDocument;
}) {
  const range = parseSourcePages(pages);
  if (!range) return null;
  const href = resolveSourcePageHref(document, range.first);
  if (!href) return null;
  const label = range.first === range.last ? `原本 p.${range.first}` : `原本 p.${range.first}–${range.last}`;
  const prefix = kind === 'table' ? '表の' : kind === 'figure' ? '図の' : '';

  return (
    <p className="not-prose my-2">
      <Link
        href={href}
        data-source-pages={pages}
        className="focus-ring inline-flex min-h-11 items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)] hover:underline"
      >
        {prefix}原典を確認 <span className="tabular-nums">{label}</span> →
      </Link>
    </p>
  );
}
