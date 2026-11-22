'use client';

import { useEffect, useRef } from 'react';
import vocab from '../../../config/cta-placements.json';
import { chooseArticlePixels } from '@/lib/article-affiliate-pixels.mjs';
import { useAffiliateVariant } from '@/components/ui/CareerAffiliate/CareerAffiliateExperiment';

import type { ArticlePixelCandidate } from '@/lib/article-affiliate-plan';

/** 1 ページ・1 案件・1 発。hydration・resize で同じ案件を再送しない。 */
export default function ArticleAffiliatePixels({ candidates }: { candidates: ArticlePixelCandidate[] }) {
  const variant = useAffiliateVariant();
  const container = useRef<HTMLSpanElement>(null);
  const sent = useRef(new Set<string>());
  useEffect(() => {
    if (!variant) return;
    const desktop = window.matchMedia('(min-width: 993px)');
    const send = () => {
      const owners = chooseArticlePixels(candidates, vocab.affiliate, { desktop: desktop.matches }) as ArticlePixelCandidate[];
      for (const owner of owners) {
        if (sent.current.has(owner.program) || !container.current) continue;
        sent.current.add(owner.program);
        const img = document.createElement('img');
        img.width = 1; img.height = 1; img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.dataset.articlePixelProgram = owner.program;
        img.dataset.articlePixelSlot = owner.slot;
        img.src = owner.src;
        container.current.appendChild(img);
      }
    };
    send();
    desktop.addEventListener('change', send);
    return () => desktop.removeEventListener('change', send);
  }, [candidates, variant]);
  return <span ref={container} hidden data-article-pixels />;
}
