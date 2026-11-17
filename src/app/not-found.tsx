import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import Eyebrow from '@/components/ui/Eyebrow/Eyebrow';
import { NOT_FOUND_TITLE } from '@/lib/metadata';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-(--bg)">
      <Eyebrow variant="mono" as="div" className="mb-2">404 — Not Found</Eyebrow>
      <h1 className="font-serif font-black text-(--ink) text-6xl sm:text-7xl tracking-tight">404</h1>
      <h2 className="mt-4 font-serif text-xl font-bold text-(--ink-body)">
        {NOT_FOUND_TITLE}
      </h2>
      <p className="text-(--ink-muted) mt-2 text-sm">
        お探しのページは移動または削除された可能性があります。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/search" variant="secondary">記事を検索</ButtonLink>
        <ButtonLink href="/">
          <span>ホーム（資格一覧）へ</span>
          <Arrow />
        </ButtonLink>
      </div>
    </div>
  );
}
