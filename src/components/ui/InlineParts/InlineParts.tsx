/**
 * `inlineParts` で分けた文とリンクの並びを描画する。旧 /docs/{slug} は正規 URL へ置き換え、
 * 外部リンクだけ別タブで開く。
 */

import type { InlinePart } from '@/lib/inline-links';
import { getPublicDocPath } from '@/lib/content-routes';

// 旧 /docs/{slug} は本文と同じく正規 URL へ置き換える（転送を経由させない）
export function resolveHref(url: string): string {
  const legacy = url.match(/^\/docs\/([^/?#]+)/);
  return legacy?.[1] ? getPublicDocPath(legacy[1]) : url;
}

export default function InlineParts({ parts }: { parts: InlinePart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (!part.url) return <span key={i}>{part.text}</span>;
        const href = resolveHref(part.url);
        const external = /^https?:/.test(href);
        return (
          <a
            key={i}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-(--accent) underline underline-offset-2 hover:no-underline"
          >
            {part.text}
          </a>
        );
      })}
    </>
  );
}
