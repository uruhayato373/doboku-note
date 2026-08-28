'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { enabledChannels, type AdminChannelTab } from '../lib/channel-registry';

type Tab = {
  href: string;
  label: string;
  match: string;
  query?: Readonly<Record<string, string>>;
};

type NavTree = {
  label: string;
  tabs: Tab[];
};

type NavEntry = Tab | NavTree;

/** TODO の 4 層（layout が server 側で数えて渡す）。件数の真実源は backlog-lib の TODO_LAYER_FILES。 */
export type TodoLayer = { id: string; label: string; count: number };

/** channel-registry.ts の tabs をそのまま NavTree.tabs へ写す（label/route の再複製をしない）。 */
const toNavTabs = (tabs: readonly AdminChannelTab[]): Tab[] => tabs.map((t) => ({ ...t }));

/**
 * サイドバーの情報設計。
 *
 * - コンテンツ: チャネル（サイト/note/X/Instagram/YouTube/ココナラ/Kindle/Brain）を
 *   選んでから、記事・画像・配布物へ進む。チャネル定義は channel-registry.ts が唯一の SSOT。
 * - 計画: バックログから年間まで、時間軸で作業を選ぶ
 * - 運用 / 分析 / 収益 / 管理: 媒体をまたぐ共通作業としてまとめる
 *
 * 保存場所やルートは変えず、日常の「何をするか」に合わせて入口だけを整理する。
 */
const GROUPS: { title: string; entries: NavEntry[] }[] = [
  {
    title: 'コンテンツ',
    entries: [
      { href: '/content', label: 'すべて', match: '/content' },
      { href: '/content/lifecycle', label: 'ライフサイクル', match: '/content/lifecycle' },
      ...enabledChannels().map((c) => ({
        label: c.label,
        tabs: toNavTabs(c.tabs),
      })),
    ],
  },
  {
    title: '計画',
    entries: [{ href: '/todo', label: 'バックログ', match: '/todo' }],
  },
  {
    title: '運用',
    entries: [
      { href: '/sns', label: '投稿状況', match: '/sns' },
      { href: '/schedule', label: 'スケジュール', match: '/schedule' },
    ],
  },
  {
    title: '分析',
    entries: [
      { href: '/metrics', label: '分析概観', match: '/metrics' },
      { href: '/metrics/ga4', label: 'アクセス（GA4）', match: '/metrics/ga4' },
      { href: '/metrics/gsc', label: '検索（GSC）', match: '/metrics/gsc' },
      { href: '/metrics/psi', label: '表示速度（PSI）', match: '/metrics/psi' },
    ],
  },
  {
    title: '収益',
    entries: [
      { href: '/sales', label: '売上', match: '/sales' },
      { href: '/affiliate', label: 'アフィリエイト', match: '/affiliate' },
    ],
  },
  {
    title: '管理',
    entries: [
      { href: '/docs', label: '方針・設計', match: '/docs' },
      { href: '/plans', label: '実装計画', match: '/plans' },
      { href: '/quality', label: '品質概観', match: '/quality' },
      { href: '/knowledge', label: 'ナレッジ', match: '/knowledge' },
      { href: '/agents', label: 'エージェント', match: '/agents' },
      { href: '/skills', label: 'スキル', match: '/skills' },
    ],
  },
];

function isTree(entry: NavEntry): entry is NavTree {
  return 'tabs' in entry;
}

/** 現在パスと必要ならクエリに応じて active を付ける。/metrics はサブページと排他。 */
function isActive(
  pathname: string,
  searchParams: URLSearchParams,
  tab: Tab,
): boolean {
  const pathMatches =
    tab.match === '/metrics' || tab.match === '/content'
      ? pathname === tab.match
      : pathname === tab.match || pathname.startsWith(tab.match + '/');

  if (!pathMatches) return false;
  if (!tab.query) return true;
  return Object.entries(tab.query).every(
    ([key, value]) => searchParams.get(key) === value,
  );
}

function NavLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link href={tab.href} className={'tab' + (active ? ' active' : '')}>
      {tab.label}
    </Link>
  );
}

/** 媒体など、複数の行き先を持つ第二階層。現在地の親だけ自動で開く。 */
function SectionTree({ tree, pathname }: { tree: NavTree; pathname: string }) {
  const searchParams = useSearchParams();
  const active = tree.tabs.some((tab) => isActive(pathname, searchParams, tab));

  return (
    <details className="nav-tree" open={active}>
      <summary className={'tab' + (active ? ' active' : '')}>
        <span className="chev" aria-hidden="true" />
        {tree.label}
      </summary>
      <div className="nav-sub">
        {tree.tabs.map((tab) => (
          <NavLink
            key={tab.href}
            tab={tab}
            active={isActive(pathname, searchParams, tab)}
          />
        ))}
      </div>
    </details>
  );
}

/**
 * TODO の 4 層を「計画」グループ直下に出す。
 * 層は「行き先」、優先度・種類は本文側の絞り込みとして役割を分ける。
 */
function TodoLinks({
  layers,
  pathname,
}: {
  layers: TodoLayer[];
  pathname: string;
}) {
  const searchParams = useSearchParams();
  const onTodo = pathname === '/todo' || pathname.startsWith('/todo/');
  const current = layers.some((layer) => layer.id === searchParams.get('f'))
    ? searchParams.get('f')
    : 'backlog';

  return (
    <>
      {layers.map((layer) => (
        <Link
          key={layer.id}
          href={layer.id === 'backlog' ? '/todo' : `/todo?f=${layer.id}`}
          className={'tab' + (onTodo && current === layer.id ? ' active' : '')}
        >
          {layer.label}
          <span className="n">{layer.count}</span>
        </Link>
      ))}
    </>
  );
}

export default function Nav({ todoLayers = [] }: { todoLayers?: TodoLayer[] }) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();

  return (
    <nav className="app-nav" aria-label="管理画面">
      <Link className="brand" href="/metrics">
        doboku admin<small>local · :3021</small>
      </Link>
      {GROUPS.map((group) => (
        <Fragment key={group.title}>
          <span className="group">{group.title}</span>
          {group.entries.map((entry) => {
            if (isTree(entry)) {
              return (
                <SectionTree
                  key={entry.label}
                  tree={entry}
                  pathname={pathname}
                />
              );
            }
            if (entry.match === '/todo' && todoLayers.length) {
              return (
                <TodoLinks
                  key={entry.href}
                  layers={todoLayers}
                  pathname={pathname}
                />
              );
            }
            return (
              <NavLink
                key={entry.href}
                tab={entry}
                active={isActive(pathname, searchParams, entry)}
              />
            );
          })}
        </Fragment>
      ))}
      <span className="spacer" />
      <ThemeToggle />
    </nav>
  );
}
