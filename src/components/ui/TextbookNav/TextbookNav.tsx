/**
 * 教科書の前後章ナビゲーション
 * textbook_order でソートし、現在ページの前後を表示。
 */
import type { DocMeta } from '@/lib/docs';
import { classifyDoc } from '@/lib/doc-classifier';
import PrevNextNav from './PrevNextNav';

interface TextbookNavProps {
  currentSlug: string;
  categoryArticles: DocMeta[];
}

export default function TextbookNav({ currentSlug, categoryArticles }: TextbookNavProps) {
  const textbooks = categoryArticles
    .filter((m) => classifyDoc(m) === 'textbook')
    .sort((a, b) => (a.textbook_order ?? 999) - (b.textbook_order ?? 999));

  const idx = textbooks.findIndex((m) => m.slug === currentSlug);
  if (idx === -1) return null;

  const prev = idx > 0 ? textbooks[idx - 1] : null;
  const next = idx < textbooks.length - 1 ? textbooks[idx + 1] : null;

  return (
    <PrevNextNav
      heading="テキスト章ナビゲーション"
      track="textbook-nav"
      prev={prev ?? null}
      next={next ?? null}
      prevLabel="前の章"
      nextLabel="次の章"
    />
  );
}
