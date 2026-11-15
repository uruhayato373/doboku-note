import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { affiliateSlotPreview } from '../src/lib/affiliate-slot-preview.mjs';

test('仮広告は開発時の明示指定だけ・描画にリンクや画像や計測属性を含まない', () => {
  assert.equal(affiliateSlotPreview({ NODE_ENV: 'production', AFFILIATE_SLOT_PREVIEW: '1' }), false);
  assert.equal(affiliateSlotPreview({ NODE_ENV: 'development' }), false);
  assert.equal(affiliateSlotPreview({ NODE_ENV: 'development', AFFILIATE_SLOT_PREVIEW: 'true' }), false);
  assert.equal(affiliateSlotPreview({ NODE_ENV: 'development', AFFILIATE_SLOT_PREVIEW: '1' }), true);
  const script = `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import Banner from './src/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner.tsx';
    import { resolvePlacements } from './src/lib/affiliate-placement.ts';
    const placements = resolvePlacements({ pageKind: 'standards' }, Date.parse('2026-11-16T00:00:00+09:00'));
    process.stdout.write(renderToStaticMarkup(React.createElement(Banner.default ?? Banner, { placement: placements['standards-inline'], withPixel: true })));
  `;
  const html = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, AFFILIATE_SLOT_PREVIEW: '1', NODE_ENV: 'development' } });
  assert.match(html, /standards-inline/);
  assert.match(html, /buildjob/);
  assert.match(html, /728×90/);
  assert.match(html, /320×100/);
  assert.match(html, /hidden zenn-desktop:block/);
  assert.match(html, /zenn-desktop:hidden/);
  assert.doesNotMatch(html, /<a\b|<img\b|data-cta|href=/);
});
