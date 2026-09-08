'use client';

import { useState } from 'react';
import Link from 'next/link';
import ContentThumbnail from '@/components/ui/ContentThumbnail';
import DisclosureChevron from '@/components/ui/DisclosureChevron';

export type TopicArticle = { href: string; title: string; description: string; category: string; categoryLabel: string; kind: string; image: string };

export default function TopicArticles({ articles }: { articles: TopicArticle[] }) {
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const categories = [...new Map(articles.map(a => [a.category, a.categoryLabel])).entries()];
  const kinds = [...new Set(articles.map(a => a.kind))];
  const match = (a: TopicArticle) => (!category || a.category === category) && (!kind || a.kind === kind) && `${a.title} ${a.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const filtered = !!(category || kind || query.trim());
  // 入口はガイド・実務を優先。同点は元の更新順を維持。
  const featured = new Set([...articles].sort((a,b) => Number(!['受験ガイド','実務'].includes(a.kind)) - Number(!['受験ガイド','実務'].includes(b.kind))).slice(0,3).map(a=>a.href));
  const count = articles.filter(match).length;
  const control = 'focus-ring min-h-11 rounded-card-inline border border-[var(--rule-soft)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]';
  return <div>
    <div className="mb-3 flex flex-wrap items-start gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">記事を絞り込む</span><input type="search" className={`${control} w-full`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="記事名・内容で検索" /></label>
      <details className="group rounded-card-inline border border-[var(--rule-soft)] bg-[var(--paper)] open:w-full">
        <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm text-[var(--ink)]">絞り込み<DisclosureChevron /></summary>
        <div className="grid gap-3 border-t border-[var(--rule-soft)] p-3 sm:grid-cols-2">
          <label className="text-sm text-[var(--ink)]">資格・領域<select className={`${control} mt-1 w-full`} value={category} onChange={e=>setCategory(e.target.value)}><option value="">すべて</option>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm text-[var(--ink)]">記事の種類<select className={`${control} mt-1 w-full`} value={kind} onChange={e=>setKind(e.target.value)}><option value="">すべて</option>{kinds.map(value=><option key={value}>{value}</option>)}</select></label>
        </div>
      </details>
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-muted)]"><p role="status">{count}件</p>{category && <span>{categories.find(([value])=>value===category)?.[1]}</span>}{kind && <span>{kind}</span>}{filtered && <button className="focus-ring min-h-11 text-[var(--accent)] underline" onClick={()=>{setCategory('');setKind('');setQuery('');}}>絞り込みを解除</button>}</div>
    {!filtered && <h3 className="mb-3 text-lg font-bold text-[var(--ink)]">はじめに読む</h3>}
    {/* 初期HTMLには全リンクを保持。JSがなくても分類ごとに開いて閲覧できる。 */}
    {!filtered && <ul className="mb-6 grid gap-4 sm:grid-cols-3">
      {articles.filter(a=>featured.has(a.href)).map(a=><li key={a.href}>
        <Link href={a.href} className="focus-ring block h-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] overflow-hidden">
          <div className="aspect-[1200/630]"><ContentThumbnail src={a.image} sizes="(max-width: 640px) 100vw, 320px" /></div>
          <div className="p-4"><p className="text-xs text-[var(--ink-muted)]">{a.categoryLabel} · {a.kind}</p><h4 className="mt-2 font-bold text-[var(--ink)]">{a.title}</h4><p className="mt-2 line-clamp-2 text-sm text-[var(--ink-muted)]">{a.description}</p></div>
        </Link>
      </li>)}
    </ul>}
    {count === 0 && <p className="py-6 text-[var(--ink)]">条件に合う記事がありません。絞り込みを解除してお探しください。</p>}
    <div className="space-y-3">
      {categories.map(([value,label])=>{
        const rows = articles.filter(a=>a.category===value && (filtered || !featured.has(a.href)));
        const matches = rows.filter(match);
        return <details key={`${value}-${filtered}`} open={filtered} hidden={!matches.length} className="rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)]">
          <summary className="focus-ring cursor-pointer px-4 py-4 font-bold text-[var(--ink)]"><h3 className="inline">{label}</h3> <span className="text-sm font-normal text-[var(--ink-muted)]">{matches.length}件</span></summary>
          <ul className="px-4">{rows.map(a=><li key={a.href} hidden={!match(a)} className="border-t border-[var(--rule-soft)]"><Link className="focus-ring block py-4 hover:text-[var(--accent)]" href={a.href}><span className="text-xs text-[var(--ink-muted)]">{a.kind}</span><h4 className="mt-1 font-bold text-[var(--ink)]">{a.title}</h4><p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">{a.description}</p></Link></li>)}</ul>
        </details>;
      })}
    </div>
  </div>;
}
