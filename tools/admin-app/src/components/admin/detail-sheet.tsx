import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

/**
 * 表の行の詳細を右から開くシート（shadcn/ui の Sheet。dashboard-01 の「名前を押すと詳細が開く」形）。
 * 表には判断に要る値だけを置き、根拠・説明・メモ・ID などはここに入れる（記憶 feedback_admin_ui_for_humans）。
 * 前例は components/video-annual-plan.tsx。中身は DetailList と DetailText で組む。
 */
export function DetailSheet({ trigger, title, description, children }: { trigger: ReactNode; title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className="text-left underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          {trigger}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="pr-10">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6 text-sm">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/** シートの中の「項目名 → 値」の並び。値が空（null・undefined・空文字・空の配列）の項目は出さない */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  const shown = items.filter(({ value }) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0));
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
      {shown.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** シートの中の見出しつきの文章・箇条書き。items が空なら出さない */
export function DetailText({ title, items }: { title: string; items: (string | null | undefined)[] }) {
  const shown = items.filter((t): t is string => Boolean(t));
  if (!shown.length) return null;
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {shown.length === 1 ? (
        <p className="whitespace-pre-wrap leading-relaxed">{shown[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {shown.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
