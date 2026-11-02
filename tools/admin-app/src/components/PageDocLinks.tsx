'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { documentLink, matchPageDocuments } from '../../../../scripts/lib/page-documents.mjs';

/**
 * 見出しの右上に「文書 N」のボタンを 1 つだけ出し、押すと今の画面の根拠の文書の一覧がシートで開く
 * （正本 config/domains.json の pageDocuments。外枠 app/layout.tsx が正本を読んで渡し、ここは今の URL で引くだけ）。
 */
export default function PageDocLinks({ map }: { map: Record<string, string[]> }) {
  const pathname = usePathname();
  const docs = matchPageDocuments(map, pathname) as string[];
  if (!docs.length) return null;
  return (
    <div className="page-doc-links">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            文書 {docs.length}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="pr-10">
            <SheetTitle>この画面の根拠の文書</SheetTitle>
          </SheetHeader>
          <ul className="space-y-2 px-4 pb-6 text-sm">
            {docs.map((d) => {
              const { href, label } = documentLink(d) as { href: string; label: string };
              return (
                <li key={d}>
                  <Link href={href} title={d}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
