'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

type Tab = {
  href: string;
  label: string;
  match: string;
  /** 同じ項目を現在地とみなす別の画面（画面内タブで行き来する URL。例: 検索 ＝ /metrics/gsc・/metrics/seo-watch ほか） */
  matchAlso?: readonly string[];
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
  const hit = (m: string) => (exact ? pathname === m : pathname === m || pathname.startsWith(m + '/'));
  const pathMatches = [tab.match, ...(tab.matchAlso ?? [])].some(hit);
  if (!pathMatches) return false;
  if (!tab.query) return true;
  // 値が空文字のキーは「そのクエリが無いこと」（例: 商品ラインナップの一覧＝q なし）
  return Object.entries(tab.query).every(
    ([key, value]) => (value === '' ? !searchParams.get(key) : searchParams.get(key) === value),
  );
}

function NavLink({ tab, active, count }: { tab: Tab; active: boolean; count?: number }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link href={tab.href}>
          {tab.label}
          {count !== undefined ? <SidebarMenuBadge>{count}</SidebarMenuBadge> : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** 媒体など、複数の行き先を持つ第二階層。現在地の親だけ自動で開く。 */
function SectionTree({ tree, pathname }: { tree: NavTree; pathname: string }) {
  const searchParams = useSearchParams();
  const active = tree.tabs.some((tab) => isActive(pathname, searchParams, tab));

  return (
    <SidebarMenuItem>
      <details className="group/tree" open={active}>
        <SidebarMenuButton asChild isActive={active}>
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-60 transition-transform group-open/tree:rotate-90" />
            {tree.label}
          </summary>
        </SidebarMenuButton>
        <SidebarMenuSub>
          {tree.tabs.map((tab) => (
            <SidebarMenuSubItem key={tab.href}>
              <SidebarMenuSubButton asChild isActive={isActive(pathname, searchParams, tab)}>
                <Link href={tab.href}>{tab.label}</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </details>
    </SidebarMenuItem>
  );
}

type NavProps = {
  todoLayers?: TodoLayer[];
  /** コンテンツ台帳の下に並べる「資格・テーマ別」「チャネル別」の枝（layout が lib/ledger.ts から渡す・DN-0438） */
  ledger?: { themes: { id: string; label: string }[]; channels: { id: string; label: string }[] };
  /** 商品設計の下に並べる資格（layout が lib/product-design.ts から渡す・note 商品のある資格だけ） */
  design?: { id: string; label: string }[];
  /** 教材一覧の下に棚ごとに並べる教材（layout が reference-sources.json から渡す） */
  materials?: { shelf: string; items: { id: string; label: string }[] }[];
  /** 領域の名前・並び・画面（layout が domains.json から渡す） */
  domains?: NavDomain[];
};

/** 領域ごとのメニュー。useSearchParams を使うので Nav が Suspense で包む。 */
function NavGroups({ todoLayers = [], ledger = { themes: [], channels: [] }, design = [], materials = [], domains = [] }: NavProps) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  // スマホ幅の Sheet は画面を移ったら閉じる（公式 Sidebar は開閉を利用側に任せる）。
  // このメニューは Sheet が開いたときに初めて描かれるので、描いた時点の URL からの変化だけを見る
  const { setOpenMobile } = useSidebar();
  const url = `${pathname}?${searchParams.toString()}`;
  const shownAt = useRef(url);
  useEffect(() => {
    if (shownAt.current === url) return;
    shownAt.current = url;
    setOpenMobile(false);
  }, [url, setOpenMobile]);
  // コンテンツ台帳の行き先を 2 つの入口に分ける（DN-0438）。どちらも同じ /content/ledger の絞り込み。
  // 枝の中身（テーマ・チャネルと件数）は台帳のデータから来るので、ここに資格名・チャネル名を直書きしない
  const themeTree: NavTree = {
    label: '資格・テーマ別',
    tabs: ledger.themes.map((t) => ({
      href: `/content/ledger?t=${encodeURIComponent(t.id)}`,
      label: t.label,
      match: '/content/ledger',
      query: { t: t.id, c: '' },
    })),
  };
  const byChannelTree: NavTree = {
    label: 'チャネル別',
    tabs: ledger.channels.map((c) => ({
      href: `/content/ledger?c=${encodeURIComponent(c.id)}`,
      label: c.label,
      match: '/content/ledger',
      query: { c: c.id, t: '' },
    })),
  };
  // レビューは週次・月次を別ページにし、折りたたみの枝で選ぶ（domains.json の項目はそのまま・href は旧 URL で両方へ転送する）
  const reviewTree = (label: string): NavTree => ({
    label,
    tabs: [
      { href: '/metrics/business/weekly', label: '週次', match: '/metrics/business/weekly' },
      { href: '/metrics/business/monthly', label: '月次', match: '/metrics/business/monthly' },
    ],
  });
  // 商品設計は資格ごとの枝で開く（domains.json の項目はそのまま・各資格のページは /product/design?q=<資格>）
  const designTree = (label: string): NavTree => ({
    label,
    tabs: design.map((d) => ({
      href: `/product/design?q=${encodeURIComponent(d.id)}`,
      label: d.label,
      match: '/product/design',
      query: { q: d.id },
    })),
  });
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
    <>
      {domains.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel asChild data-active={pathname === `/domains/${group.id}`}>
            <Link href={`/domains/${group.id}`}>{group.label}</Link>
          </SidebarGroupLabel>
          <SidebarMenu>
            {group.nav
              .flatMap((e): NavEntry[] => {
                if (isTree(e)) return [e];
                if (e.match === '/content/ledger') return [e, themeTree, byChannelTree];
                if (e.match === '/materials') return [e, ...materialTrees];
                if (e.match === '/metrics/business') return [reviewTree(e.label)];
                if (e.match === '/product/design') return [designTree(e.label)];
                return [e];
              })
              .map((entry) =>
                isTree(entry) ? (
                  <SectionTree key={entry.label} tree={entry} pathname={pathname} />
                ) : (
                  <NavLink
                    key={entry.href}
                    tab={entry}
                    active={isActive(pathname, searchParams, entry, exactMatches.has(entry.match))}
                    count={layerCount(entry)}
                  />
                ),
              )}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

/**
 * 公式 Sidebar の外枠は Suspense の外で描く。中に入れると、遅れて hydrate する間に SidebarProvider の
 * useIsMobile が確定し、サーバー（デスクトップ用の枠）と画面側（スマホ用の Sheet）が食い違う。
 */
export default function Nav(props: NavProps) {
  return (
    <Sidebar aria-label="管理画面">
      <SidebarHeader className="max-md:hidden">
        <Link className="px-2.5 text-[15px] font-bold tracking-wide text-sidebar-foreground no-underline hover:no-underline" href="/metrics">
          doboku admin
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <Suspense fallback={null}>
          <NavGroups {...props} />
        </Suspense>
      </SidebarContent>
    </Sidebar>
  );
}
