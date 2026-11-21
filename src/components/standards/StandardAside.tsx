import type { ReactNode } from 'react';

/** 基準書の章・節ページの末尾の区画（上下の線と見出し）。関連テーマ・参照する基準が共用する */
export default function StandardAside({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <aside className="mt-8 border-y border-(--rule-soft) py-5" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-bold text-(--ink)">
        {title}
      </h2>
      {children}
    </aside>
  );
}
