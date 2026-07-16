import Link from 'next/link';

const TABS: [string, string][] = [
  ['/content/articles', 'サイト記事'],
  ['/content/note', 'note記事'],
  ['/content/magazines', 'マガジン'],
];

/** 記事系 3 ビュー（サイト/note/マガジン）の切替サブナビ。 */
export function ContentNav({ active }: { active: string }) {
  return (
    <div className="filterbar">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} className={'chip' + (href === active ? ' active' : '')}>
          {label}
        </Link>
      ))}
    </div>
  );
}
