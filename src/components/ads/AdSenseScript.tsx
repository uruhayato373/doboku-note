'use client';

import { useEffect } from 'react';
import { ADSENSE_CLIENT, isAdSensePreviewHost } from '@/config/adsense';

/**
 * adsbygoogle.js を本番だけ、描画が落ち着いてから 1 回読み込む（手動の枠と自動広告の両方がこれを使う）。
 * layout に <script> を直書きすると全ページに __next._index.txt が増え、Cloudflare Pages の 20,000 件上限を超える（2026-11-06 実測）ので useEffect で差し込む。
 * LCP を押し下げないよう、アイドル時（無ければ 2 秒後）に読む。手元・プレビュー（localhost・pages.dev）では読まない（枠は目印で見せる・AdSlot）。
 */
export default function AdSenseScript() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || isAdSensePreviewHost(location.hostname)) return;
    if (document.querySelector('script[data-adsense-loader]')) return;
    const load = () => {
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      s.dataset.adsenseLoader = '';
      document.head.appendChild(s);
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 3000 });
    else setTimeout(load, 2000);
  }, []);
  return null;
}
