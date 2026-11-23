import type { ReactNode } from 'react';
import TableOfContents from '@/components/docs/TableOfContents';
import type { TocHeading } from '@/lib/toc';

/** 右の欄の最後の追従ブロック（RailFollow）に渡す現在地の目次。H2 が無ければ目次は出さず、追従ブロックは広告だけになる（記事・基準書の章と節が使う） */
export function followToc(headings: readonly TocHeading[]): ReactNode {
  return headings.some((h) => h.level === 2) ? <TableOfContents headings={[...headings]} compact /> : null;
}
