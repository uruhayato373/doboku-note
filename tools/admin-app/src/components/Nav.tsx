'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { enabledChannels, type AdminChannelId, type AdminChannelTab } from '../lib/channel-registry';

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

/** チャネル（channel-registry.ts が唯一の SSOT）を領域グループへ置く。無効なチャネルは出さない。 */
const channelTrees = (ids: readonly AdminChannelId[]): NavTree[] =>
  ids
    .map((id) => enabledChannels().find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ label: c.label, tabs: toNavTabs(c.tabs) }));

/**
 * サイドバーの情報設計（2026-09-26: 作業の種類ではなく領域でまとめる）。
 *
 * - 戦略: 全体の数字と方針、資格一覧（展開中・候補・見送りと日程・受験者数）
 * - 教材: 教材一覧と、棚（shelf）ごとの各教材ページ（論点を本文・図解・SNS・商品へどう展開したか・するか）
 * - 商品: 商品ラインナップ → 販売チャネル（note/ココナラ/Kindle）→ 売上
 * - サイト: 無料記事と、その集客の計測（検索順位・GSC・GA4・PSI）
 * - SNS: 投稿状況・各 SNS・動画成果・キャラクター素材
 * - 計画: スケジュール（試験・商品・SNS・開発をまたぐ時間軸）とバックログ〜年間
 * - 管理: 文書・品質・エージェント類と、チャネル横断の点検（ライフサイクル・すべて）
 *
 * URL は変えない（入口の並べ方だけを変える）。
 */
const GROUPS: { title: string; entries: NavEntry[] }[] = [
  {
    title: '戦略',
    entries: [
      { href: '/metrics', label: '分析概観', match: '/metrics' },
      { href: '/strategy/policy', label: '共通方針', match: '/strategy/policy' },
      { href: '/metrics/business', label: '事業方針と改善', match: '/metrics/business' },
      { href: '/strategy/qualifications', label: '資格一覧', match: '/strategy/qualifications' },
    ],
  },
  {
    title: '教材',
    entries: [
      { href: '/materials', label: '教材一覧', match: '/materials', query: { id: '' } },
    ],
  },
  {
    title: '商品',
    entries: [
      { href: '/content/lineup', label: '商品ラインナップ', match: '/content/lineup' },
      ...channelTrees(['note', 'coconala', 'kindle']),
      { href: '/sales', label: '売上', match: '/sales' },
      { href: '/affiliate', label: 'アフィリエイト', match: '/affiliate' },
    ],
  },
  {
    title: 'サイト',
    entries: [
      ...channelTrees(['site']),
      { href: '/metrics/seo-watch', label: '検索順位の改善', match: '/metrics/seo-watch' },
      { href: '/metrics/gsc', label: '検索（GSC）', match: '/metrics/gsc' },
      { href: '/metrics/ga4', label: 'アクセス（GA4）', match: '/metrics/ga4' },
      { href: '/metrics/psi', label: '表示速度（PSI）', match: '/metrics/psi' },
    ],
  },
  {
    title: 'SNS',
    entries: [
      { href: '/sns', label: '投稿状況', match: '/sns' },
      ...channelTrees(['x', 'instagram', 'youtube']),
      { href: '/metrics/video', label: '動画成果', match: '/metrics/video' },
      { href: '/gallery/characters', label: 'キャラクター素材', match: '/gallery/characters' },
    ],
  },
  {
    title: '計画',
    entries: [
      { href: '/schedule', label: 'スケジュール', match: '/schedule' },
      { href: '/todo', label: 'バックログ', match: '/todo' },
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
      { href: '/content/lifecycle', label: 'ライフサイクル', match: '/content/lifecycle' },
      { href: '/content', label: 'すべて', match: '/content' },
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
  // 値が空文字のキーは「そのクエリが無いこと」（例: 商品ラインナップの一覧＝q なし）
  return Object.entries(tab.query).every(
    ([key, value]) => (value === '' ? !searchParams.get(key) : searchParams.get(key) === value),
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

export default function Nav({
  todoLayers = [],
  lineupQualifications = [],
  materials = [],
}: {
  todoLayers?: TodoLayer[];
  /** 商品ラインナップの下に並べる資格（layout が product-lineup.json から渡す） */
  lineupQualifications?: { id: string; label: string }[];
  /** 教材一覧の下に棚ごとに並べる教材（layout が reference-sources.json から渡す） */
  materials?: { shelf: string; items: { id: string; label: string }[] }[];
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

  return (
    <nav className="app-nav" aria-label="管理画面">
      <Link className="brand" href="/metrics">
        doboku admin<small>local · :3021</small>
      </Link>
      {GROUPS.map((group) => (
        <Fragment key={group.title}>
          <span className="group">{group.title}</span>
          {group.entries
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
