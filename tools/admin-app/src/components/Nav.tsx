'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

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

/** 計画の層の件数（layout が server 側で todoBoard() から数えて渡す）。月間は [時期:] が今月を含むカード数。 */
export type TodoLayer = { id: string; label: string; count: number };

/** 領域とサイドバーの画面（layout が .claude/config/domains.json から渡す。ここに直書きしない）。 */
export type NavDomain = { id: string; label: string; nav: Tab[] };

/**
 * サイドバーの情報設計（2026-09-26）。グループ＝事業の領域、項目＝その領域の判断に使う画面だけ。
 * 名前・並び・画面の正本は domains.json（nav・navKinds・navRules）、考え方は docs/strategy/14_領域モデル.md。
 * チャネルや SNS はサイドバーの枝にせず画面内のタブにする。グループ名は領域の概要（/domains/<id>）へのリンク。
 * 動的に展開する枝（商品ラインナップ＝資格、教材一覧＝棚）だけ href で差し込み、計画の層（/todo?f=）には件数を付ける。
 */

function isTree(entry: NavEntry): entry is NavTree {
  return 'tabs' in entry;
}

/**
 * 現在パスと必要ならクエリに応じて active を付ける。別の項目がその下の階層にあるとき
 * （/metrics と /metrics/gsc など）は完全一致だけにする。
 */
function isActive(pathname: string, searchParams: URLSearchParams, tab: Tab, exact = false): boolean {
  const pathMatches = exact ? pathname === tab.match : pathname === tab.match || pathname.startsWith(tab.match + '/');
  if (!pathMatches) return false;
  if (!tab.query) return true;
  // 値が空文字のキーは「そのクエリが無いこと」（例: 商品ラインナップの一覧＝q なし）
  return Object.entries(tab.query).every(
    ([key, value]) => (value === '' ? !searchParams.get(key) : searchParams.get(key) === value),
  );
}

function NavLink({ tab, active, count }: { tab: Tab; active: boolean; count?: number }) {
  return (
    <Link href={tab.href} className={'tab' + (active ? ' active' : '')}>
      {tab.label}
      {count !== undefined ? <span className="n">{count}</span> : null}
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

export default function Nav({
  todoLayers = [],
  lineupQualifications = [],
  materials = [],
  domains = [],
}: {
  todoLayers?: TodoLayer[];
  /** 商品ラインナップの下に並べる資格（layout が product-lineup.json から渡す） */
  lineupQualifications?: { id: string; label: string }[];
  /** 教材一覧の下に棚ごとに並べる教材（layout が reference-sources.json から渡す） */
  materials?: { shelf: string; items: { id: string; label: string }[] }[];
  /** 領域の名前・並び・画面（layout が domains.json から渡す） */
  domains?: NavDomain[];
}) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  // 商品ラインナップは「一覧」と資格ごとの詳細（?q=<資格id>）を持つツリーにする
  const lineupTree: NavTree = {
    label: '商品ラインナップ',
    tabs: [
      { href: '/content/lineup', label: '一覧', match: '/content/lineup', query: { q: '' } },
      ...lineupQualifications.map((q) => ({
        href: `/content/lineup?q=${q.id}`,
        label: q.label,
        match: '/content/lineup',
        query: { q: q.id },
      })),
    ],
  };
  const materialTrees: NavTree[] = materials.map((m) => ({
    label: m.shelf,
    tabs: m.items.map((it) => ({
      href: `/materials?id=${encodeURIComponent(it.id)}`,
      label: it.label,
      match: '/materials',
      query: { id: it.id },
    })),
  }));

  // 計画の層（/todo?f=）には件数を付ける。件数は layout が todoBoard() から渡す（月間＝[時期:] が今月のカード）
  const layerCount = (t: Tab) =>
    t.match === '/todo' ? todoLayers.find((l) => l.id === (t.query?.f || 'backlog'))?.count : undefined;
  // 下の階層に別の項目がある項目は完全一致で active にする（/metrics と /metrics/gsc など）
  const allMatches = domains.flatMap((d) => d.nav.map((t) => t.match));
  const exactMatches = new Set(allMatches.filter((m) => allMatches.some((o) => o !== m && o.startsWith(m + '/'))));

  return (
    <nav className="app-nav" aria-label="管理画面">
      <Link className="brand" href="/metrics">
        doboku admin
      </Link>
      {domains.map((group) => (
        <Fragment key={group.id}>
          <Link className={'group' + (pathname === `/domains/${group.id}` ? ' active' : '')} href={`/domains/${group.id}`}>
            {group.label}
          </Link>
          {group.nav
            .flatMap((e): NavEntry[] => {
              if (isTree(e)) return [e];
              if (e.match === '/content/lineup') return [lineupTree];
              if (e.match === '/materials') return [e, ...materialTrees];
              return [e];
            })
            .map((entry) => {
            if (isTree(entry)) {
              return (
                <SectionTree
                  key={entry.label}
                  tree={entry}
                  pathname={pathname}
                />
              );
            }
            return (
              <NavLink
                key={entry.href}
                tab={entry}
                active={isActive(pathname, searchParams, entry, exactMatches.has(entry.match))}
                count={layerCount(entry)}
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
