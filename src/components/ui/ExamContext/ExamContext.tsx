import Link from 'next/link';
import { getDocMeta } from '@/lib/docs';
import { ReactNode } from 'react';

interface ExamContextProps {
  textbookSlug?: string;
  linkLabel?: string;
  children: ReactNode;
}

export default async function ExamContext({ textbookSlug, linkLabel, children }: ExamContextProps) {
  const meta = textbookSlug ? await getDocMeta(textbookSlug) : null;
  const label = linkLabel ?? meta?.title;

  return (
    <aside
      aria-label="試験対策での位置づけ"
      className="mb-8 bg-brand-fill/60 dark:bg-brand-fill/10 border-l-4 border-brand rounded-r-md px-5 py-4"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-deep dark:text-brand mb-1.5">
        試験対策での位置づけ
      </div>
      <div className="text-sm text-ink-body dark:text-gray-300 leading-relaxed">
        {children}
      </div>
      {textbookSlug && meta && (
        <div className="mt-3">
          <Link
            href={`/docs/${textbookSlug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-deep dark:text-brand hover:underline"
          >
            <span aria-hidden>→</span>
            <span>{label}</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
