import Link from 'next/link';

// 年度別過去問の問題番号のボタンと、次の行き先（前後の年度・演習アプリ）。冒頭の目次（QuestionJumpNav）と
// 上端の追従バー（QuestionStickyBar）が同じものを出す（同じ並びを 2 か所で書かない）。hook を使わないので server でも client でも描ける。

export interface QuestionChipItem {
  readonly id: string;
  readonly label: string;
  readonly group?: number | undefined;
}

interface QuestionJumpLink {
  readonly href: string;
  readonly label: string;
}

export interface QuestionNextLinks {
  readonly older?: QuestionJumpLink | null | undefined;
  readonly newer?: QuestionJumpLink | null | undefined;
  readonly quiz?: QuestionJumpLink | null | undefined;
}

/** 技術士第一次 基礎科目の群（試験の出題区分。Ⅰ-群-番号 の見出しのときだけ使う） */
const BASIC_GROUPS: Readonly<Record<number, string>> = {
  1: '設計・計画',
  2: '情報・論理',
  3: '解析',
  4: '材料・化学・バイオ',
  5: '環境・エネルギー・技術',
};

const CHIP =
  'focus-ring inline-flex h-11 min-w-11 items-center justify-center rounded-card-inline border border-(--rule-soft) px-2 font-mono text-[13px] tabular-nums text-(--ink-body) transition-colors hover:border-(--accent) hover:bg-(--accent-fill) hover:text-(--accent) dark:border-(--rule-soft)';
const CHIP_CURRENT = 'border-(--accent) bg-(--accent-fill) text-(--accent) dark:border-(--accent)';
const NEXT_LINK =
  'focus-ring inline-flex min-h-11 items-center rounded-card-inline border border-(--rule-soft) px-3 text-[13px] text-brand transition-colors hover:border-brand dark:border-(--rule-soft)';

export function isGrouped(items: readonly QuestionChipItem[]): boolean {
  return items.length > 0 && items.every((it) => it.group !== undefined);
}

/** 問題番号のボタン。群つきは群ごとに 1 行（群の名前を行の先頭に置いて詰める） */
export function QuestionChipList({ items, currentId, onPick }: {
  items: readonly QuestionChipItem[];
  currentId?: string | null | undefined;
  onPick?: (() => void) | undefined;
}) {
  const chip = (it: QuestionChipItem) => (
    <li key={it.id}>
      <a
        href={`#${it.id}`}
        aria-label={`問題 ${it.label} へ移動`}
        aria-current={it.id === currentId ? 'location' : undefined}
        onClick={onPick}
        className={`${CHIP}${it.id === currentId ? ` ${CHIP_CURRENT}` : ''}`}
      >
        {it.label}
      </a>
    </li>
  );
  if (!isGrouped(items)) return <ol className="flex flex-wrap gap-1.5">{items.map(chip)}</ol>;
  const groups = [...new Set(items.map((it) => it.group!))];
  return (
    <div className="space-y-1.5">
      {groups.map((g) => (
        <ol key={g} className="flex flex-wrap items-center gap-1.5">
          <li className="w-full text-[12px] text-(--ink-muted) sm:w-44 sm:shrink-0">
            {g}群{BASIC_GROUPS[g] ? ` ${BASIC_GROUPS[g]}` : ''}
          </li>
          {items.filter((it) => it.group === g).map(chip)}
        </ol>
      ))}
    </div>
  );
}

/** 前後の年度と演習アプリ。どれも無ければ何も出さない */
export function QuestionNextLinkRow({ older, newer, quiz, onPick, labelPrefix }: QuestionNextLinks & {
  onPick?: (() => void) | undefined;
  /** 計測のラベルの頭（冒頭の目次は question-jump・追従バーは question-bar） */
  labelPrefix: string;
}) {
  if (!older && !newer && !quiz) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {older && (
        <Link href={older.href} {...(onPick ? { onClick: onPick } : {})} data-cta-label={`${labelPrefix}-older`} className={NEXT_LINK}>
          <span aria-hidden="true" className="mr-1">←</span>
          {older.label}
        </Link>
      )}
      {newer && (
        <Link href={newer.href} {...(onPick ? { onClick: onPick } : {})} data-cta-label={`${labelPrefix}-newer`} className={NEXT_LINK}>
          {newer.label}
          <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      )}
      {quiz && (
        <Link href={quiz.href} {...(onPick ? { onClick: onPick } : {})} data-cta-label={`${labelPrefix}-quiz`} className={`${NEXT_LINK} font-bold`}>
          {quiz.label}
          <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      )}
    </div>
  );
}
