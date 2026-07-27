'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: { href: string; label: string; match: string }[] = [
  { href: '/metrics', label: '計測概観', match: '/metrics' },
  { href: '/metrics/ga4', label: 'GA4', match: '/metrics/ga4' },
  { href: '/metrics/gsc', label: 'GSC', match: '/metrics/gsc' },
  { href: '/metrics/psi', label: 'PSI', match: '/metrics/psi' },
  { href: '/agents', label: 'エージェント', match: '/agents' },
  { href: '/skills', label: 'スキル', match: '/skills' },
  { href: '/knowledge', label: 'ナレッジ', match: '/knowledge' },
  { href: '/gallery/ogp', label: 'OGP', match: '/gallery/ogp' },
  { href: '/gallery/figures', label: '記事図版', match: '/gallery/figures' },
  { href: '/gallery/note', label: 'note画像', match: '/gallery/note' },
  { href: '/gallery/sns', label: 'SNS画像', match: '/gallery/sns' },
  { href: '/sns', label: 'SNS状態', match: '/sns' },
  { href: '/content/articles', label: '記事', match: '/content' },
  { href: '/sales', label: '売上', match: '/sales' },
  { href: '/affiliate', label: 'アフィリ', match: '/affiliate' },
  { href: '/quality', label: '品質', match: '/quality' },
  { href: '/jobs', label: 'ジョブ', match: '/jobs' },
  { href: '/todo', label: 'TODO', match: '/todo' },
];

/** 現在パスに応じて active を付ける。/metrics は完全一致（サブページと排他）。 */
function isActive(pathname: string, match: string): boolean {
  if (match === '/metrics') return pathname === '/metrics';
  return pathname === match || pathname.startsWith(match + '/');
}

export default function Nav() {
  const pathname = usePathname() ?? '';
  return (
    <nav className="app-nav">
      <span className="brand">
        doboku admin<small>local · :3021</small>
      </span>
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={'tab' + (isActive(pathname, t.match) ? ' active' : '')}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
