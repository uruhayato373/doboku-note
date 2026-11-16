'use client';

import { useState } from 'react';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import ArticleCard from '@/components/ui/ArticleCard/ArticleCard';
import Disclosure from '@/components/ui/Disclosure/Disclosure';
import type { CardImage } from '@/lib/site-thumbnail';

export type TopicArea = 'exam' | 'practice' | 'standards' | 'laws';
export type TopicArticle = { href: string; title: string; description: string; category: string; categoryLabel: string; categoryOrder: number; area: TopicArea; kind: string; image: CardImage; subgroup?: string | undefined };

// 一覧は 領域（資格試験／施工実務／公的基準）→ 資格・カテゴリ の順に区切る（05_情報アーキテクチャ.md の三方向）
const AREAS: TopicArea[] = ['laws', 'exam', 'practice', 'standards'];

// 資格の中の小分け（総監のキーワード集の節など）。小分けの無い記事は最後にまとめる
function bySubgroup(rows: TopicArticle[]): [string, TopicArticle[]][] {
  if (!rows.some(a => a.subgroup)) return [['', rows]];
  const groups = new Map<string, TopicArticle[]>();
  for (const a of rows) groups.set(a.subgroup ?? '', [...(groups.get(a.subgroup ?? '') ?? []), a]);
  return [...groups].sort(([a], [b]) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b, 'ja', { numeric: true }));
}

export default function TopicArticles({ articles, areaLabels, featured: entry = [] }: { articles: TopicArticle[]; areaLabels: Record<TopicArea, string>; featured?: string[] }) {
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const categories = [...new Map([...articles].sort((a,b) => a.categoryOrder - b.categoryOrder).map(a => [a.category, a.categoryLabel])).entries()];
  const areaOf = new Map(articles.map(a => [a.category, a.area]));
  const kinds = [...new Set(articles.map(a => a.kind))];
  const match = (a: TopicArticle) => (!category || a.category === category) && (!kind || a.kind === kind) && `${a.title} ${a.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const filtered = !!(category || kind || query.trim());
  // 入口は topics.json の featured（編集で選んだ記事）。無いテーマはガイド・実務を優先し、同点は元の更新順を維持。
  const featured = new Set(entry.length ? entry.slice(0,3) : [...articles].sort((a,b) => Number(!['受験ガイド','実務'].includes(a.kind)) - Number(!['受験ガイド','実務'].includes(b.kind))).slice(0,3).map(a=>a.href));
  const count = articles.filter(match).length;
  const control = 'focus-ring min-h-11 rounded-card-inline border border-(--rule-soft) bg-(--paper) px-3 py-2 text-sm text-(--ink)';
  return <div>
    <div className="mb-3 flex flex-wrap items-start gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">記事を絞り込む</span><input type="search" className={`${control} w-full`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="記事名・内容で検索" /></label>
      <Disclosure radius="inline" className="open:w-full" summaryClassName="text-sm text-(--ink)" summary="絞り込み">
        <div className="grid gap-3 border-t border-(--rule-soft) p-3 sm:grid-cols-2">
          <label className="text-sm text-(--ink)">資格・領域<select className={`${control} mt-1 w-full`} value={category} onChange={e=>setCategory(e.target.value)}><option value="">すべて</option>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm text-(--ink)">記事の種類<select className={`${control} mt-1 w-full`} value={kind} onChange={e=>setKind(e.target.value)}><option value="">すべて</option>{kinds.map(value=><option key={value}>{value}</option>)}</select></label>
        </div>
      </Disclosure>
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--ink-muted)"><p role="status">{count}件</p>{category && <span>{categories.find(([value])=>value===category)?.[1]}</span>}{kind && <span>{kind}</span>}{filtered && <button className="focus-ring min-h-11 text-(--accent) underline" onClick={()=>{setCategory('');setKind('');setQuery('');}}>絞り込みを解除</button>}</div>
    {!filtered && <h3 className="mb-3 text-lg font-bold text-(--ink)">はじめに読む</h3>}
    {/* 初期HTMLには全リンクを保持。JSがなくても分類ごとに開いて閲覧できる。 */}
    {!filtered && <ul className="mb-6 grid gap-4 sm:grid-cols-3">
      {articles.filter(a=>featured.has(a.href)).map(a=><li key={a.href}>
        <ArticleCard href={a.href} title={a.title} description={a.description} image={a.image} eyebrow={`${a.categoryLabel} · ${a.kind}`} />
      </li>)}
    </ul>}
    {count === 0 && <p className="py-6 text-(--ink)">条件に合う記事がありません。絞り込みを解除してお探しください。</p>}
    <div className="space-y-8">
      {AREAS.map(area=>{
        const cats = categories.filter(([value])=>areaOf.get(value)===area);
        const rowsOf = (value: string) => articles.filter(a=>a.category===value && (filtered || !featured.has(a.href)));
        const areaCount = articles.filter(a=>a.area===area && match(a)).length;
        const rowCount = cats.reduce((n,[value])=>n + rowsOf(value).filter(match).length, 0);
        if (!cats.length) return null;
        return <section key={area} id={`area-${area}`} hidden={!rowCount} aria-labelledby={`area-${area}-heading`} className="scroll-mt-24">
          <h3 id={`area-${area}-heading`} className="mb-3 text-lg font-bold text-(--ink)">{areaLabels[area]} <span className="text-sm font-normal text-(--ink-muted)">{areaCount}件</span></h3>
          <div className="space-y-3">
            {cats.map(([value,label])=>{
              const rows = rowsOf(value);
              const matches = rows.filter(match);
              return <Disclosure key={`${value}-${filtered}`} open={filtered} hidden={!matches.length} summaryClassName="font-bold text-(--ink)" summary={<><h4 className="inline">{label}</h4> <span className="text-sm font-normal text-(--ink-muted)">{matches.length}件</span></>}>
                {bySubgroup(rows).map(([subgroup, items])=><div key={subgroup || '-'}>
                  {subgroup && <p hidden={!items.some(match)} className="border-t border-(--rule-soft) px-4 pt-4 text-sm font-bold text-(--ink-muted)">{subgroup}（{items.filter(match).length}件）</p>}
                  <LinkRowList className="px-4">{items.map(a=><LinkRow key={a.href} href={a.href} eyebrow={a.kind} title={a.title} headingLevel="h5" description={a.description} tone="ink" hidden={!match(a)} />)}</LinkRowList>
                </div>)}
              </Disclosure>;
            })}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
