import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasStaticToolNoteCta } from '../scripts/lib/sns-landing-cta.mjs';

const pop = `import Promo from '@/components/ui/NoteImageCta/NoteImageCta';
export default function Page() { return <Promo href={url} trackLabel={label} placement="tool-footer" />; }`;

test('SNSの着地ページは完成画像CTAと従来の静的noteリンクを認識する', () => {
  assert.equal(hasStaticToolNoteCta(pop), true);
  assert.equal(hasStaticToolNoteCta('export default function Page(){ return <a href="https://note.com/a" data-cta="note">教材</a>; }'), true);
});

test('コメント・別部品・計測欠落・client-onlyは静的note導線に数えない', () => {
  assert.equal(hasStaticToolNoteCta('/* <a data-cta="note"> */ export default function Page(){ return <div/>; }'), false);
  assert.equal(hasStaticToolNoteCta(pop.replace('@/components/ui/NoteImageCta/NoteImageCta', '@/other')), false);
  assert.equal(hasStaticToolNoteCta(pop.replace('trackLabel={label}', '')), false);
  assert.equal(hasStaticToolNoteCta(`'use client';\n${pop}`), false);
});

test('実際の2ツールにはSSR用の共通note導線がある', () => {
  for (const file of ['src/app/tools/kakomon-quiz/pe-first-stage/page.tsx', 'src/app/tools/keiken-charcount/page.tsx']) {
    assert.equal(hasStaticToolNoteCta(readFileSync(file, 'utf8')), true, file);
  }
});
