import { compileMDX } from 'next-mdx-remote/rsc';
import { MDXProvider } from '@mdx-js/react';
import type React from 'react';

/**
 * MDX を 1 回だけコンパイルし、失敗してもページ全体を落とさない共通レンダラー。
 *
 * docs 記事（DocPage）と基準類の章記事（standards chapters）が共有する。プラグイン構成は
 * 呼び出し側が `options` で渡す——docs は KaTeX・見出し ID・中間 CTA を積む一方、章記事は
 * remark-gfm だけで足りる。**katex.min.css は render-blocking なので、必要なページの
 * モジュールでだけ import する**（2026-04-26 の LCP 改善で docs 側へ局所化した経緯があり、
 * ここへ引き上げると全ページへ戻ってしまう）。
 */
export default async function SafeMdx({
  source,
  components,
  options,
}: {
  source: string;
  components: React.ComponentProps<typeof MDXProvider>['components'];
  options: NonNullable<Parameters<typeof compileMDX>[0]['options']>;
}) {
  let content: React.ReactElement;
  try {
    ({ content } = await compileMDX({ source, options, components }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MDX compile error:', message.slice(0, 200));
    return (
      <div className="rounded-card-content border border-[var(--color-warn)] bg-[var(--color-warn-fill)] p-4">
        <p className="text-[var(--color-warn)] font-semibold">
          このページのコンテンツにフォーマットエラーがあります。
        </p>
        <p className="text-[var(--color-warn)] text-sm mt-1">
          管理者に報告してください。
        </p>
      </div>
    );
  }
  return <>{content}</>;
}
