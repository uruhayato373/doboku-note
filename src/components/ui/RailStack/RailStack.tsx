import type { ReactNode } from 'react';
import RailContinuation from '@/components/ui/RailContinuation/RailContinuation';
import type { RailGroup } from '@/lib/rail-continuation';
import { isRailAd, type RailKind } from '@/lib/rail-kinds';

/**
 * 右の欄（PC ≥993px）の中身の唯一の入れ物。記事・資格トップ・基準書の全ページが使う（2026-11-17 に 4 か所の手書きをまとめた）。
 * 上の束（items）を上詰めで並べ、その下に回遊と広告の組（groups・RailContinuation）を続ける。
 * 並べる 1 つ 1 つは種類（src/lib/rail-kinds.ts の台帳）を持ち、data-rail-kind を付けた div で包む。
 * 中身が空の部品（出す商品が無いなど）は包みごと畳む（globals.css の [data-rail-kind]:empty）。
 */
export type RailItem = { readonly kind: RailKind; readonly node: ReactNode };

type Data = Readonly<Record<`data-${string}`, string | number | boolean | undefined>>;

export default function RailStack({ items, groups = [], data, upperData, cardData }: {
  readonly items: readonly RailItem[];
  readonly groups?: RailGroup[];
  /** 欄全体（上の束＋組）に付ける属性。付けると組が無くても外の入れ物を出す */
  readonly data?: Data;
  /** 上の束に付ける属性（data-standards-sidebar など） */
  readonly upperData?: Data;
  /** 広告でない 1 つ 1 つに付ける属性（記事の右欄の data-article-sidebar-card） */
  readonly cardData?: Data;
}) {
  const upper = (
    <div className="flex flex-col gap-3" data-rail-stack {...upperData}>
      {items.filter((item) => item.node != null && item.node !== false).map((item, index) => (
        <div key={index} data-rail-kind={item.kind} {...(isRailAd(item.kind) ? {} : cardData)}>{item.node}</div>
      ))}
    </div>
  );
  if (groups.length === 0 && !data) return upper;
  return (
    <div className="flex h-full flex-1 flex-col" {...data}>
      {upper}
      <RailContinuation groups={groups} />
    </div>
  );
}
